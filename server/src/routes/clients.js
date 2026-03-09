// ============================================================
// API: CLIENT HEALTH BOARD
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { computeClientHealth, recomputeAllClients } = require("../lib/statusEngine");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/clients — all clients with current health
router.get("/", async (req, res) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
    });

    // Enrich each client with live health data
    const enriched = await Promise.all(
      clients.map(async (client) => {
        const health = await computeClientHealth(client.id);
        return { ...client, health };
      })
    );

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id — single client detail
router.get("/:id", async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        contentItems: { orderBy: { scheduledDate: "asc" }, take: 30 },
        requests: { orderBy: { createdAt: "desc" }, take: 20 },
        adReports: { orderBy: { weekStart: "desc" }, take: 8 },
        healthLogs: { orderBy: { createdAt: "desc" }, take: 12 },
      },
    });
    if (!client) return res.status(404).json({ error: "Client not found" });

    const health = await computeClientHealth(client.id);
    res.json({ ...client, health });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients — create new client
router.post("/", async (req, res) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    res.status(201).json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/clients/:id — update client
router.patch("/:id", async (req, res) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(client);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/clients/recompute — force recompute all health
router.post("/recompute", async (_req, res) => {
  try {
    const results = await recomputeAllClients();
    res.json({ message: "Recomputed", results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
