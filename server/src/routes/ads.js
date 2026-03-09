// ============================================================
// API: ADS INTELLIGENCE WEEKLY SUMMARY
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/ads?clientId=xxx — ad reports for a client
router.get("/", async (req, res) => {
  try {
    const where = {};
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.platform) where.platform = req.query.platform;

    const reports = await prisma.adReport.findMany({
      where,
      orderBy: { weekStart: "desc" },
      include: { client: { select: { name: true, roasTarget: true } } },
    });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ads/weekly-overview — latest week for all clients
router.get("/weekly-overview", async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({ where: { status: "active" } });
    const overview = await Promise.all(
      clients.map(async (c) => {
        const latest = await prisma.adReport.findFirst({
          where: { clientId: c.id },
          orderBy: { weekStart: "desc" },
        });
        return {
          clientId: c.id,
          clientName: c.name,
          roasTarget: c.roasTarget,
          latestReport: latest || null,
          status: !latest
            ? "gray"
            : latest.roas >= c.roasTarget
              ? "green"
              : latest.roas >= c.roasTarget * 0.8
                ? "yellow"
                : "red",
        };
      })
    );
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ads — log a weekly ad report
router.post("/", async (req, res) => {
  try {
    // Auto-calculate derived fields
    const data = { ...req.body };
    if (data.spend && data.revenue) data.roas = parseFloat((data.revenue / data.spend).toFixed(2));
    if (data.spend && data.conversions) data.cpa = parseFloat((data.spend / data.conversions).toFixed(2));
    if (data.clicks && data.impressions) data.ctr = parseFloat((data.clicks / data.impressions).toFixed(4));

    const report = await prisma.adReport.create({ data });
    res.status(201).json(report);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
