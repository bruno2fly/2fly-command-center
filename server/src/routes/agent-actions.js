// ============================================================
// API: AGENT ACTIONS (propose → approve → execute → completed)
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

const AUTO_KEYWORDS = [
  "pause campaign",
  "resume campaign",
  "unpause",
  "update budget",
  "scale budget",
  "increase budget",
  "decrease budget",
  "change budget",
  "adjust budget",
  "duplicate ad set",
  "duplicate adset",
];

function detectExecutionType(title, proposedAction) {
  const text = `${title || ""} ${proposedAction || ""}`.toLowerCase();
  return AUTO_KEYWORDS.some((kw) => text.includes(kw)) ? "auto" : "manual";
}

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

// POST /api/agent-actions — create (called by agents or manual from Ads tab)
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const title = body.title ?? "Action";
    const proposedAction = body.proposedAction ?? "";
    const status = ["pending", "approved"].includes(body.status) ? body.status : "pending";
    const executionType = ["auto", "manual"].includes(body.executionType)
      ? body.executionType
      : detectExecutionType(title, proposedAction);
    // Auto-resolve clientName → clientId if clientId not provided
    let resolvedClientId = body.clientId ?? null;
    if (!resolvedClientId && body.clientName) {
      const allClients = await prisma.client.findMany({ select: { id: true, name: true } });
      const nameLower = body.clientName.toLowerCase();
      const match = allClients.find(c => c.name.toLowerCase() === nameLower)
        || allClients.find(c => nameLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nameLower));
      if (match) resolvedClientId = match.id;
    }
    const data = {
      clientId: resolvedClientId,
      clientName: body.clientName ?? null,
      agentId: body.agentId ?? "meta-traffic",
      agentName: body.agentName ?? "Meta Traffic",
      category: body.category ?? "ads",
      title,
      reasoning: body.reasoning ?? "",
      proposedAction,
      executionPlan: body.executionPlan ?? null,
      executionType,
      priority: body.priority ?? "normal",
      status,
    };
    if (status === "approved") data.approvedAt = new Date();
    const action = await prisma.agentAction.create({ data });
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

// POST /api/agent-actions/:id/convert-to-tasks — parse steps from proposedAction, create tasks, mark action completed
router.post("/:id/convert-to-tasks", async (req, res) => {
  try {
    const action = await prisma.agentAction.findUnique({
      where: { id: req.params.id },
    });
    if (!action) return res.status(404).json({ error: "Agent action not found" });
    if (action.status === "completed" || action.status === "rejected")
      return res.status(400).json({ error: "Action already closed" });

    let clientId = req.body?.clientId ?? action.clientId;
    if (!clientId && action.clientName) {
      const clients = await prisma.client.findMany({ select: { id: true, name: true } });
      const nameLower = action.clientName.toLowerCase();
      const client = clients.find((c) => c.name && c.name.toLowerCase().includes(nameLower) || nameLower.includes(c.name.toLowerCase()));
      if (client) clientId = client.id;
    }
    if (!clientId)
      return res.status(400).json({ error: "Could not resolve client. Provide clientId or ensure clientName matches a client." });

    const text = action.proposedAction || "";
    const steps = [];
    const numbered = text.split(/\n/).filter(Boolean);
    for (const line of numbered) {
      const match = line.match(/^\s*(?:\d+[.)]\s*)?(.+)$/);
      const title = match ? match[1].trim() : line.trim();
      if (title.length > 0) steps.push(title);
    }
    if (steps.length === 0) steps.push(action.title);

    for (const stepTitle of steps) {
      await prisma.task.create({
        data: {
          clientId,
          title: stepTitle,
          description: action.reasoning || undefined,
          type: action.category === "ads" ? "ads" : action.category === "content" ? "content" : "task",
          priority: action.priority || "normal",
          assignedTo: null,
          source: "agent",
          directiveId: null,
        },
      });
    }

    const result = `Converted to ${steps.length} task(s)`;
    await prisma.agentAction.update({
      where: { id: req.params.id },
      data: { status: "completed", result, completedAt: new Date() },
    });
    const updated = await prisma.agentAction.findUnique({ where: { id: req.params.id } });
    res.json({ action: updated, tasksCreated: steps.length });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/agent-actions/:id/execute — approve and run via Meta Ads Engine (auto only)
router.post("/:id/execute", async (req, res) => {
  const metaEngine = require("../lib/metaAdsEngine");
  
  try {
    const action = await prisma.agentAction.findUnique({
      where: { id: req.params.id },
    });
    if (!action) return res.status(404).json({ error: "Agent action not found" });
    if (action.executionType === "manual") {
      return res.status(400).json({
        error: "This is a manual recommendation. Use 'Create Tasks' or 'Mark Done' instead.",
      });
    }
    if (action.status !== "pending" && action.status !== "approved") {
      return res.json(action);
    }

    if (action.status === "pending") {
      await prisma.agentAction.update({
        where: { id: req.params.id },
        data: { status: "approved", approvedAt: new Date() },
      });
    }

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
