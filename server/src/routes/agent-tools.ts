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

// GET /api/agent-tools/clients — List all active clients with health (optional ?workspace=agency|saas)
router.get('/clients', async (req: Request, res: Response) => {
  try {
    const workspace = (req.query.workspace as string) || 'agency';
    const where: { status: string; workspace?: string } = { status: 'active' };
    if (workspace === 'agency' || workspace === 'saas') where.workspace = workspace;
    const clients = await prisma.client.findMany({
      where,
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
      roasTarget, notes, status, healthStatus, workspace: workspaceBody,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Client name is required' });

    const platformsStr =
      typeof platforms === 'string' ? platforms :
      Array.isArray(platforms) ? JSON.stringify(platforms) : '["meta"]';

    const workspace = workspaceBody === 'saas' ? 'saas' : 'agency';

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
        workspace,
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
      'roasTarget', 'platforms', 'status', 'healthStatus', 'notes', 'workspace',
      'billingDay', 'autoInvoice', 'invoiceEmail',
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

// DELETE /api/agent-tools/clients/:id — Delete client + all related data
router.delete('/clients/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    // Cascade delete all related records
    await prisma.task.deleteMany({ where: { clientId: id } });
    await prisma.contentItem.deleteMany({ where: { clientId: id } });
    await prisma.contentStrategy.deleteMany({ where: { clientId: id } });
    await prisma.clientRequest.deleteMany({ where: { clientId: id } });
    await prisma.invoice.deleteMany({ where: { clientId: id } });
    await prisma.dailyReport.deleteMany({ where: { clientId: id } });
    await prisma.healthLog.deleteMany({ where: { clientId: id } });
    await prisma.directive.deleteMany({ where: { clientId: id } });
    await prisma.agentAction.deleteMany({ where: { clientId: id } });
    await prisma.adCampaign.deleteMany({ where: { clientId: id } });
    await prisma.adReport.deleteMany({ where: { clientId: id } });
    await prisma.adActionLog.deleteMany({ where: { clientId: id } });
    await prisma.metaConnection.deleteMany({ where: { clientId: id } });
    await prisma.client.delete({ where: { id } });
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
    const { clientId, platform, contentType, type, title, caption, notes, status, scheduledDate, assignedTo, source } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ error: 'clientId and title are required' });
    }

    const item = await prisma.contentItem.create({
      data: {
        clientId,
        platform: platform || 'meta',
        contentType: type || contentType || 'post',
        title,
        caption: caption || null,
        notes: notes || null,
        status: status || 'draft',
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        assignedTo: assignedTo || null,
        source: source || 'manual',
      },
    });

    res.status(201).json(item);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: message });
  }
});

// DELETE /api/agent-tools/content/:id — Delete content item
router.delete('/content/:id', async (req: Request, res: Response) => {
  try {
    await prisma.contentItem.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
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
      const clientName = h.clientName || h.name || 'Unknown';
      if (h.overall === 'green' || h.healthStatus === 'green') green.push(clientName);
      else if (h.overall === 'yellow' || h.healthStatus === 'yellow') yellow.push(clientName);
      else red.push(clientName);
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

// ================================================================
// META ADS OAUTH — Connect client Meta Business accounts
// ================================================================

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';
const META_REDIRECT_URI = process.env.META_REDIRECT_URI || 'http://localhost:4000/api/agent-tools/meta/callback';
const META_SCOPES = 'ads_read,ads_management,business_management,pages_read_engagement';

// GET /meta/auth-url?clientId=XXX — Returns Meta OAuth URL with state=clientId
router.get('/meta/auth-url', async (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    if (!META_APP_ID) return res.status(500).json({ error: 'META_APP_ID not configured' });

    const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
    url.searchParams.set('client_id', META_APP_ID);
    url.searchParams.set('redirect_uri', META_REDIRECT_URI);
    url.searchParams.set('state', clientId);
    url.searchParams.set('scope', META_SCOPES);

    res.json({ url: url.toString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /meta/callback?code=XXX&state=XXX — Exchanges code for token, saves MetaConnection
router.get('/meta/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string; // clientId
    const error = req.query.error as string;

    if (error) {
      const redirectUrl = `http://localhost:3001/clients/${state || ''}?tab=ads&error=${encodeURIComponent(error)}`;
      return res.redirect(redirectUrl);
    }

    if (!code || !state) {
      return res.redirect(`http://localhost:3001/clients/${state || ''}?tab=ads&error=missing_params`);
    }

    if (!META_APP_ID || !META_APP_SECRET) {
      return res.redirect(`http://localhost:3001/clients/${state}?tab=ads&error=server_config`);
    }

    // Exchange code for short-lived token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', META_APP_ID);
    tokenUrl.searchParams.set('client_secret', META_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', META_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString());
    const tokenData = (await tokenRes.json()) as { access_token?: string; expires_in?: number };

    if (!tokenData.access_token) {
      return res.redirect(`http://localhost:3001/clients/${state}?tab=ads&error=token_exchange`);
    }

    // Exchange for long-lived token (60 days)
    const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', META_APP_ID);
    longLivedUrl.searchParams.set('client_secret', META_APP_SECRET);
    longLivedUrl.searchParams.set('fb_exchange_token', tokenData.access_token);

    const longRes = await fetch(longLivedUrl.toString());
    const longData = (await longRes.json()) as { access_token?: string; expires_in?: number };

    const accessToken = longData.access_token || tokenData.access_token;
    const expiresIn = longData.expires_in ?? tokenData.expires_in ?? 5184000; // 60 days default
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

    // Fetch user info
    const meRes = await fetch(
      `https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(accessToken)}`
    );
    const meData = (await meRes.json()) as { id?: string; name?: string };

    // Fetch ad accounts
    const adAccountsRes = await fetch(
      `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${encodeURIComponent(accessToken)}`
    );
    const adAccountsData = (await adAccountsRes.json()) as { data?: Array<{ id: string; name: string; account_status: number }> };

    const accounts = adAccountsData.data || [];

    await prisma.metaConnection.upsert({
      where: { clientId: state },
      create: {
        clientId: state,
        metaUserId: meData.id || null,
        accessToken,
        tokenExpiresAt,
        scopes: META_SCOPES,
        status: 'active',
      },
      update: {
        metaUserId: meData.id || undefined,
        accessToken,
        tokenExpiresAt,
        scopes: META_SCOPES,
        status: 'active',
      },
    });

    // If only 1 ad account, auto-select it
    if (accounts.length === 1) {
      await prisma.metaConnection.update({
        where: { clientId: state },
        data: {
          adAccountId: accounts[0].id,
          adAccountName: accounts[0].name,
        },
      });
    }

    res.redirect(`http://localhost:3001/clients/${state}?tab=ads&connected=true`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const state = (req.query.state as string) || '';
    res.redirect(`http://localhost:3001/clients/${state}?tab=ads&error=${encodeURIComponent(message)}`);
  }
});

// GET /meta/status/:clientId — Returns connection status for a client
router.get('/meta/status/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.metaConnection.findUnique({
      where: { clientId },
    });

    if (!conn) {
      return res.json({
        connected: false,
        status: 'not_connected',
      });
    }

    const isExpired = conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date();

    // Also validate the token actually works (catch revoked tokens — error 190)
    let isRevoked = false;
    if (conn.accessToken && !isExpired) {
      try {
        const testRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${encodeURIComponent(conn.accessToken)}`);
        const testData = await testRes.json() as { error?: { code?: number } };
        if (testData.error) {
          isRevoked = true;
        }
      } catch {
        // Network error — don't mark as revoked, might be temporary
      }
    }

    const tokenInvalid = isExpired || isRevoked;

    return res.json({
      connected: conn.status === 'active' && !tokenInvalid,
      status: tokenInvalid ? 'expired' : conn.status,
      adAccountName: conn.adAccountName || undefined,
      adAccountId: conn.adAccountId || undefined,
      connectedAt: conn.connectedAt?.toISOString?.(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /meta/disconnect/:clientId — Removes connection
router.post('/meta/disconnect/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    await prisma.metaConnection.deleteMany({
      where: { clientId },
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /meta/ad-accounts?clientId=XXX — Lists ad accounts (uses global token if no connection)
router.get('/meta/ad-accounts', async (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });

    // Use existing connection token OR fall back to global token
    let token = process.env.META_ACCESS_TOKEN || '';
    const conn = await prisma.metaConnection.findUnique({
      where: { clientId },
    });
    if (conn?.accessToken) {
      token = conn.accessToken;
    }
    if (!token) return res.status(500).json({ error: 'No Meta access token available' });

    const res2 = await fetch(
      `https://graph.facebook.com/v25.0/me/adaccounts?fields=id,name,account_status&access_token=${encodeURIComponent(token)}`
    );
    const data = (await res2.json()) as { data?: Array<{ id: string; name: string; account_status: number }> };

    // Filter to active accounts only (status 1 = ACTIVE)
    const accounts = (data.data || []).map((a) => ({
      id: a.id,
      name: a.name,
      status: a.account_status,
    }));

    res.json({ accounts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /meta/quick-connect — { clientId, adAccountId, adAccountName } → creates MetaConnection (no OAuth needed)
router.post('/meta/quick-connect', async (req: Request, res: Response) => {
  try {
    const { clientId, adAccountId, adAccountName } = req.body;
    if (!clientId || !adAccountId) {
      return res.status(400).json({ error: 'clientId and adAccountId are required' });
    }

    // Verify the ad account is accessible with our global token
    const token = process.env.META_ACCESS_TOKEN;
    if (!token) {
      return res.status(500).json({ error: 'META_ACCESS_TOKEN not configured' });
    }

    const verifyRes = await fetch(
      `https://graph.facebook.com/v25.0/${adAccountId}?fields=name,account_status&access_token=${token}`
    );
    const verifyData = await verifyRes.json() as Record<string, unknown>;
    if ((verifyData as Record<string, unknown>).error) {
      return res.status(400).json({ error: `Cannot access ad account: ${((verifyData as Record<string, unknown>).error as Record<string, unknown>)?.message || 'Unknown error'}` });
    }

    const accountName = adAccountName || (verifyData as Record<string, string>).name || adAccountId;

    // Upsert MetaConnection
    await prisma.metaConnection.upsert({
      where: { clientId },
      create: {
        clientId,
        adAccountId,
        adAccountName: accountName,
        accessToken: token,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        status: 'active',
      },
      update: {
        adAccountId,
        adAccountName: accountName,
        accessToken: token,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        status: 'active',
      },
    });

    res.json({ success: true, adAccountId, adAccountName: accountName });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /meta/select-account — { clientId, adAccountId, adAccountName } → updates MetaConnection
router.post('/meta/select-account', async (req: Request, res: Response) => {
  try {
    const { clientId, adAccountId, adAccountName } = req.body;
    if (!clientId || !adAccountId || !adAccountName) {
      return res.status(400).json({ error: 'clientId, adAccountId, and adAccountName are required' });
    }

    await prisma.metaConnection.update({
      where: { clientId },
      data: { adAccountId, adAccountName },
    });

    res.json({ success: true });
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

// POST /meta/sync/:clientId — Pull live campaigns from Meta API into DB
router.post('/meta/sync/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.metaConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.accessToken || !conn.adAccountId) {
      return res.status(400).json({ error: 'No active Meta connection for this client' });
    }

    const token = conn.accessToken;
    const adAccountId = conn.adAccountId;

    // Fetch campaigns from Meta
    const campaignsRes = await fetch(
      `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=50&access_token=${encodeURIComponent(token)}`
    );
    const campaignsData = await campaignsRes.json() as { data?: Array<{ id: string; name: string; status: string; objective: string; daily_budget?: string; lifetime_budget?: string; start_time?: string; stop_time?: string }>; error?: { message: string } };
    if (campaignsData.error) {
      return res.status(400).json({ error: `Meta API: ${campaignsData.error.message}` });
    }

    const campaigns = campaignsData.data || [];
    const synced = [];

    for (const camp of campaigns) {
      // Map Meta status to our status
      let status = 'draft';
      if (camp.status === 'ACTIVE') status = 'active';
      else if (camp.status === 'PAUSED') status = 'paused';
      else if (camp.status === 'ARCHIVED' || camp.status === 'DELETED') status = 'completed';

      // Check if campaign already exists in DB by metaCampaignId
      const existing = await prisma.adCampaign.findFirst({
        where: { metaCampaignId: camp.id, clientId },
      });

      if (existing) {
        // Update status and budgets
        await prisma.adCampaign.update({
          where: { id: existing.id },
          data: {
            status,
            name: camp.name,
            dailyBudget: camp.daily_budget ? parseInt(camp.daily_budget) / 100 : existing.dailyBudget,
            lifetimeBudget: camp.lifetime_budget ? parseInt(camp.lifetime_budget) / 100 : existing.lifetimeBudget,
          },
        });
        synced.push({ action: 'updated', metaId: camp.id, name: camp.name, status });
      } else {
        // Create new campaign record
        await prisma.adCampaign.create({
          data: {
            clientId,
            metaCampaignId: camp.id,
            name: camp.name,
            objective: camp.objective || 'UNKNOWN',
            status,
            dailyBudget: camp.daily_budget ? parseInt(camp.daily_budget) / 100 : null,
            lifetimeBudget: camp.lifetime_budget ? parseInt(camp.lifetime_budget) / 100 : null,
            startDate: camp.start_time ? new Date(camp.start_time) : null,
            endDate: camp.stop_time ? new Date(camp.stop_time) : null,
            createdBy: 'meta-sync',
          },
        });
        synced.push({ action: 'created', metaId: camp.id, name: camp.name, status });
      }
    }

    res.json({ success: true, total: campaigns.length, synced });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ================================================================
// GOOGLE BUSINESS PROFILE OAUTH — Connect client Google accounts
// ================================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/agent-tools/google/callback';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/business.manage';

// Helper: refresh Google access token if expired
async function getValidGoogleToken(clientId: string): Promise<string> {
  const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
  if (!conn) throw new Error('No Google connection found');

  const now = new Date();
  const isExpired = conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < now;

  if (!isExpired) return conn.accessToken;

  if (!conn.refreshToken) throw new Error('Token expired and no refresh token available');

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: conn.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!tokenData.access_token) throw new Error(`Token refresh failed: ${tokenData.error || 'unknown'}`);

  const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

  await prisma.googleConnection.update({
    where: { clientId },
    data: { accessToken: tokenData.access_token, tokenExpiresAt },
  });

  return tokenData.access_token;
}

// GET /google/auth-url?clientId=XXX — Returns Google OAuth URL with state=clientId
router.get('/google/auth-url', async (req: Request, res: Response) => {
  try {
    const clientId = req.query.clientId as string;
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ error: 'GOOGLE_CLIENT_ID not configured' });

    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    url.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', GOOGLE_SCOPES);
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', clientId);

    res.json({ url: url.toString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /google/callback?code=XXX&state=XXX — Exchanges code for token, saves GoogleConnection
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const state = req.query.state as string; // clientId
    const error = req.query.error as string;

    if (error) {
      return res.redirect(`http://localhost:3001/google-reviews?error=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return res.redirect(`http://localhost:3001/google-reviews?error=missing_params`);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect(`http://localhost:3001/google-reviews?error=server_config`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      error?: string;
    };

    if (!tokenData.access_token) {
      return res.redirect(`http://localhost:3001/google-reviews?error=token_exchange`);
    }

    const tokenExpiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    // Fetch user info
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = (await userRes.json()) as { id?: string; email?: string };

    await prisma.googleConnection.upsert({
      where: { clientId: state },
      create: {
        clientId: state,
        googleAccountId: userData.id || null,
        accountEmail: userData.email || null,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || null,
        tokenExpiresAt,
        status: 'active',
      },
      update: {
        googleAccountId: userData.id || undefined,
        accountEmail: userData.email || undefined,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || undefined,
        tokenExpiresAt,
        status: 'active',
      },
    });

    res.redirect(`http://localhost:3001/google-reviews?connected=true&clientId=${state}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.redirect(`http://localhost:3001/google-reviews?error=${encodeURIComponent(message)}`);
  }
});

// GET /google/status/:clientId — Returns connection status
router.get('/google/status/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });

    if (!conn) {
      return res.json({ connected: false, status: 'not_connected' });
    }

    const isExpired = conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date();

    return res.json({
      connected: conn.status === 'active' && !isExpired,
      status: isExpired ? 'expired' : conn.status,
      accountEmail: conn.accountEmail || undefined,
      locationId: conn.locationId || undefined,
      locationName: conn.locationName || undefined,
      placeId: conn.placeId || undefined,
      connectedAt: conn.connectedAt?.toISOString?.(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /google/disconnect/:clientId — Removes connection
router.post('/google/disconnect/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    await prisma.googleConnection.deleteMany({ where: { clientId } });
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /google/locations/:clientId — List GBP locations for connected account
router.get('/google/locations/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const accessToken = await getValidGoogleToken(clientId);

    // List accounts first
    const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const accountsData = (await accountsRes.json()) as { accounts?: Array<{ name: string; accountName: string }> };

    if (!accountsData.accounts || accountsData.accounts.length === 0) {
      return res.json({ locations: [] });
    }

    // Fetch locations for each account
    const allLocations: Array<{ locationId: string; locationName: string; address: string }> = [];

    for (const account of accountsData.accounts) {
      const locRes = await fetch(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${account.name}/locations?readMask=name,title,storefrontAddress`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const locData = (await locRes.json()) as {
        locations?: Array<{
          name: string;
          title: string;
          storefrontAddress?: { addressLines?: string[]; locality?: string; administrativeArea?: string };
        }>;
      };

      if (locData.locations) {
        for (const loc of locData.locations) {
          const addr = loc.storefrontAddress;
          const addressStr = addr
            ? [addr.addressLines?.join(', '), addr.locality, addr.administrativeArea].filter(Boolean).join(', ')
            : '';
          allLocations.push({
            locationId: loc.name,
            locationName: loc.title,
            address: addressStr,
          });
        }
      }
    }

    res.json({ locations: allLocations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /google/select-location/:clientId — Save selected location
router.post('/google/select-location/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { locationId, locationName, placeId } = req.body;

    if (!locationId) return res.status(400).json({ error: 'locationId is required' });

    await prisma.googleConnection.update({
      where: { clientId },
      data: { locationId, locationName: locationName || null, placeId: placeId || null },
    });

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// GET /google/reviews/:clientId — Fetch reviews from GBP API
router.get('/google/reviews/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });

    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected. Connect Google and select a location first.' });
    }

    const accessToken = await getValidGoogleToken(clientId);

    const reviewsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/reviews`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const reviewsData = (await reviewsRes.json()) as {
      reviews?: Array<{
        reviewId: string;
        reviewer: { displayName: string; profilePhotoUrl?: string };
        starRating: string;
        comment?: string;
        createTime: string;
        updateTime: string;
        reviewReply?: { comment: string; updateTime: string };
      }>;
      averageRating?: number;
      totalReviewCount?: number;
    };

    res.json({
      reviews: reviewsData.reviews || [],
      averageRating: reviewsData.averageRating || 0,
      totalReviewCount: reviewsData.totalReviewCount || 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /google/reviews/:clientId/reply — Reply to a review
router.post('/google/reviews/:clientId/reply', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { reviewId, comment } = req.body;

    if (!reviewId || !comment) {
      return res.status(400).json({ error: 'reviewId and comment are required' });
    }

    const accessToken = await getValidGoogleToken(clientId);

    const replyRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${reviewId}/reply`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment }),
      }
    );

    const replyData = await replyRes.json();

    if (!replyRes.ok) {
      return res.status(replyRes.status).json({ error: (replyData as { error?: { message?: string } }).error?.message || 'Failed to reply' });
    }

    res.json({ success: true, reply: replyData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── Google Business: Local Posts ──

// GET /google/posts/:clientId — List local posts
router.get('/google/posts/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const postsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/localPosts`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const postsData = (await postsRes.json()) as { localPosts?: unknown[] };
    res.json({ posts: postsData.localPosts || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /google/posts/:clientId — Create a local post
router.post('/google/posts/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { summary, callToAction, media, topicType } = req.body;
    if (!summary) return res.status(400).json({ error: 'summary is required' });

    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);

    const postBody: Record<string, unknown> = {
      summary,
      topicType: topicType || 'STANDARD',
    };
    if (callToAction) postBody.callToAction = callToAction;
    if (media) postBody.media = media;

    const createRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/localPosts`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postBody),
      }
    );
    const createData = await createRes.json();
    if (!createRes.ok) {
      return res.status(createRes.status).json({ error: (createData as { error?: { message?: string } }).error?.message || 'Failed to create post' });
    }
    res.json({ success: true, post: createData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /google/posts/:clientId/:postId — Delete a local post
router.delete('/google/posts/:clientId/:postId', async (req: Request, res: Response) => {
  try {
    const { clientId, postId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const delRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/localPosts/${postId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!delRes.ok) {
      const errData = (await delRes.json()) as { error?: { message?: string } };
      return res.status(delRes.status).json({ error: errData.error?.message || 'Failed to delete post' });
    }
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── Google Business: Insights / Performance ──

// GET /google/insights/:clientId — Get performance metrics (last 30 days)
router.get('/google/insights/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);

    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const insightsRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}:reportInsights`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationNames: [conn.locationId],
          basicRequest: {
            metricRequests: [{ metric: 'ALL' }],
            timeRange: { startTime, endTime },
          },
        }),
      }
    );
    const insightsData = await insightsRes.json();
    if (!insightsRes.ok) {
      return res.status(insightsRes.status).json({ error: (insightsData as { error?: { message?: string } }).error?.message || 'Failed to fetch insights' });
    }
    res.json(insightsData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── Google Business: Q&A ──

// GET /google/questions/:clientId — List questions
router.get('/google/questions/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const qRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/questions`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const qData = (await qRes.json()) as { questions?: unknown[] };
    res.json({ questions: qData.questions || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /google/questions/:clientId/answer — Answer a question
router.post('/google/questions/:clientId/answer', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { questionId, text } = req.body;
    if (!questionId || !text) {
      return res.status(400).json({ error: 'questionId and text are required' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const ansRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${questionId}/answers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      }
    );
    const ansData = await ansRes.json();
    if (!ansRes.ok) {
      return res.status(ansRes.status).json({ error: (ansData as { error?: { message?: string } }).error?.message || 'Failed to answer' });
    }
    res.json({ success: true, answer: ansData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── Google Business: Photos / Media ──

// GET /google/media/:clientId — List media items
router.get('/google/media/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const mediaRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const mediaData = (await mediaRes.json()) as { mediaItems?: unknown[] };
    res.json({ media: mediaData.mediaItems || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// POST /google/media/:clientId — Upload photo (by URL)
router.post('/google/media/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const { sourceUrl, mediaFormat, locationAssociation } = req.body;
    if (!sourceUrl) return res.status(400).json({ error: 'sourceUrl is required' });

    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const uploadRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/media`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaFormat: mediaFormat || 'PHOTO',
          locationAssociation: locationAssociation || { category: 'ADDITIONAL' },
          sourceUrl,
        }),
      }
    );
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      return res.status(uploadRes.status).json({ error: (uploadData as { error?: { message?: string } }).error?.message || 'Failed to upload' });
    }
    res.json({ success: true, media: uploadData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// DELETE /google/media/:clientId/:mediaId — Delete media
router.delete('/google/media/:clientId/:mediaId', async (req: Request, res: Response) => {
  try {
    const { clientId, mediaId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const delRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}/media/${mediaId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!delRes.ok) {
      const errData = (await delRes.json()) as { error?: { message?: string } };
      return res.status(delRes.status).json({ error: errData.error?.message || 'Failed to delete media' });
    }
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ── Google Business: Info ──

// GET /google/info/:clientId — Get location details
router.get('/google/info/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);
    const infoRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}?fields=name,locationName,primaryPhone,address,websiteUrl,regularHours,primaryCategory,profile`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const infoData = await infoRes.json();
    if (!infoRes.ok) {
      return res.status(infoRes.status).json({ error: (infoData as { error?: { message?: string } }).error?.message || 'Failed to fetch info' });
    }
    res.json(infoData);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// PATCH /google/info/:clientId — Update location details
router.patch('/google/info/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const updates = req.body;
    const conn = await prisma.googleConnection.findUnique({ where: { clientId } });
    if (!conn || !conn.locationId) {
      return res.status(400).json({ error: 'No location selected' });
    }
    const accessToken = await getValidGoogleToken(clientId);

    const updateMask = Object.keys(updates).join(',');
    const patchRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${conn.locationId}?updateMask=${updateMask}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      }
    );
    const patchData = await patchRes.json();
    if (!patchRes.ok) {
      return res.status(patchRes.status).json({ error: (patchData as { error?: { message?: string } }).error?.message || 'Failed to update' });
    }
    res.json({ success: true, location: patchData });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

export default router;
