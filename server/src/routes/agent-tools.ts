/**
 * server/src/routes/agent-tools.ts
 * API endpoints that OpenClaw agents call to read/write the Prisma database.
 * These replace the JSON file-based shared store.
 *
 * Auth: Agents authenticate via x-agent-key header (shared secret).
 * In dev, auth is optional. In prod, set AGENT_TOOLS_SECRET in .env.
 */

import { Router, Request, Response } from 'express';

const { PrismaClient } = require('@prisma/client');
const { computeClientHealth, recomputeAllClients } = require('../lib/statusEngine');

const router = Router();
const prisma = new PrismaClient();

// Simple auth middleware (optional in dev)
const AGENT_SECRET = process.env.AGENT_TOOLS_SECRET || '';
function agentAuth(req: Request, res: Response, next: () => void) {
  if (!AGENT_SECRET) return next(); // No auth in dev
  const key = req.headers['x-agent-key'] as string;
  if (key === AGENT_SECRET) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

router.use(agentAuth);

// ================================================================
// CLIENTS — Used by: client-memory, founder-boss
// ================================================================

// GET /api/agent-tools/clients — List all active clients with health
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });

    const enriched = await Promise.all(
      clients.map(async (client: { id: string }) => {
        const health = await computeClientHealth(client.id);
        return { ...client, health };
      })
    );

    res.json({ clients: enriched, total: enriched.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/agent-tools/clients/:id — Single client detail with relations
router.get('/clients/:id', async (req: Request, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        contentItems: { orderBy: { scheduledDate: 'asc' }, take: 30 },
        requests: { orderBy: { createdAt: 'desc' }, take: 20 },
        adReports: { orderBy: { weekStart: 'desc' }, take: 8 },
        healthLogs: { orderBy: { createdAt: 'desc' }, take: 12 },
      },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });

    const health = await computeClientHealth(client.id);
    res.json({ ...client, health });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/agent-tools/clients — Create a new client
router.post('/clients', async (req: Request, res: Response) => {
  try {
    const {
      name, contactName, contactEmail, platforms, monthlyRetainer, adBudget,
      roasTarget, notes, status, healthStatus,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Client name is required' });

    const platformsStr =
      typeof platforms === 'string' ? platforms :
      Array.isArray(platforms) ? JSON.stringify(platforms) : '["meta"]';

    const client = await prisma.client.create({
      data: {
        name,
        contactName: contactName || null,
        contactEmail: contactEmail || null,
        platforms: platformsStr,
        monthlyRetainer: monthlyRetainer ?? 0,
        adBudget: adBudget ?? 0,
        roasTarget: roasTarget ?? 3.0,
        notes: notes || null,
        status: status || 'active',
        healthStatus: healthStatus || 'green',
      },
    });

    res.status(201).json(client);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// PATCH /api/agent-tools/clients/:id — Update client fields
router.patch('/clients/:id', async (req: Request, res: Response) => {
  try {
    const allowed = [
      'name', 'contactName', 'contactEmail', 'monthlyRetainer', 'adBudget',
      'roasTarget', 'platforms', 'status', 'healthStatus', 'notes',
    ];
    const data: Record<string, unknown> = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    }
    if (typeof data.platforms === 'object' && Array.isArray(data.platforms)) {
      data.platforms = JSON.stringify(data.platforms);
    }
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data,
    });
    res.json(client);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// DELETE /api/agent-tools/clients/:id — Delete client
router.delete('/clients/:id', async (req: Request, res: Response) => {
  try {
    await prisma.client.delete({
      where: { id: req.params.id },
    });
    res.status(204).send();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// ================================================================
// CONTENT — Used by: content-system
// ================================================================

// GET /api/agent-tools/content?clientId=x&status=y
router.get('/content', async (req: Request, res: Response) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.status) where.status = req.query.status;

    const items = await prisma.contentItem.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      include: { client: { select: { name: true } } },
    });

    res.json({ items, total: items.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/agent-tools/content — Create content item
router.post('/content', async (req: Request, res: Response) => {
  try {
    const { clientId, platform, contentType, title, caption, status, scheduledDate, assignedTo } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ error: 'clientId and title are required' });
    }

    const item = await prisma.contentItem.create({
      data: {
        clientId,
        platform: platform || 'meta',
        contentType: contentType || 'post',
        title,
        caption: caption || null,
        status: status || 'draft',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        assignedTo: assignedTo || null,
      },
    });

    res.status(201).json(item);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// PATCH /api/agent-tools/content/:id — Update content item
router.patch('/content/:id', async (req: Request, res: Response) => {
  try {
    const data: Record<string, unknown> = { ...req.body };
    if (data.scheduledDate) data.scheduledDate = new Date(data.scheduledDate as string);
    if (data.publishedDate) data.publishedDate = new Date(data.publishedDate as string);

    const item = await prisma.contentItem.update({
      where: { id: req.params.id },
      data,
    });
    res.json(item);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// ================================================================
// REQUESTS — Used by: project-manager, approval-feedback
// ================================================================

// GET /api/agent-tools/requests?clientId=x&status=y
router.get('/requests', async (req: Request, res: Response) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.status) where.status = req.query.status;

    const requests = await prisma.clientRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { client: { select: { name: true } } },
    });

    res.json({ requests, total: requests.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /api/agent-tools/requests — Create a request
router.post('/requests', async (req: Request, res: Response) => {
  try {
    const { clientId, type, priority, title, description, assignedTo, dueDate } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ error: 'clientId and title are required' });
    }

    const request = await prisma.clientRequest.create({
      data: {
        clientId,
        type: type || 'other',
        priority: priority || 'normal',
        title,
        description: description || '',
        assignedTo: assignedTo || null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    res.status(201).json(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// PATCH /api/agent-tools/requests/:id — Update request (approve, reject, assign, etc.)
router.patch('/requests/:id', async (req: Request, res: Response) => {
  try {
    const data: Record<string, unknown> = { ...req.body };
    if (data.dueDate) data.dueDate = new Date(data.dueDate as string);
    if (data.resolvedAt) data.resolvedAt = new Date(data.resolvedAt as string);

    const request = await prisma.clientRequest.update({
      where: { id: req.params.id },
      data,
    });
    res.json(request);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// ================================================================
// ADS — Used by: founder-boss (read-only)
// ================================================================

// GET /api/agent-tools/ads?clientId=x
router.get('/ads', async (req: Request, res: Response) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.query.clientId) where.clientId = req.query.clientId;

    const reports = await prisma.adReport.findMany({
      where,
      orderBy: { weekStart: 'desc' },
      take: 20,
      include: { client: { select: { name: true } } },
    });

    res.json({ reports, total: reports.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// HEALTH — Used by: founder-boss
// ================================================================

// GET /api/agent-tools/health — Full health overview for all clients
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const results = await recomputeAllClients();
    res.json({
      timestamp: new Date().toISOString(),
      totalClients: results.length,
      green: results.filter((r: { overall: string }) => r.overall === 'green').length,
      yellow: results.filter((r: { overall: string }) => r.overall === 'yellow').length,
      red: results.filter((r: { overall: string }) => r.overall === 'red').length,
      clients: results,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /api/agent-tools/pulse — Executive summary (used by !pulse command)
router.get('/pulse', async (_req: Request, res: Response) => {
  try {
    const results = await recomputeAllClients();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get recent requests across all clients
    const openRequests = await prisma.clientRequest.findMany({
      where: { status: { notIn: ['completed', 'closed'] } },
      include: { client: { select: { name: true } } },
    });

    const breachedRequests = openRequests.filter((r: { dueDate: string | null; slaBreach: boolean }) =>
      r.slaBreach || (r.dueDate && new Date(r.dueDate) < now)
    );

    // Upcoming content
    const upcomingContent = await prisma.contentItem.findMany({
      where: {
        status: 'scheduled',
        scheduledDate: { gte: now },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 10,
      include: { client: { select: { name: true } } },
    });

    const pulse = {
      timestamp: now.toISOString(),
      health: {
        total: results.length,
        green: results.filter((r: { overall: string }) => r.overall === 'green').length,
        yellow: results.filter((r: { overall: string }) => r.overall === 'yellow').length,
        red: results.filter((r: { overall: string }) => r.overall === 'red').length,
        clients: results.map((r: { clientName: string; overall: string; modules: Record<string, { bufferDays?: number; pendingCount?: number; roas?: number }> }) => ({
          name: r.clientName,
          status: r.overall,
          bufferDays: r.modules?.contentBuffer?.bufferDays,
          openRequests: r.modules?.requests?.pendingCount,
          roas: r.modules?.ads?.roas,
        })),
      },
      requests: {
        total: openRequests.length,
        breached: breachedRequests.length,
      },
      content: {
        scheduledNext7Days: upcomingContent.length,
      },
    };

    res.json(pulse);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// REVENUE — Used by: founder-boss
// ================================================================

// GET /api/agent-tools/revenue — Revenue dashboard with MRR, at-risk, ad spend
router.get('/revenue', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'active' },
      orderBy: { monthlyRetainer: 'desc' },
    });

    const revenueByClient = clients.map((c: { name: string; monthlyRetainer: number; adBudget: number; status: string; healthStatus: string }) => ({
      name: c.name,
      retainer: c.monthlyRetainer,
      adBudget: c.adBudget,
      status: c.status,
      healthStatus: c.healthStatus,
    }));

    const totalMRR = clients.reduce((sum: number, c: { monthlyRetainer: number }) => sum + c.monthlyRetainer, 0);
    const activeClients = clients.length;

    const atRiskClients = clients
      .filter((c: { healthStatus: string }) => c.healthStatus === 'red')
      .map((c: { name: string }) => c.name);
    const atRiskRevenue = clients
      .filter((c: { healthStatus: string }) => c.healthStatus === 'red')
      .reduce((sum: number, c: { monthlyRetainer: number }) => sum + c.monthlyRetainer, 0);

    const adSpendTotal = clients
      .filter((c: { adBudget: number }) => c.adBudget > 0)
      .reduce((sum: number, c: { adBudget: number }) => sum + c.adBudget, 0);
    const clientsWithAds = clients.filter((c: { adBudget: number }) => c.adBudget > 0).length;
    const clientsWithoutAds = activeClients - clientsWithAds;

    const avgRetainer = activeClients > 0 ? Math.round(totalMRR / activeClients) : 0;
    const topClient = revenueByClient.length > 0 ? revenueByClient[0].name : null;
    const bottomClient = revenueByClient.length > 0 ? revenueByClient[revenueByClient.length - 1].name : null;

    res.json({
      totalMRR,
      activeClients,
      revenueByClient,
      atRiskRevenue,
      atRiskClients,
      adSpendTotal,
      clientsWithAds,
      clientsWithoutAds,
      avgRetainer,
      topClient,
      bottomClient,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// INVOICES / PAYMENTS — Used by: founder-boss, project-manager
// ================================================================

// GET /invoices — list all invoices (optional ?clientId=&status=)
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.status) where.status = req.query.status;
    const invoices = await prisma.invoice.findMany({
      where,
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });
    res.json({ invoices });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /payments — payment dashboard summary
router.get('/payments', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const allInvoices = await prisma.invoice.findMany({
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const overdue = allInvoices.filter((inv: { status: string; dueDate: Date }) =>
      inv.status === 'overdue' || (inv.status === 'sent' && new Date(inv.dueDate) < today)
    );
    const dueSoon = allInvoices.filter((inv: { status: string; dueDate: Date }) =>
      inv.status === 'sent' && new Date(inv.dueDate) >= today && new Date(inv.dueDate) <= weekEnd
    );
    const recentlyPaid = allInvoices
      .filter((inv: { status: string }) => inv.status === 'paid')
      .sort((a: { paidDate: Date | null }, b: { paidDate: Date | null }) =>
        (b.paidDate?.getTime() || 0) - (a.paidDate?.getTime() || 0)
      )
      .slice(0, 10);

    const totalOutstanding = [...overdue, ...dueSoon].reduce(
      (s: number, inv: { amount: number }) => s + inv.amount, 0
    );
    const totalOverdue = overdue.reduce(
      (s: number, inv: { amount: number }) => s + inv.amount, 0
    );
    const totalDueSoon = dueSoon.reduce(
      (s: number, inv: { amount: number }) => s + inv.amount, 0
    );

    res.json({
      totalOutstanding,
      totalOverdue,
      totalDueSoon,
      overdueCount: overdue.length,
      overdue: overdue.map((inv: { id: string; invoiceNumber: string; amount: number; dueDate: Date; client: { name: string } }) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: inv.dueDate,
        daysOverdue: Math.floor((today.getTime() - new Date(inv.dueDate).getTime()) / 86400000),
        clientName: inv.client?.name,
      })),
      dueSoon: dueSoon.map((inv: { id: string; invoiceNumber: string; amount: number; dueDate: Date; client: { name: string } }) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        dueDate: inv.dueDate,
        clientName: inv.client?.name,
      })),
      recentlyPaid: recentlyPaid.map((inv: { id: string; invoiceNumber: string; amount: number; paidDate: Date | null; client: { name: string } }) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: inv.amount,
        paidDate: inv.paidDate,
        clientName: inv.client?.name,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /invoices — create invoice
router.post('/invoices', async (req: Request, res: Response) => {
  try {
    const { clientId, invoiceNumber, amount, dueDate, description, type, status } = req.body;
    if (!clientId || !invoiceNumber || !amount || !dueDate) {
      return res.status(400).json({ error: 'clientId, invoiceNumber, amount, and dueDate are required' });
    }
    const invoice = await prisma.invoice.create({
      data: {
        clientId,
        invoiceNumber,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        description: description || null,
        type: type || 'retainer',
        status: status || 'sent',
      },
    });
    res.json({ success: true, invoice });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PATCH /invoices/:id — update invoice (mark paid, change status, etc.)
router.patch('/invoices/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Record<string, unknown> = {};
    if (req.body.status) data.status = req.body.status;
    if (req.body.paidDate) data.paidDate = new Date(req.body.paidDate);
    if (req.body.paidAmount !== undefined) data.paidAmount = parseFloat(req.body.paidAmount);
    if (req.body.notes) data.notes = req.body.notes;
    if (req.body.amount) data.amount = parseFloat(req.body.amount);
    if (req.body.dueDate) data.dueDate = new Date(req.body.dueDate);

    // Auto-set paidDate if marking as paid
    if (data.status === 'paid' && !data.paidDate) {
      data.paidDate = new Date();
    }

    const invoice = await prisma.invoice.update({ where: { id }, data });
    res.json({ success: true, invoice });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// AD CAMPAIGNS — Used by: meta-traffic, founder-boss
// ================================================================

// GET /campaigns — list campaigns (optional ?clientId=&status=)
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const where: Record<string, unknown> = {};
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.status) where.status = req.query.status;
    const campaigns = await prisma.adCampaign.findMany({
      where,
      include: {
        client: { select: { name: true } },
        adSets: { include: { ads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ campaigns, total: campaigns.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /campaigns — create a campaign (typically from meta-traffic agent)
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const { clientId, name, objective, dailyBudget, lifetimeBudget, startDate, endDate, strategy, audienceSpec, adCopy, expectedCpa, expectedRoas, notes } = req.body;
    if (!clientId || !name || !objective) {
      return res.status(400).json({ error: 'clientId, name, and objective are required' });
    }
    const campaign = await prisma.adCampaign.create({
      data: {
        clientId,
        name,
        objective,
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : null,
        lifetimeBudget: lifetimeBudget ? parseFloat(lifetimeBudget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        strategy: strategy ? (typeof strategy === 'string' ? strategy : JSON.stringify(strategy)) : null,
        audienceSpec: audienceSpec ? (typeof audienceSpec === 'string' ? audienceSpec : JSON.stringify(audienceSpec)) : null,
        adCopy: adCopy ? (typeof adCopy === 'string' ? adCopy : JSON.stringify(adCopy)) : null,
        expectedCpa: expectedCpa ? parseFloat(expectedCpa) : null,
        expectedRoas: expectedRoas ? parseFloat(expectedRoas) : null,
        notes: notes || null,
        status: 'draft',
      },
      include: { client: { select: { name: true } } },
    });
    res.json({ success: true, campaign });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PATCH /campaigns/:id — update campaign (approve, activate, pause, etc.)
router.patch('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Record<string, unknown> = {};
    if (req.body.status) data.status = req.body.status;
    if (req.body.name) data.name = req.body.name;
    if (req.body.strategy) data.strategy = typeof req.body.strategy === 'string' ? req.body.strategy : JSON.stringify(req.body.strategy);
    if (req.body.audienceSpec) data.audienceSpec = typeof req.body.audienceSpec === 'string' ? req.body.audienceSpec : JSON.stringify(req.body.audienceSpec);
    if (req.body.adCopy) data.adCopy = typeof req.body.adCopy === 'string' ? req.body.adCopy : JSON.stringify(req.body.adCopy);
    if (req.body.notes) data.notes = req.body.notes;
    if (req.body.dailyBudget) data.dailyBudget = parseFloat(req.body.dailyBudget);

    const campaign = await prisma.adCampaign.update({ where: { id }, data });
    res.json({ success: true, campaign });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /campaigns/:id — single campaign with all ad sets and ads
router.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.adCampaign.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { name: true, contactName: true, industry: true } },
        adSets: { include: { ads: true } },
      },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// CONTENT CALENDAR — Cross-client content view
// ================================================================

// GET /content-calendar?start=YYYY-MM-DD&end=YYYY-MM-DD
router.get('/content-calendar', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startStr = req.query.start as string;
    const endStr = req.query.end as string;
    
    // Default: current week (Mon-Sun)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const defaultStart = new Date(now);
    defaultStart.setDate(now.getDate() + mondayOffset);
    defaultStart.setHours(0, 0, 0, 0);
    const defaultEnd = new Date(defaultStart);
    defaultEnd.setDate(defaultStart.getDate() + 6);
    defaultEnd.setHours(23, 59, 59, 999);

    const start = startStr ? new Date(startStr) : defaultStart;
    const end = endStr ? new Date(endStr) : defaultEnd;

    const items = await prisma.contentItem.findMany({
      where: {
        scheduledDate: { gte: start, lte: end },
      },
      include: { client: { select: { name: true } } },
      orderBy: { scheduledDate: 'asc' },
    });

    // Group by date
    const byDate: Record<string, unknown[]> = {};
    for (const item of items) {
      const dateKey = item.scheduledDate
        ? new Date(item.scheduledDate).toISOString().slice(0, 10)
        : 'unscheduled';
      if (!byDate[dateKey]) byDate[dateKey] = [];
      byDate[dateKey].push({
        id: item.id,
        title: item.title,
        platform: item.platform,
        contentType: item.contentType,
        status: item.status,
        clientName: item.client?.name,
        clientId: item.clientId,
        scheduledDate: item.scheduledDate,
        assignedTo: item.assignedTo,
      });
    }

    res.json({
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      totalItems: items.length,
      byDate,
      items: items.map(i => ({
        id: i.id,
        title: i.title,
        platform: i.platform,
        contentType: i.contentType,
        status: i.status,
        clientName: i.client?.name,
        clientId: i.clientId,
        scheduledDate: i.scheduledDate,
        assignedTo: i.assignedTo,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// TEAM MEMBERS — Employee tracking
// ================================================================

// GET /team — list all team members
router.get('/team', async (_req: Request, res: Response) => {
  try {
    const members = await prisma.teamMember.findMany({
      where: { status: 'active' },
      orderBy: { name: 'asc' },
    });
    res.json({ members });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /team — create team member
router.post('/team', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, role, weeklyCapacity, notes } = req.body;
    if (!name || !role) {
      return res.status(400).json({ error: 'name and role are required' });
    }
    const member = await prisma.teamMember.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        role,
        weeklyCapacity: weeklyCapacity || 2400,
        notes: notes || null,
      },
    });
    res.json({ success: true, member });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PATCH /team/:id — update team member
router.patch('/team/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: Record<string, unknown> = {};
    if (req.body.name) data.name = req.body.name;
    if (req.body.email !== undefined) data.email = req.body.email;
    if (req.body.phone !== undefined) data.phone = req.body.phone;
    if (req.body.role) data.role = req.body.role;
    if (req.body.status) data.status = req.body.status;
    if (req.body.weeklyCapacity) data.weeklyCapacity = parseInt(req.body.weeklyCapacity);
    if (req.body.notes !== undefined) data.notes = req.body.notes;

    const member = await prisma.teamMember.update({ where: { id }, data });
    res.json({ success: true, member });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /team/:id/workload — get assigned tasks for a team member
router.get('/team/:id/workload', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const member = await prisma.teamMember.findUnique({ where: { id } });
    if (!member) return res.status(404).json({ error: 'Team member not found' });

    const assignedRequests = await prisma.clientRequest.findMany({
      where: { assignedTo: member.name, status: { notIn: ['completed', 'closed'] } },
      include: { client: { select: { name: true } } },
      orderBy: { dueDate: 'asc' },
    });

    const assignedContent = await prisma.contentItem.findMany({
      where: { assignedTo: member.name, status: { notIn: ['published'] } },
      include: { client: { select: { name: true } } },
      orderBy: { scheduledDate: 'asc' },
    });

    res.json({
      member: { id: member.id, name: member.name, role: member.role },
      openRequests: assignedRequests.length,
      openContent: assignedContent.length,
      requests: assignedRequests,
      content: assignedContent,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// DAILY BRIEF — Used by: founder-boss, content-system
// GET /brief — Full agency daily briefing
// ================================================================

router.get('/brief', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    // Get all clients with health
    const clients = await prisma.client.findMany({ where: { status: 'active' } });
    const healthData = await recomputeAllClients();

    // Categorize by health
    const green: string[] = [];
    const yellow: string[] = [];
    const red: string[] = [];
    for (const h of healthData) {
      if (h.healthStatus === 'green') green.push(h.name);
      else if (h.healthStatus === 'yellow') yellow.push(h.name);
      else red.push(h.name);
    }

    // Content due this week
    const contentThisWeek = await prisma.contentItem.findMany({
      where: {
        scheduledDate: { gte: today, lte: weekEnd },
        status: { in: ['scheduled', 'approved', 'draft'] },
      },
      include: { client: { select: { name: true } } },
      orderBy: { scheduledDate: 'asc' },
    });

    const contentByClient: Record<string, number> = {};
    for (const c of contentThisWeek) {
      const name = c.client?.name || 'Unknown';
      contentByClient[name] = (contentByClient[name] || 0) + 1;
    }

    // Open requests
    const openRequests = await prisma.clientRequest.findMany({
      where: { status: { in: ['new', 'acknowledged', 'in_progress'] } },
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const overdueRequests = openRequests.filter((r: { dueDate: Date | null }) => 
      r.dueDate && new Date(r.dueDate) < today
    );

    // Upcoming deadlines (next 3 days)
    const threeDays = new Date(today);
    threeDays.setDate(threeDays.getDate() + 3);
    const urgentContent = contentThisWeek.filter((c: { scheduledDate: Date | null }) =>
      c.scheduledDate && new Date(c.scheduledDate) <= threeDays
    );

    // Revenue summary
    const totalMRR = clients.reduce((s: number, c: { monthlyRetainer: number }) => s + c.monthlyRetainer, 0);
    const atRiskRevenue = clients
      .filter((c: { healthStatus: string }) => c.healthStatus === 'red')
      .reduce((s: number, c: { monthlyRetainer: number }) => s + c.monthlyRetainer, 0);

    res.json({
      date: today.toISOString().split('T')[0],
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
      
      health: {
        green: { count: green.length, clients: green },
        yellow: { count: yellow.length, clients: yellow },
        red: { count: red.length, clients: red },
      },

      content: {
        dueThisWeek: contentThisWeek.length,
        byClient: contentByClient,
        urgentNext3Days: urgentContent.length,
        urgentItems: urgentContent.map((c: { title: string; scheduledDate: Date; status: string; client: { name: string } }) => ({
          title: c.title,
          client: c.client?.name,
          scheduledDate: c.scheduledDate,
          status: c.status,
        })),
      },

      requests: {
        open: openRequests.length,
        overdue: overdueRequests.length,
        overdueItems: overdueRequests.map((r: { title: string; dueDate: Date; priority: string; client: { name: string } }) => ({
          title: r.title,
          client: r.client?.name,
          dueDate: r.dueDate,
          priority: r.priority,
        })),
      },

      revenue: {
        totalMRR,
        atRiskRevenue,
        atRiskClients: red.length,
      },

      summary: `${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} Brief: ${green.length} green, ${yellow.length} yellow, ${red.length} red. ${contentThisWeek.length} content items due this week. ${openRequests.length} open requests (${overdueRequests.length} overdue). MRR: $${totalMRR.toLocaleString()}, $${atRiskRevenue.toLocaleString()} at risk.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /invoices/:id/pdf — generate PDF
router.get('/invoices/:id/pdf', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const { generateInvoicePdf } = require('../lib/invoicePdf');
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: invoice.issuedDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      clientName: invoice.client.name,
      clientEmail: invoice.client.contactEmail || '',
      items: [{ description: invoice.description || `${invoice.type} — ${invoice.client.name}`, amount: invoice.amount }],
      total: invoice.amount,
      status: invoice.status,
      notes: invoice.notes || undefined,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${invoice.invoiceNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /invoices/:id/send-email — send invoice via email
router.post('/invoices/:id/send-email', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const toEmail = invoice.client.invoiceEmail || invoice.client.contactEmail;
    if (!toEmail) return res.status(400).json({ error: 'No email address for this client' });

    const { generateInvoicePdf } = require('../lib/invoicePdf');
    const pdfBuffer = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      issuedDate: invoice.issuedDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      clientName: invoice.client.name,
      clientEmail: toEmail,
      items: [{ description: invoice.description || `${invoice.type} — ${invoice.client.name}`, amount: invoice.amount }],
      total: invoice.amount,
      status: invoice.status,
      notes: invoice.notes || undefined,
    });

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const isReminder = req.body.reminder === true;
    const subject = isReminder
      ? `Reminder: Invoice ${invoice.invoiceNumber} — ${invoice.client.name}`
      : `Invoice ${invoice.invoiceNumber} — 2FLY Digital Marketing`;

    const html = isReminder
      ? `<p>Hi ${invoice.client.contactName || 'there'},</p><p>This is a friendly reminder that invoice <strong>${invoice.invoiceNumber}</strong> for <strong>$${invoice.amount.toLocaleString()}</strong> is ${invoice.status === 'overdue' ? 'overdue' : `due on ${new Date(invoice.dueDate).toLocaleDateString()}`}.</p><p>Please find the invoice attached.</p><p>Thank you,<br/>2FLY Digital Marketing</p>`
      : `<p>Hi ${invoice.client.contactName || 'there'},</p><p>Please find attached invoice <strong>${invoice.invoiceNumber}</strong> for <strong>$${invoice.amount.toLocaleString()}</strong>, due on <strong>${new Date(invoice.dueDate).toLocaleDateString()}</strong>.</p><p>Thank you for your business!</p><p>2FLY Digital Marketing</p>`;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || '"2FLY Digital Marketing" <hello@2flydigital.com>',
      to: toEmail,
      subject,
      html,
      attachments: [{ filename: `${invoice.invoiceNumber}.pdf`, content: pdfBuffer }],
    });

    // Update invoice status to sent if it was draft
    if (invoice.status === 'draft') {
      await prisma.invoice.update({ where: { id }, data: { status: 'sent' } });
    }

    res.json({ success: true, sentTo: toEmail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /invoices/auto-generate — generate monthly invoices for all clients
router.post('/invoices/auto-generate', async (_req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({ where: { status: 'active', autoInvoice: true } });
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    
    // Get last invoice number
    const lastInvoice = await prisma.invoice.findFirst({ orderBy: { createdAt: 'desc' } });
    let nextNum = 100;
    if (lastInvoice) {
      const match = lastInvoice.invoiceNumber.match(/\d+/);
      if (match) nextNum = parseInt(match[0]) + 1;
    }

    const created = [];
    for (const client of clients) {
      // Check if invoice already exists for this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const existing = await prisma.invoice.findFirst({
        where: {
          clientId: client.id,
          type: 'retainer',
          issuedDate: { gte: startOfMonth, lte: endOfMonth },
        },
      });
      if (existing) continue; // skip if already generated

      const dueDate = new Date(now.getFullYear(), now.getMonth(), client.billingDay || 1);
      if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1); // if past due day, set to next month

      const invoice = await prisma.invoice.create({
        data: {
          clientId: client.id,
          invoiceNumber: `INV-${nextNum++}`,
          amount: client.monthlyRetainer,
          dueDate,
          description: `${month} retainer — ${client.name}`,
          type: 'retainer',
          status: 'draft',
        },
      });
      created.push({ client: client.name, invoiceNumber: invoice.invoiceNumber, amount: invoice.amount });
    }

    res.json({ success: true, generated: created.length, invoices: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
