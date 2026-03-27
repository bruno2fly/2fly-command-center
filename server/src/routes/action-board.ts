/**
 * Client Action Board API
 * 
 * One endpoint that returns every client with their specific action items,
 * prioritized and categorized. No more going client by client.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();
const META_TOKEN = process.env.META_ACCESS_TOKEN || '';

async function getMetaInsights(adAccountId: string): Promise<any> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${adAccountId}/insights?fields=spend,impressions,clicks,ctr,actions&date_preset=last_7d&access_token=${META_TOKEN}`);
    const data = await res.json();
    return data?.data?.[0] || null;
  } catch { return null; }
}

interface ClientAction {
  type: 'urgent' | 'action' | 'info' | 'win';
  category: 'ads' | 'content' | 'production' | 'strategy' | 'technical' | 'billing';
  title: string;
  detail: string;
  canAutoExecute: boolean;
  executePrompt?: string;
}

interface ClientBoardItem {
  id: string;
  name: string;
  health: string;
  status: string;
  retainer: number;
  actions: ClientAction[];
  wins: string[];
  lastActivity: string | null;
}

// GET /api/action-board — Full client triage board
router.get('/', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'active' },
      include: {
        metaConnection: true,
        strategies: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });

    const board: ClientBoardItem[] = [];

    for (const client of clients) {
      const actions: ClientAction[] = [];
      const wins: string[] = [];

      // --- META ADS ANALYSIS ---
      const meta = client.metaConnection;
      if (meta?.adAccountId) {
        const insights = await getMetaInsights(meta.adAccountId);
        if (insights) {
          const spend = parseFloat(insights.spend || '0');
          const clicks = parseInt(insights.clicks || '0');
          const ctr = parseFloat(insights.ctr || '0');
          const leads = (insights.actions || []).find((a: any) => a.action_type === 'lead')?.value || 0;

          if (spend > 50 && parseInt(leads) === 0) {
            actions.push({
              type: 'urgent',
              category: 'ads',
              title: `$${spend.toFixed(0)} spent, zero conversions`,
              detail: 'Check pixel/tracking or landing page. Spending with no results.',
              canAutoExecute: false,
            });
          }
          if (ctr > 3) {
            wins.push(`Strong CTR: ${ctr.toFixed(2)}%`);
          }
          if (ctr < 1 && spend > 30) {
            actions.push({
              type: 'action',
              category: 'ads',
              title: `Low CTR (${ctr.toFixed(2)}%)`,
              detail: `$${spend.toFixed(0)} spent, ${clicks} clicks, ${ctr.toFixed(2)}% CTR. Creative refresh needed.`,
              canAutoExecute: true,
              executePrompt: `REAL DATA for ${client.name}: $${spend.toFixed(2)} spend, ${clicks} clicks, ${ctr.toFixed(2)}% CTR, CPC $${(spend/Math.max(clicks,1)).toFixed(2)}. CTR is below 1%. Create 3 new ad headline + description variations specifically for this client. Reference their business type and location. Give me copy I can paste directly into Meta Ads Manager.`,
            });
          }
          if (spend === 0) {
            actions.push({
              type: 'info',
              category: 'ads',
              title: 'No ad spend',
              detail: 'No active campaigns or campaigns paused.',
              canAutoExecute: false,
            });
          }
        }
      } else {
        actions.push({
          type: 'info',
          category: 'ads',
          title: 'Meta Ads not connected',
          detail: 'Connect Meta ad account to track performance.',
          canAutoExecute: false,
        });
      }

      // --- FLOW / PRODUCTION CHECK ---
      const flowClientMap: Record<string, string> = {
        'cmml1eoiz000612dhumvxv3e4': 'ardanspa',
        'cmml1eoiw000212dh9pbvfqig': 'theshapespa',
        'cmmmkh2ss0000zoqznsxthdbi': 'stpetersburg',
        'cmml1eoiz000712dh325pvxb3': 'thisisitbrazil',
        'cmmvh7x330008bmti1drp0bev': 'theshapespamiami',
      };
      
      const flowId = flowClientMap[client.id];
      if (flowId) {
        try {
          const flowRes = await fetch(`http://localhost:4000/api/flow/data/${client.id}`);
          const flowData = await flowRes.json();
          if (flowData?.kpis) {
            const { waitingApproval, missingAssets } = flowData.kpis;
            if (waitingApproval > 0) {
              actions.push({
                type: 'action',
                category: 'production',
                title: `${waitingApproval} items waiting approval`,
                detail: 'Content ready for review in 2FLY Flow.',
                canAutoExecute: false,
              });
            }
            if (missingAssets > 0) {
              actions.push({
                type: 'action',
                category: 'production',
                title: `${missingAssets} missing assets`,
                detail: 'Design team needs to upload assets.',
                canAutoExecute: false,
              });
            }
          }
        } catch { /* flow not available */ }
      }

      // --- STRATEGY CHECK ---
      const strategy = (client as any).strategies?.[0];
      if (!strategy) {
        actions.push({
          type: 'action',
          category: 'strategy',
          title: 'No active strategy',
          detail: 'Create a strategy plan for this client.',
          canAutoExecute: true,
          executePrompt: `Create a marketing strategy for ${client.name} (retainer: $${client.monthlyRetainer || 0}/mo). Research their industry, identify 3 key opportunities, create a 30-day action plan with specific tasks, deadlines, and who does what. Be specific to their business — not generic.`,
        });
      } else {
        const strategyActions = JSON.parse(strategy.actions || '[]');
        const overdue = strategyActions.filter((a: any) => a.status === 'pending' && a.deadline && new Date(a.deadline) < new Date());
        if (overdue.length > 0) {
          actions.push({
            type: 'urgent',
            category: 'strategy',
            title: `${overdue.length} overdue strategy actions`,
            detail: overdue.map((a: any) => a.action || a.title).join(', '),
            canAutoExecute: false,
          });
        }
      }

      // --- HEALTH-BASED ACTIONS ---
      if (client.healthStatus === 'red') {
        actions.push({
          type: 'urgent',
          category: 'technical',
          title: 'Client health is RED',
          detail: 'Multiple issues detected. Needs immediate attention.',
          canAutoExecute: false,
        });
      }

      // --- BILLING CHECK ---
      if (client.monthlyRetainer && client.monthlyRetainer > 0) {
        // placeholder for invoice check
      }

      // Sort actions: urgent first, then action, then info, then win
      const priority: Record<string, number> = { urgent: 0, action: 1, info: 2, win: 3 };
      actions.sort((a, b) => priority[a.type] - priority[b.type]);

      board.push({
        id: client.id,
        name: client.name,
        health: client.healthStatus || 'unknown',
        status: client.status,
        retainer: client.monthlyRetainer || 0,
        actions,
        wins,
        lastActivity: client.updatedAt?.toISOString() || null,
      });
    }

    // Sort board: red first, then yellow, then green
    const healthOrder: Record<string, number> = { red: 0, yellow: 1, green: 2, unknown: 3 };
    board.sort((a, b) => (healthOrder[a.health] || 3) - (healthOrder[b.health] || 3));

    const summary = {
      total: board.length,
      red: board.filter(c => c.health === 'red').length,
      yellow: board.filter(c => c.health === 'yellow').length,
      green: board.filter(c => c.health === 'green').length,
      totalActions: board.reduce((s, c) => s + c.actions.length, 0),
      urgentActions: board.reduce((s, c) => s + c.actions.filter(a => a.type === 'urgent').length, 0),
    };

    res.json({ summary, board });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
