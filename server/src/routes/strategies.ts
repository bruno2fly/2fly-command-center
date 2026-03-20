/**
 * Client Strategy API
 * GET    /api/strategies/:clientId       — list all strategies for a client
 * GET    /api/strategies/:clientId/:id   — get single strategy
 * POST   /api/strategies/:clientId       — create new strategy
 * PATCH  /api/strategies/:clientId/:id   — partial update
 * DELETE /api/strategies/:clientId/:id   — delete strategy
 */

const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

// List all strategies for a client (ordered by month desc)
router.get("/:clientId", async (req: any, res: any) => {
  try {
    const strategies = await prisma.clientStrategy.findMany({
      where: { clientId: req.params.clientId },
      orderBy: { month: "desc" },
    });
    res.json(strategies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get single strategy
router.get("/:clientId/:id", async (req: any, res: any) => {
  try {
    const strategy = await prisma.clientStrategy.findFirst({
      where: { id: req.params.id, clientId: req.params.clientId },
    });
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });
    res.json(strategy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new strategy
router.post("/:clientId", async (req: any, res: any) => {
  try {
    const { month, title, status, summary, diagnosis, goals, actions, campaigns, notes } = req.body;
    const strategy = await prisma.clientStrategy.create({
      data: {
        clientId: req.params.clientId,
        month,
        title,
        status: status || "draft",
        summary: summary || null,
        diagnosis: diagnosis ? (typeof diagnosis === "string" ? diagnosis : JSON.stringify(diagnosis)) : null,
        goals: goals ? (typeof goals === "string" ? goals : JSON.stringify(goals)) : null,
        actions: actions ? (typeof actions === "string" ? actions : JSON.stringify(actions)) : null,
        campaigns: campaigns ? (typeof campaigns === "string" ? campaigns : JSON.stringify(campaigns)) : null,
        notes: notes || null,
      },
    });
    res.status(201).json(strategy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Partial update
router.patch("/:clientId/:id", async (req: any, res: any) => {
  try {
    const { month, title, status, summary, diagnosis, goals, actions, campaigns, notes } = req.body;
    const data: Record<string, any> = {};
    if (month !== undefined) data.month = month;
    if (title !== undefined) data.title = title;
    if (status !== undefined) data.status = status;
    if (summary !== undefined) data.summary = summary;
    if (diagnosis !== undefined) data.diagnosis = typeof diagnosis === "string" ? diagnosis : JSON.stringify(diagnosis);
    if (goals !== undefined) data.goals = typeof goals === "string" ? goals : JSON.stringify(goals);
    if (actions !== undefined) data.actions = typeof actions === "string" ? actions : JSON.stringify(actions);
    if (campaigns !== undefined) data.campaigns = typeof campaigns === "string" ? campaigns : JSON.stringify(campaigns);
    if (notes !== undefined) data.notes = notes;

    const strategy = await prisma.clientStrategy.update({
      where: { id: req.params.id },
      data,
    });
    res.json(strategy);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Execute action via agent
router.post("/:clientId/:id/execute", async (req: any, res: any) => {
  try {
    const { actionIndex, agentId } = req.body;
    const strategy = await prisma.clientStrategy.findFirst({
      where: { id: req.params.id, clientId: req.params.clientId },
      include: { client: { select: { name: true } } },
    });
    if (!strategy) return res.status(404).json({ error: "Strategy not found" });

    const actions = JSON.parse(strategy.actions || "[]");
    const action = actions[actionIndex];
    if (!action) return res.status(400).json({ error: "Action not found" });

    // Build message for the agent
    const message = `[STRATEGY ACTION] Client: ${(strategy as any).client.name}\n\nAction: ${action.action}\n\nDetail: ${action.detail || "N/A"}\n\nSteps:\n${(action.steps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}\n\nPlease execute this action and report back when done.`;

    // Try to send to agent via OpenClaw
    try {
      const { sendToAgent } = require("../lib/openclawClient");
      await sendToAgent(agentId, message, [], `strategy-${strategy.id}`);
    } catch (err: any) {
      console.warn(`[STRATEGY] Could not reach agent ${agentId}:`, err.message);
    }

    res.json({ ok: true, message: `Sent to ${agentId}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete strategy
router.delete("/:clientId/:id", async (req: any, res: any) => {
  try {
    await prisma.clientStrategy.delete({
      where: { id: req.params.id },
    });
    res.status(204).end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
