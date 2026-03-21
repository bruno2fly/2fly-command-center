/**
 * 2FLY Flow Bridge Routes
 * 
 * Exposes real production data from 2FLY Flow to the Command Center frontend.
 * Maps Command Center clientIds to Flow clientIds via the `flowClientId` field.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  getFlowClients,
  getFlowClientData,
  getFlowPortalState,
  getFlowTasks,
  getFlowScheduledPosts,
  clearFlowCache,
  isFlowConfigured,
} from '../lib/flowSync.js';

const prisma = new PrismaClient();
const router = Router();

// GET /api/flow/status — Check if Flow sync is configured and working
router.get('/status', async (_req: Request, res: Response) => {
  if (!isFlowConfigured()) {
    return res.json({ configured: false, message: 'Flow credentials not set in .env' });
  }
  try {
    const clients = await getFlowClients();
    res.json({ configured: true, connected: true, flowClients: clients.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.json({ configured: true, connected: false, error: msg });
  }
});

// GET /api/flow/clients — List all Flow clients (for mapping UI)
router.get('/clients', async (_req: Request, res: Response) => {
  try {
    const flowClients = await getFlowClients();
    // Also get Command Center clients with their flowClientId mappings
    const ccClients = await prisma.client.findMany({
      select: { id: true, name: true, flowClientId: true },
    });
    res.json({ flowClients, ccClients });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// POST /api/flow/map — Map a Command Center client to a Flow client
router.post('/map', async (req: Request, res: Response) => {
  try {
    const { clientId, flowClientId } = req.body;
    if (!clientId) return res.status(400).json({ error: 'clientId required' });

    const client = await prisma.client.update({
      where: { id: clientId },
      data: { flowClientId: flowClientId || null },
    });
    res.json({ success: true, clientId: client.id, flowClientId: client.flowClientId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).json({ error: msg });
  }
});

// GET /api/flow/data/:clientId — Get all Flow data for a Command Center client
router.get('/data/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { flowClientId: true, name: true },
    });

    if (!client?.flowClientId) {
      return res.json({
        connected: false,
        message: `${client?.name || 'Client'} is not mapped to a 2FLY Flow client`,
      });
    }

    const data = await getFlowClientData(client.flowClientId);
    res.json({ connected: true, flowClientId: client.flowClientId, ...data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// GET /api/flow/portal/:clientId — Get portal state only
router.get('/portal/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { flowClientId: true },
    });
    if (!client?.flowClientId) return res.json({ connected: false });

    const state = await getFlowPortalState(client.flowClientId);
    res.json({ connected: true, ...state });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// GET /api/flow/tasks/:clientId — Get production tasks only
router.get('/tasks/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { flowClientId: true },
    });
    if (!client?.flowClientId) return res.json({ connected: false, tasks: [] });

    const tasks = await getFlowTasks(client.flowClientId);
    res.json({ connected: true, tasks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// GET /api/flow/posts/:clientId — Get scheduled posts only
router.get('/posts/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { flowClientId: true },
    });
    if (!client?.flowClientId) return res.json({ connected: false, posts: [] });

    const posts = await getFlowScheduledPosts(client.flowClientId);
    res.json({ connected: true, posts });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// POST /api/flow/cache/clear — Force clear cache
router.post('/cache/clear', (_req: Request, res: Response) => {
  clearFlowCache();
  res.json({ cleared: true });
});

export default router;
