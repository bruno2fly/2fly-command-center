// ============================================================
// API: AGENT ACTIONS (propose → approve → execute → completed)
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/agent-actions — list with filters
router.get("/", async (req, res) => {
  try {
    const { status, clientId, agentId, category } = req.query;
    const where = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    if (agentId) where.agentId = agentId;
    if (category) where.category = category;
    const actions = await prisma.agentAction.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    res.json({ actions, total: actions.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agent-actions/completed — must be before /:id
router.delete("/completed", async (req, res) => {
  try {
    const result = await prisma.agentAction.deleteMany({
      where: { status: "completed" },
    });
    res.json({ deleted: result.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agent-actions/:id
router.get("/:id", async (req, res) => {
  try {
    const action = await prisma.agentAction.findUnique({
      where: { id: req.params.id },
    });
    if (!action) return res.status(404).json({ error: "Agent action not found" });
    res.json(action);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agent-actions — create (called by agents)
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const action = await prisma.agentAction.create({
      data: {
        clientId: body.clientId ?? null,
        clientName: body.clientName ?? null,
        agentId: body.agentId ?? "meta-traffic",
        agentName: body.agentName ?? "Meta Traffic",
        category: body.category ?? "ads",
        title: body.title ?? "Action",
        reasoning: body.reasoning ?? "",
        proposedAction: body.proposedAction ?? "",
        executionPlan: body.executionPlan ?? null,
        priority: body.priority ?? "normal",
      },
    });
    res.status(201).json(action);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/agent-actions/:id
router.patch("/:id", async (req, res) => {
  try {
    const { status, result, errorMessage } = req.body || {};
    const data = {};
    if (status) {
      data.status = status;
      if (status === "approved") data.approvedAt = new Date();
      if (status === "completed" || status === "failed") data.completedAt = new Date();
    }
    if (result != null) data.result = result;
    if (errorMessage != null) data.errorMessage = errorMessage;
    const action = await prisma.agentAction.update({
      where: { id: req.params.id },
      data,
    });
    res.json(action);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/agent-actions/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.agentAction.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/agent-actions/:id/execute — approve and run
router.post("/:id/execute", async (req, res) => {
  try {
    const action = await prisma.agentAction.findUnique({
      where: { id: req.params.id },
    });
    if (!action) return res.status(404).json({ error: "Agent action not found" });
    if (action.status !== "pending") {
      return res.json(action);
    }

    await prisma.agentAction.update({
      where: { id: req.params.id },
      data: { status: "approved", approvedAt: new Date() },
    });

    await prisma.agentAction.update({
      where: { id: req.params.id },
      data: { status: "executing", executedAt: new Date() },
    });

    // Placeholder: simulate execution 2–3 seconds
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 1000));

    const resultSummary = `Executed: ${action.title}. (Placeholder — real Meta API integration coming soon.)`;
    const updated = await prisma.agentAction.update({
      where: { id: req.params.id },
      data: {
        status: "completed",
        result: resultSummary,
        completedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (err) {
    await prisma.agentAction.update({
      where: { id: req.params.id },
      data: {
        status: "failed",
        errorMessage: err.message,
        completedAt: new Date(),
      },
    }).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
