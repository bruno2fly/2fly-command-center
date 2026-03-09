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

export default router;
