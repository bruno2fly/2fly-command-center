// ============================================================
// API: CONTENT BUFFER ENGINE
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { getBufferStatus } = require("../lib/statusEngine");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/content?clientId=xxx — content items for a client
router.get("/", async (req, res) => {
  try {
    const where = {};
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.status) where.status = req.query.status;

    const items = await prisma.contentItem.findMany({
      where,
      orderBy: { scheduledDate: "asc" },
      include: { client: { select: { name: true } } },
    });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/buffer-overview — buffer days for all clients
router.get("/buffer-overview", async (_req, res) => {
  try {
    const clients = await prisma.client.findMany({ where: { status: "active" } });
    const overview = await Promise.all(
      clients.map(async (c) => {
        const buffer = await getBufferStatus(c.id);
        return { clientId: c.id, clientName: c.name, ...buffer };
      })
    );
    res.json(overview);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/content — create content item
router.post("/", async (req, res) => {
  try {
    const item = await prisma.contentItem.create({ data: req.body });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/content/:id — update (change status, reschedule, etc)
router.patch("/:id", async (req, res) => {
  try {
    const item = await prisma.contentItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/content/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.contentItem.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
