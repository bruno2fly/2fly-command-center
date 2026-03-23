/**
 * Morning Dashboard API
 * 
 * Aggregates data across ALL clients from Flow + Meta + local DB
 * into a single morning briefing.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getFlowClientData,
  getFlowTeam,
  isFlowConfigured,
} from '../lib/flowSync.js';
import { generateDailyAdsReport } from '../cron/dailyAdsReport.js';

const prisma = new PrismaClient();
const router = Router();

// GET /api/morning — Full morning dashboard
router.get('/', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const h = now.getHours();
    const greeting = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';

    // Get all clients
    const clients = await prisma.client.findMany({
      orderBy: { name: 'asc' },
    });

    // Get unread AI updates
    const aiUpdates = await prisma.aiUpdate.findMany({
      where: { status: 'inbox' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Get pending agent actions
    const pendingActions = await prisma.agentAction.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Aggregate Flow data for all connected clients
    const flowConnected = clients.filter((c: any) => c.flowClientId);
    const flowData: Record<string, any> = {};
    
    if (isFlowConfigured()) {
      await Promise.all(
        flowConnected.map(async (c: any) => {
          try {
            const data = await getFlowClientData(c.flowClientId);
            flowData[c.id] = { ...data, clientName: c.name };
          } catch { /* skip failed */ }
        })
      );
    }

    // Aggregate Flow metrics
    let totalPendingApprovals = 0;
    let totalOpenRequests = 0;
    let totalActiveTasks = 0;
    let totalScheduledPosts = 0;
    const needsAttention: Array<{ clientId: string; clientName: string; type: string; message: string; urgency: string }> = [];
    const pendingApprovals: Array<{ clientId: string; clientName: string; id: string; title: string; status: string; media?: string[] }> = [];
    const openRequests: Array<{ clientId: string; clientName: string; type: string; details: string; by: string; createdAt: any }> = [];
    const productionPipeline: Array<{ clientId: string; clientName: string; title: string; status: string; designerId: string; deadline: string; priority: string }> = [];

    for (const [clientId, data] of Object.entries(flowData) as [string, any][]) {
      const ps = data.portalState;
      if (!ps) continue;

      const clientName = data.clientName;
      const approvals = ps.approvals || [];
      const requests = ps.requests || [];
      const tasks = data.tasks || [];
      const posts = data.scheduledPosts || [];

      const pending = approvals.filter((a: any) => a.status === 'pending' || a.status === 'copy_pending');
      totalPendingApprovals += pending.length;
      
      const open = requests.filter((r: any) => r.status !== 'done');
      totalOpenRequests += open.length;
      
      const active = tasks.filter((t: any) => !['approved', 'ready_to_post'].includes(t.status));
      totalActiveTasks += active.length;
      
      totalScheduledPosts += posts.length;

      // Pending approvals detail
      pending.forEach((a: any) => {
        pendingApprovals.push({
          clientId,
          clientName,
          id: a.id,
          title: a.title || a.caption?.slice(0, 60) || 'Untitled',
          status: a.status,
          media: a.media,
        });
      });

      // Open requests detail
      open.forEach((r: any) => {
        openRequests.push({
          clientId,
          clientName,
          type: r.type || 'Request',
          details: r.details?.slice(0, 100) || '',
          by: r.by || 'Client',
          createdAt: r.createdAt,
        });
      });

      // Production pipeline
      active.forEach((t: any) => {
        productionPipeline.push({
          clientId,
          clientName,
          title: t.title,
          status: t.status,
          designerId: t.designerId || 'Unassigned',
          deadline: t.deadline,
          priority: t.priority || 'medium',
        });
      });

      // Flag issues
      if (pending.length > 3) {
        needsAttention.push({ clientId, clientName, type: 'approvals', message: `${pending.length} approvals waiting`, urgency: 'high' });
      }
      if (open.length > 0) {
        needsAttention.push({ clientId, clientName, type: 'requests', message: `${open.length} open request(s)`, urgency: open.length > 2 ? 'high' : 'medium' });
      }
      const kpis = ps.kpis;
      if (kpis?.missingAssets > 0) {
        needsAttention.push({ clientId, clientName, type: 'assets', message: `${kpis.missingAssets} missing assets`, urgency: 'high' });
      }
    }

    // Client health summary
    const clientHealth = clients.map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status,
      healthStatus: c.healthStatus || 'unknown',
      monthlyRetainer: c.monthlyRetainer,
      flowConnected: !!c.flowClientId,
      hasFlowData: !!flowData[c.id],
    }));

    const redClients = clientHealth.filter(c => c.healthStatus === 'red' || c.healthStatus === 'critical');
    const yellowClients = clientHealth.filter(c => c.healthStatus === 'yellow' || c.healthStatus === 'warning');

    // Get Meta ad data for connected clients
    const metaConnections = await prisma.metaConnection.findMany({
      where: { status: 'active' },
    });

    // Get team from Flow
    let team: any[] = [];
    try {
      team = isFlowConfigured() ? await getFlowTeam() : [];
    } catch { /* */ }

    // Build response
    res.json({
      greeting: `${greeting}, Bruno`,
      date: now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      time: now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),

      // Quick stats
      stats: {
        totalClients: clients.length,
        activeClients: clients.filter((c: any) => c.status === 'active').length,
        redClients: redClients.length,
        yellowClients: yellowClients.length,
        pendingApprovals: totalPendingApprovals,
        openRequests: totalOpenRequests,
        activeTasks: totalActiveTasks,
        scheduledPosts: totalScheduledPosts,
        unreadUpdates: aiUpdates.length,
        pendingActions: pendingActions.length,
        metaConnected: metaConnections.length,
        flowConnected: flowConnected.length,
      },

      // Sections
      needsAttention,
      redClients,
      yellowClients,
      pendingApprovals,
      openRequests: openRequests.slice(0, 10),
      productionPipeline: productionPipeline.slice(0, 15),
      aiUpdates: aiUpdates.map(u => ({
        id: u.id,
        title: u.title,
        source: u.source,
        createdAt: u.createdAt,
      })),
      pendingAgentActions: pendingActions.map((a: any) => ({
        id: a.id,
        type: a.type,
        description: a.description,
        clientId: a.clientId,
        createdAt: a.createdAt,
      })),
      clientHealth,
      team: team.map((t: any) => ({ id: t.id, name: t.name, role: t.role })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[morning] Error:', msg);
    res.status(500).json({ error: msg });
  }
});

export default router;

// GET /api/morning/ads-report — Generate daily ads report
router.get('/ads-report', async (_req: Request, res: Response) => {
  try {
    const report = await generateDailyAdsReport();
    res.json({ report, generated: new Date().toISOString() });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

