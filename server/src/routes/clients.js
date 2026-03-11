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

// GET /api/clients/:clientId/tasks — list tasks for a client
router.get("/:clientId/tasks", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status, type, source } = req.query;
    const where = { clientId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (source) where.source = source;
    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    res.json({ tasks, total: tasks.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/:clientId/tasks — create task (used by agents)
router.post("/:clientId/tasks", async (req, res) => {
  try {
    const { clientId } = req.params;
    const body = req.body || {};
    const task = await prisma.task.create({
      data: {
        clientId,
        title: body.title || "Task",
        description: body.description ?? null,
        type: body.type || "task",
        priority: body.priority || "normal",
        assignedTo: body.assignedTo ?? null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        source: body.source || "agent",
        directiveId: body.directiveId ?? null,
      },
    });
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/clients/:clientId/tasks/:taskId — update task
router.patch("/:clientId/tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    const body = req.body || {};
    const data = {};
    if (body.status != null) data.status = body.status;
    if (body.title != null) data.title = body.title;
    if (body.priority != null) data.priority = body.priority;
    if (body.assignedTo != null) data.assignedTo = body.assignedTo;
    if (body.dueDate != null) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.completedAt != null) data.completedAt = body.completedAt ? new Date(body.completedAt) : null;
    const task = await prisma.task.update({
      where: { id: taskId },
      data,
    });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/clients/:clientId/tasks/:taskId
router.delete("/:clientId/tasks/:taskId", async (req, res) => {
  try {
    await prisma.task.delete({ where: { id: req.params.taskId } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
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
        tasks: { orderBy: { createdAt: "desc" } },
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
