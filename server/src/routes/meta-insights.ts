/**
 * Meta Ads Insights API
 * 
 * Pulls real ad performance data from Meta Graph API for connected clients.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

const META_TOKEN = process.env.META_ACCESS_TOKEN || '';
const GRAPH_API = 'https://graph.facebook.com/v21.0';

// Cache to avoid hammering Meta API
const cache: Record<string, { data: unknown; expiresAt: number }> = {};
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown) {
  cache[key] = { data, expiresAt: Date.now() + CACHE_TTL };
}

async function metaFetch(path: string) {
  const url = `${GRAPH_API}${path}${path.includes('?') ? '&' : '?'}access_token=${META_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Meta API error ${res.status}`);
  }
  return res.json();
}

// POST /api/meta-insights/sync-all — Sync last 7d Meta insights → AdReport for all connected clients
router.post('/sync-all', async (req: Request, res: Response) => {
  try {
    // Compute Monday of the current week (weekStart)
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const daysToMon = day === 0 ? 6 : day - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMon);
    weekStart.setHours(0, 0, 0, 0);

    const connections = await prisma.metaConnection.findMany({
      where: { status: 'active' },
      include: { client: { select: { id: true, name: true } } },
    });

    const results: Array<{ clientId: string; name: string; spend?: number; leads?: number; clicks?: number; error?: string }> = [];

    for (const conn of connections) {
      if (!conn.adAccountId || !conn.accessToken) {
        results.push({ clientId: conn.clientId, name: conn.client.name, error: 'Missing adAccountId or accessToken' });
        continue;
      }

      try {
        const url = `${GRAPH_API}/${conn.adAccountId}/insights?fields=spend,impressions,clicks,ctr,reach,actions&date_preset=last_7d&access_token=${encodeURIComponent(conn.accessToken)}`;
        const apiRes = await fetch(url);
        const data = await apiRes.json() as { data?: any[]; error?: { message: string } };

        if (data.error) {
          results.push({ clientId: conn.clientId, name: conn.client.name, error: data.error.message });
          continue;
        }

        const d = data?.data?.[0] || {};
        const actions: Array<{ action_type: string; value: string }> = d.actions || [];
        const findAction = (type: string) => {
          const a = actions.find((a) => a.action_type === type);
          return a ? parseInt(a.value) : 0;
        };

        const spend = parseFloat(d.spend || '0');
        const clicks = parseInt(d.clicks || '0');
        const impressions = parseInt(d.reach || d.impressions || '0');
        const leads = findAction('lead') || findAction('onsite_conversion.lead_grouped') || findAction('contact') || 0;
        const ctr = parseFloat(d.ctr || '0');

        // Upsert AdReport for the current week
        const existing = await prisma.adReport.findFirst({
          where: { clientId: conn.clientId, platform: 'meta', weekStart },
        });

        if (existing) {
          await prisma.adReport.update({
            where: { id: existing.id },
            data: { spend, clicks, impressions, conversions: leads, ctr },
          });
        } else {
          await prisma.adReport.create({
            data: {
              clientId: conn.clientId,
              platform: 'meta',
              weekStart,
              spend,
              clicks,
              impressions,
              conversions: leads,
              ctr,
              roas: 0,
              revenue: 0,
            },
          });
        }

        results.push({ clientId: conn.clientId, name: conn.client.name, spend, leads, clicks });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        results.push({ clientId: conn.clientId, name: conn.client.name, error: msg });
      }
    }

    const synced = results.filter((r) => !r.error).length;
    console.log(`[meta-insights/sync-all] Synced ${synced}/${connections.length} clients`);
    res.json({ synced, total: connections.length, weekStart: weekStart.toISOString(), results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[meta-insights/sync-all] Error:', msg);
    res.status(500).json({ error: msg });
  }
});

// GET /api/meta-insights/:clientId — Full ad performance dashboard data
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const datePreset = (req.query.date_preset as string) || 'last_30d';

    // Check cache
    const cacheKey = `meta:${clientId}:${datePreset}`;
    const cached = getCached<any>(cacheKey);
    if (cached) return res.json(cached);

    // Get client's Meta connection
    const meta = await prisma.metaConnection.findFirst({
      where: { clientId, status: 'active' },
    });
    if (!meta) return res.json({ connected: false, message: 'No Meta connection' });

    const adAccountId = meta.adAccountId;

    // Fetch in parallel: account insights, campaigns, daily breakdown
    const [accountInsights, campaigns, dailyInsights] = await Promise.all([
      // Account-level insights
      metaFetch(`/${adAccountId}/insights?fields=spend,impressions,clicks,ctr,cpc,reach,frequency,actions,cost_per_action_type&date_preset=${datePreset}`),
      // Campaigns with status
      metaFetch(`/${adAccountId}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget,created_time,updated_time&limit=50`),
      // Daily breakdown for charts
      metaFetch(`/${adAccountId}/insights?fields=spend,impressions,clicks,ctr,actions&date_preset=${datePreset}&time_increment=1`),
    ]);

    // Parse account-level KPIs
    const acctData = accountInsights?.data?.[0] || {};
    const actions = acctData.actions || [];
    const costPerAction = acctData.cost_per_action_type || [];

    const findAction = (type: string) => {
      const a = actions.find((a: any) => a.action_type === type);
      return a ? parseInt(a.value) : 0;
    };
    const findCPA = (type: string) => {
      const a = costPerAction.find((a: any) => a.action_type === type);
      return a ? parseFloat(a.value) : 0;
    };

    const kpis = {
      spend: parseFloat(acctData.spend || '0'),
      impressions: parseInt(acctData.impressions || '0'),
      clicks: parseInt(acctData.clicks || '0'),
      ctr: parseFloat(acctData.ctr || '0'),
      cpc: parseFloat(acctData.cpc || '0'),
      reach: parseInt(acctData.reach || '0'),
      frequency: parseFloat(acctData.frequency || '0'),
      linkClicks: findAction('link_click'),
      landingPageViews: findAction('landing_page_view'),
      pageEngagement: findAction('page_engagement'),
      postEngagement: findAction('post_engagement'),
      leads: findAction('lead'),
      purchases: findAction('purchase'),
      costPerLead: findCPA('lead'),
      costPerPurchase: findCPA('purchase'),
      costPerLinkClick: findCPA('link_click'),
    };

    // Parse campaigns
    const campaignList = (campaigns?.data || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective,
      dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null, // Meta returns in cents
      lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
      createdTime: c.created_time,
    }));

    // Get campaign-level insights
    const activeCampaigns = campaignList.filter((c: any) => c.status === 'ACTIVE');
    const campaignInsights: any[] = [];

    for (const campaign of activeCampaigns) {
      try {
        const insights = await metaFetch(`/${campaign.id}/insights?fields=spend,impressions,clicks,ctr,cpc,reach,actions&date_preset=${datePreset}`);
        const d = insights?.data?.[0] || {};
        const cActions = d.actions || [];
        campaignInsights.push({
          ...campaign,
          spend: parseFloat(d.spend || '0'),
          impressions: parseInt(d.impressions || '0'),
          clicks: parseInt(d.clicks || '0'),
          ctr: parseFloat(d.ctr || '0'),
          cpc: parseFloat(d.cpc || '0'),
          reach: parseInt(d.reach || '0'),
          linkClicks: cActions.find((a: any) => a.action_type === 'link_click')?.value || 0,
          landingPageViews: cActions.find((a: any) => a.action_type === 'landing_page_view')?.value || 0,
          leads: cActions.find((a: any) => a.action_type === 'lead')?.value || 0,
        });
      } catch { /* skip */ }
    }

    // Parse daily data for charts
    const daily = (dailyInsights?.data || []).map((d: any) => {
      const dayActions = d.actions || [];
      return {
        date: d.date_start,
        spend: parseFloat(d.spend || '0'),
        impressions: parseInt(d.impressions || '0'),
        clicks: parseInt(d.clicks || '0'),
        ctr: parseFloat(d.ctr || '0'),
        linkClicks: parseInt(dayActions.find((a: any) => a.action_type === 'link_click')?.value || '0'),
        landingPageViews: parseInt(dayActions.find((a: any) => a.action_type === 'landing_page_view')?.value || '0'),
      };
    });

    const result = {
      connected: true,
      adAccountId,
      datePreset,
      kpis,
      campaigns: campaignList,
      campaignInsights,
      daily,
    };

    setCache(cacheKey, result);
    res.json(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[meta-insights] Error:', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;
