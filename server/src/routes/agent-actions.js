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

// POST /api/agent-actions/:id/execute — approve and run via Meta Ads Engine
router.post("/:id/execute", async (req, res) => {
  const metaEngine = require("../lib/metaAdsEngine");
  
  try {
    const action = await prisma.agentAction.findUnique({
      where: { id: req.params.id },
    });
    if (!action) return res.status(404).json({ error: "Agent action not found" });
    if (action.status !== "pending") {
      return res.json(action);
    }

    // Mark as approved
    await prisma.agentAction.update({
      where: { id: req.params.id },
      data: { status: "approved", approvedAt: new Date() },
    });

    // Mark as executing
    await prisma.agentAction.update({
      where: { id: req.params.id },
      data: { status: "executing", executedAt: new Date() },
    });

    // Execute via Meta Ads Engine
    console.log(`🔧 Executing agent action: ${action.title}`);
    const execution = await metaEngine.smartExecute(action);
    
    // Build result summary
    const resultLines = [];
    resultLines.push(`## Execution Report`);
    resultLines.push(`**${action.title}**\n`);
    
    if (execution.results.length > 0) {
      resultLines.push(`### ✅ Completed Steps (${execution.succeeded}/${execution.totalSteps})`);
      for (const r of execution.results) {
        resultLines.push(`- **${r.action || r.op}**: ${r.detail}`);
        if (r.note) resultLines.push(`  > 📝 ${r.note}`);
        if (r.oldBudget && r.newBudget) resultLines.push(`  > Budget: ${r.oldBudget} → ${r.newBudget}`);
        if (r.campaignId && r.action !== 'audit') resultLines.push(`  > Campaign ID: ${r.campaignId}`);
      }
    }
    
    if (execution.errors.length > 0) {
      resultLines.push(`\n### ❌ Failed Steps (${execution.failed})`);
      for (const e of execution.errors) {
        resultLines.push(`- Step ${e.step} (${e.op}): ${e.error}`);
      }
    }
    
    const finalStatus = execution.errors.length > 0 && execution.results.length === 0 ? 'failed' : 'completed';
    const resultSummary = resultLines.join('\n');
    
    const updated = await prisma.agentAction.update({
      where: { id: req.params.id },
      data: {
        status: finalStatus,
        result: resultSummary,
        errorMessage: execution.errors.length > 0 ? execution.errors.map(e => e.error).join('; ') : null,
        completedAt: new Date(),
      },
    });
    
    console.log(`✅ Action ${finalStatus}: ${execution.succeeded} succeeded, ${execution.failed} failed`);
    res.json(updated);
  } catch (err) {
    console.error(`❌ Action execution error: ${err.message}`);
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
