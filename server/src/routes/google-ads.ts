/**
 * Google Ads routes
 * Full API integration with google-ads-api package.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
const { GoogleAdsApi } = require("google-ads-api");;

const prisma = new PrismaClient();
const router = Router();

function getCustomer(customerId: string, refreshToken: string) {
  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
    developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
  });
  return client.Customer({
    customer_id: customerId.replace(/-/g, ''),
    refresh_token: refreshToken,
  });
}

// GET /api/google-ads/:clientId — Get connection status + campaigns
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const connection = await prisma.googleAdsConnection.findUnique({
      where: { clientId },
      include: { client: { select: { name: true } } },
    });
    if (!connection) {
      return res.json({ connected: false, message: 'Google Ads not connected for this client' });
    }
    res.json({
      connected: true,
      customerId: connection.customerId,
      customerName: connection.customerName,
      status: connection.status,
      connectedAt: connection.connectedAt,
      clientName: (connection.client as any)?.name,
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// GET /api/google-ads/:clientId/campaigns — Fetch live campaigns
router.get('/:clientId/campaigns', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const connection = await prisma.googleAdsConnection.findUnique({ where: { clientId } });
    const customerId = connection?.customerId;
    const refreshToken = (connection as any)?.refreshToken || process.env.GOOGLE_ADS_REFRESH_TOKEN;

    if (!customerId) {
      return res.status(404).json({ error: 'No Google Ads connection found for this client' });
    }

    const customer = getCustomer(customerId, refreshToken!);

    // Split queries: get ALL enabled campaigns first, then overlay metrics
    const campaignRows = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign_budget.amount_micros
      FROM campaign
      WHERE campaign.status != 'REMOVED'
      ORDER BY campaign.name
      LIMIT 50
    `);

    // Get metrics separately (only for campaigns with activity)
    const metricsRows = await customer.query(`
      SELECT
        campaign.id,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.ctr
      FROM campaign
      WHERE segments.date DURING LAST_30_DAYS
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.impressions DESC
      LIMIT 50
    `);

    // Create metrics map for quick lookup
    const metricsMap = new Map();
    metricsRows.forEach((row: any) => {
      metricsMap.set(row.campaign?.id, row.metrics);
    });

    const campaigns = campaignRows.map((row: any) => {
      const metrics = metricsMap.get(row.campaign?.id) || {};
      return {
        id: row.campaign?.id,
        name: row.campaign?.name,
        status: row.campaign?.status,
        channelType: row.campaign?.advertising_channel_type,
        budgetDailyUSD: row.campaign_budget?.amount_micros
          ? (Number(row.campaign_budget.amount_micros) / 1_000_000).toFixed(2)
          : null,
        impressions: Number(metrics?.impressions || 0),
        clicks: Number(metrics?.clicks || 0),
        costUSD: metrics?.cost_micros
          ? (Number(metrics.cost_micros) / 1_000_000).toFixed(2)
          : '0.00',
        conversions: Number(metrics?.conversions || 0),
        ctr: metrics?.ctr ? (Number(metrics.ctr) * 100).toFixed(2) + '%' : '0%',
      };
    });

    res.json({ campaigns, customerId, total: campaigns.length });
  } catch (err: unknown) {
    console.error('Google Ads campaigns error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// GET /api/google-ads/:clientId/status
router.get('/:clientId/status', async (req: Request, res: Response) => {
  try {
    const { clientId } = req.params;
    const connection = await prisma.googleAdsConnection.findUnique({ where: { clientId } });
    if (!connection) return res.json({ connected: false });
    res.json({ connected: true, customerId: connection.customerId, status: connection.status });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// POST /api/google-ads/connect — Connect a client to Google Ads
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { clientId, customerId, customerName, managerAccountId } = req.body;
    if (!clientId || !customerId) {
      return res.status(400).json({ error: 'clientId and customerId are required' });
    }
    const connection = await prisma.googleAdsConnection.upsert({
      where: { clientId },
      update: { customerId, customerName: customerName || null, managerAccountId: managerAccountId || null, status: 'active' },
      create: { clientId, customerId, customerName: customerName || null, managerAccountId: managerAccountId || null, status: 'active' },
    });
    res.json({ success: true, connection });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// DELETE /api/google-ads/:clientId — Disconnect
router.delete('/:clientId', async (req: Request, res: Response) => {
  try {
    await prisma.googleAdsConnection.delete({ where: { clientId: req.params.clientId } });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

export default router;
