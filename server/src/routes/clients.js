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

// GET /api/clients/:clientId/actions — unified actionable items (tasks, content, requests) sorted by priority
router.get("/:clientId/actions", async (req, res) => {
  try {
    const { clientId } = req.params;
    const now = new Date();
    const actions = [];

    const [tasks, contentItems, requests] = await Promise.all([
      prisma.task.findMany({
        where: { clientId, status: { in: ["pending", "in_progress"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contentItem.findMany({
        where: { clientId, status: { in: ["draft", "review"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientRequest.findMany({
        where: { clientId, status: { in: ["new", "acknowledged", "in_progress", "waiting_client", "review"] } },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    for (const t of tasks) {
      const dueDate = t.dueDate ? t.dueDate.toISOString() : null;
      const isOverdue = dueDate && new Date(dueDate) < now;
      actions.push({
        id: `task-${t.id}`,
        entityType: "task",
        entityId: t.id,
        title: t.title,
        description: t.description || null,
        priority: t.priority || "normal",
        source: t.source === "agent" ? "agent" : "manual",
        sourceName: t.source === "agent" ? "Agent" : "Manual",
        dueDate,
        isOverdue: !!isOverdue,
        createdAt: t.createdAt.toISOString(),
        availableActions: ["complete", "skip"],
      });
    }
    for (const c of contentItems) {
      const dueDate = c.scheduledDate ? c.scheduledDate.toISOString() : null;
      const isOverdue = dueDate && new Date(dueDate) < now;
      actions.push({
        id: `content-${c.id}`,
        entityType: "content",
        entityId: c.id,
        title: c.title,
        description: c.caption || null,
        priority: "normal",
        source: c.source === "agent" ? "agent" : "manual",
        sourceName: c.source === "agent" ? "Content System" : "Manual",
        dueDate,
        isOverdue: !!isOverdue,
        createdAt: c.createdAt.toISOString(),
        availableActions: ["approve", "reject", "skip"],
      });
    }
    for (const r of requests) {
      const dueDate = r.dueDate ? r.dueDate.toISOString() : null;
      const isOverdue = (dueDate && new Date(dueDate) < now) || r.slaBreach;
      actions.push({
        id: `request-${r.id}`,
        entityType: "request",
        entityId: r.id,
        title: r.title,
        description: r.description || null,
        priority: r.priority || "normal",
        source: "client_request",
        sourceName: "Client request",
        dueDate,
        isOverdue: !!isOverdue,
        createdAt: r.createdAt.toISOString(),
        availableActions: ["acknowledge", "resolve", "skip"],
      });
    }

    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    actions.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      return pa - pb;
    });

    res.json({ actions, total: actions.length });
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
        contentItems: { orderBy: { scheduledDate: "asc" }, take: 50 },
        requests: { orderBy: { createdAt: "desc" }, take: 30 },
        adReports: { orderBy: { weekStart: "desc" }, take: 8 },
        healthLogs: { orderBy: { createdAt: "desc" }, take: 12 },
        tasks: { orderBy: { createdAt: "desc" } },
        invoices: { orderBy: { dueDate: "desc" }, take: 12 },
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
