// ============================================================
// Today Dashboard API
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { getTodayView } = require("../lib/priorityEngine");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/dashboard/today
router.get("/today", async (req, res) => {
  try {
    const data = await getTodayView(prisma);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActions = await prisma.agentAction.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    data.recentActivity = recentActions.map((a) => ({
      time: a.createdAt,
      text: `${a.agentName || a.agentId}: ${a.title}`,
      clientName: a.clientName,
      status: a.status,
    }));

    // Also add recent directives or other events if we want
    const recentDirectives = await prisma.directive.findMany({
      where: { createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    for (const d of recentDirectives) {
      data.recentActivity.push({
        time: d.createdAt,
        text: `Directive: ${d.message.slice(0, 50)}${d.message.length > 50 ? "…" : ""}`,
        clientName: d.clientName,
        status: d.status,
      });
    }
    data.recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));
    data.recentActivity = data.recentActivity.slice(0, 10);

    res.json(data);
  } catch (err) {
    console.error("Dashboard today error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
