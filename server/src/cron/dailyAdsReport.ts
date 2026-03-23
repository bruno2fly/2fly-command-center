/**
 * Daily Ads Intelligence Report
 * 
 * Runs every morning — pulls Meta data for all connected clients,
 * compares to previous period, generates alerts and summary.
 * Posts to Discord #meta-ads channel.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const META_TOKEN = process.env.META_ACCESS_TOKEN || '';
const GRAPH_API = 'https://graph.facebook.com/v21.0';
const DISCORD_CHANNEL = '1480606656927760526'; // #meta-ads

async function metaFetch(path: string) {
  const url = `${GRAPH_API}${path}${path.includes('?') ? '&' : '?'}access_token=${META_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

interface ClientAdsSummary {
  clientName: string;
  clientId: string;
  adAccountId: string;
  current: { spend: number; impressions: number; clicks: number; ctr: number; linkClicks: number };
  previous: { spend: number; impressions: number; clicks: number; ctr: number; linkClicks: number };
  campaigns: Array<{ name: string; status: string; spend: number }>;
  alerts: string[];
  recommendations: string[];
}

function pctChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '🆕 new' : '—';
  const change = ((current - previous) / previous) * 100;
  if (change > 10) return `↑ ${change.toFixed(0)}%`;
  if (change < -10) return `↓ ${Math.abs(change).toFixed(0)}%`;
  return `→ ${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
}

function fmt(n: number, type: 'money' | 'number' | 'pct' = 'number'): string {
  if (type === 'money') return `$${n.toFixed(2)}`;
  if (type === 'pct') return `${n.toFixed(2)}%`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export async function generateDailyAdsReport(): Promise<string> {
  const connections = await prisma.metaConnection.findMany({
    where: { status: 'active' },
    include: { client: true },
  });

  if (connections.length === 0) return '';

  const summaries: ClientAdsSummary[] = [];

  for (const conn of connections) {
    try {
      const [currentData, previousData, campaignsData] = await Promise.all([
        metaFetch(`/${conn.adAccountId}/insights?fields=spend,impressions,clicks,ctr,actions&date_preset=last_7d`),
        metaFetch(`/${conn.adAccountId}/insights?fields=spend,impressions,clicks,ctr,actions&time_range={"since":"${getDateStr(-14)}","until":"${getDateStr(-7)}"}`),
        metaFetch(`/${conn.adAccountId}/campaigns?fields=name,status,insights.date_preset(last_7d){spend}&limit=20`),
      ]);

      const cur = currentData?.data?.[0] || {};
      const prev = previousData?.data?.[0] || {};
      const findAction = (data: any, type: string) => {
        const actions = data?.actions || [];
        const a = actions.find((a: any) => a.action_type === type);
        return a ? parseInt(a.value) : 0;
      };

      const current = {
        spend: parseFloat(cur.spend || '0'),
        impressions: parseInt(cur.impressions || '0'),
        clicks: parseInt(cur.clicks || '0'),
        ctr: parseFloat(cur.ctr || '0'),
        linkClicks: findAction(cur, 'link_click'),
      };

      const previous = {
        spend: parseFloat(prev.spend || '0'),
        impressions: parseInt(prev.impressions || '0'),
        clicks: parseInt(prev.clicks || '0'),
        ctr: parseFloat(prev.ctr || '0'),
        linkClicks: findAction(prev, 'link_click'),
      };

      const campaigns = (campaignsData?.data || []).map((c: any) => ({
        name: c.name,
        status: c.status,
        spend: parseFloat(c.insights?.data?.[0]?.spend || '0'),
      }));

      // Generate alerts
      const alerts: string[] = [];
      const recommendations: string[] = [];

      if (current.spend > 0 && current.ctr < 1) {
        alerts.push(`⚠️ Low CTR (${current.ctr.toFixed(2)}%) — ads may need creative refresh`);
        recommendations.push('Test new ad creatives or headlines');
      }
      if (previous.spend > 0 && current.spend < previous.spend * 0.5) {
        alerts.push(`📉 Spend dropped ${Math.round((1 - current.spend / previous.spend) * 100)}% vs last week`);
      }
      if (current.spend > 0 && current.linkClicks === 0) {
        alerts.push(`🔴 Spending but ZERO link clicks`);
        recommendations.push('Check ad links and CTA');
      }
      if (current.spend > previous.spend * 1.5 && previous.spend > 0) {
        alerts.push(`💰 Spend increased ${Math.round((current.spend / previous.spend - 1) * 100)}% vs last week`);
      }
      const activeCampaigns = campaigns.filter((c: any) => c.status === 'ACTIVE');
      const pausedWithSpend = campaigns.filter((c: any) => c.status === 'PAUSED' && c.spend > 0);
      if (activeCampaigns.length === 0 && current.spend === 0) {
        alerts.push(`⏸️ No active campaigns`);
      }

      summaries.push({
        clientName: (conn.client as any)?.name || 'Unknown',
        clientId: conn.clientId,
        adAccountId: conn.adAccountId,
        current,
        previous,
        campaigns,
        alerts,
        recommendations,
      });
    } catch { /* skip failed */ }
  }

  if (summaries.length === 0) return '';

  // Build report
  const lines: string[] = [];
  const totalSpend = summaries.reduce((s, c) => s + c.current.spend, 0);
  const allAlerts = summaries.flatMap(s => s.alerts);

  lines.push(`## 📊 Daily Ads Report — ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
  lines.push('');
  lines.push(`**${summaries.length} clients** | **${fmt(totalSpend, 'money')} total spend** (7d) | **${allAlerts.length} alerts**`);
  lines.push('');

  // Alerts first
  if (allAlerts.length > 0) {
    lines.push('**🚨 Alerts**');
    summaries.forEach(s => {
      s.alerts.forEach(a => lines.push(`→ **${s.clientName}**: ${a}`));
    });
    lines.push('');
  }

  // Per-client summary
  summaries.forEach(s => {
    const c = s.current;
    const spendTrend = pctChange(c.spend, s.previous.spend);
    const ctrTrend = pctChange(c.ctr, s.previous.ctr);
    const clicksTrend = pctChange(c.clicks, s.previous.clicks);

    lines.push(`**${s.clientName}**`);
    lines.push(`→ Spend: ${fmt(c.spend, 'money')} (${spendTrend}) | CTR: ${fmt(c.ctr, 'pct')} (${ctrTrend}) | Clicks: ${fmt(c.clicks)} (${clicksTrend})`);

    if (s.recommendations.length > 0) {
      s.recommendations.forEach(r => lines.push(`  💡 ${r}`));
    }
    lines.push('');
  });

  return lines.join('\n');
}

function getDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

export { ClientAdsSummary };
