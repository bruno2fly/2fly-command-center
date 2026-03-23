/**
 * Google Ads routes
 * Manages Google Ads connections and fetches campaign data per client.
 * Note: Full API integration requires developer token (pending).
 * For now, supports manual connection + data entry via agent.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const router = Router();

// GET /api/google-ads/:clientId — Get Google Ads data for a client
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    
    const connection = await prisma.googleAdsConnection.findUnique({
      where: { clientId },
      include: { client: { select: { name: true } } },
    });

    if (!connection) {
      return res.json({
        connected: false,
        message: 'Google Ads not connected for this client',
      });
    }

    // Once we have API access, this will pull live data
    // For now, return connection info + any cached data
    res.json({
      connected: true,
      customerId: connection.customerId,
      customerName: connection.customerName,
      managerAccountId: connection.managerAccountId,
      status: connection.status,
      connectedAt: connection.connectedAt,
      clientName: (connection.client as any)?.name,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// POST /api/google-ads/connect — Connect a client to Google Ads
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { clientId, customerId, customerName, managerAccountId } = req.body;

    if (!clientId || !customerId) {
      return res.status(400).json({ error: 'clientId and customerId are required' });
    }

    // Upsert connection
    const connection = await prisma.googleAdsConnection.upsert({
      where: { clientId },
      update: {
        customerId,
        customerName: customerName || null,
        managerAccountId: managerAccountId || null,
        status: 'active',
      },
      create: {
        clientId,
        customerId,
        customerName: customerName || null,
        managerAccountId: managerAccountId || null,
        status: 'active',
      },
    });

    res.json({ success: true, connection });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

// DELETE /api/google-ads/:clientId — Disconnect
router.delete('/:clientId', async (req: Request, res: Response) => {
  try {
    await prisma.googleAdsConnection.delete({
      where: { clientId: req.params.clientId },
    });
    res.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: msg });
  }
});

export default router;
