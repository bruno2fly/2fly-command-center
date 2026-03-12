// ============================================================
// API: CLIENT HEALTH BOARD
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { computeClientHealth, recomputeAllClients } = require("../lib/statusEngine");

const router = express.Router();
const prisma = new PrismaClient();

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function formatWeekStart(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

async function buildWeeklyReports(prisma, clientId, weeksBack) {
  const now = new Date();
  const reports = [];
  let prevAds = null;

  for (let i = 0; i < weeksBack; i++) {
    const baseMonday = getMonday(now);
    const weekStartDate = addDays(baseMonday, -7 * i);
    const weekEndDate = addDays(weekStartDate, 6);
    const weekStart = formatWeekStart(weekStartDate);
    const weekEnd = formatWeekStart(weekEndDate);
    const weekStartUtc = new Date(weekStartDate);
    weekStartUtc.setUTCHours(0, 0, 0, 0);
    const weekEndUtc = new Date(weekEndDate);
    weekEndUtc.setUTCHours(23, 59, 59, 999);

    const [adRows, agentActions, actionLogs] = await Promise.all([
      prisma.adReport.findMany({
        where: { clientId, weekStart: { gte: weekStartUtc, lte: weekEndUtc } },
      }),
      prisma.agentAction.findMany({
        where: {
          clientId,
          status: "completed",
          completedAt: { gte: weekStartUtc, lte: weekEndUtc },
        },
      }),
      prisma.adActionLog.findMany({
        where: {
          clientId,
          createdAt: { gte: weekStartUtc, lte: weekEndUtc },
        },
      }),
    ]);

    let spend = 0,
      impressions = 0,
      clicks = 0,
      leads = 0,
      topCampaign = null;
    for (const r of adRows) {
      spend += r.spend ?? 0;
      impressions += r.impressions ?? 0;
      clicks += r.clicks ?? 0;
      leads += r.conversions ?? 0;
      if (r.topCampaign && !topCampaign) topCampaign = r.topCampaign;
    }
    const cpl = leads > 0 ? spend / leads : 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

    const ads = {
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      leads,
      cpl: Math.round(cpl * 100) / 100,
      ctr: Math.round(ctr * 100) / 100,
      topCampaign: topCampaign || null,
    };

    const agentActionsList = agentActions.map((a) => ({
      title: a.title,
      status: a.status,
      result: a.result || null,
    }));

    const actionOutcomes = actionLogs.map((l) => ({
      actionType: l.actionType,
      outcome: l.outcome || "pending",
      detail: l.actionDetail || l.notes || "",
    }));

    let spendChange = null,
      cplChange = null,
      leadsChange = null,
      ctrChange = null;
    if (prevAds) {
      if (prevAds.spend > 0) spendChange = ((ads.spend - prevAds.spend) / prevAds.spend) * 100;
      if (prevAds.cpl > 0) cplChange = ((prevAds.cpl - ads.cpl) / prevAds.cpl) * 100;
      if (prevAds.leads > 0) leadsChange = ((ads.leads - prevAds.leads) / prevAds.leads) * 100;
      if (prevAds.ctr > 0) ctrChange = ((ads.ctr - prevAds.ctr) / prevAds.ctr) * 100;
    }
    prevAds = { ...ads };

    const trends = {
      spendChange: spendChange != null ? (spendChange >= 0 ? "+" : "") + spendChange.toFixed(1) + "%" : null,
      cplChange: cplChange != null ? (cplChange >= 0 ? "+" : "") + cplChange.toFixed(1) + "%" : null,
      leadsChange: leadsChange != null ? (leadsChange >= 0 ? "+" : "") + leadsChange.toFixed(1) + "%" : null,
      ctrChange: ctrChange != null ? (ctrChange >= 0 ? "+" : "") + ctrChange.toFixed(1) + "%" : null,
    };

    const summary = buildWeeklySummary(ads, trends, agentActionsList, actionOutcomes);

    reports.push({
      weekStart,
      weekEnd,
      ads,
      agentActions: agentActionsList,
      actionOutcomes,
      trends,
      summary,
    });
  }

  return reports;
}

function buildWeeklySummary(ads, trends, agentActions, actionOutcomes) {
  const parts = [];
  if (trends.cplChange) {
    const cplNum = parseFloat(trends.cplChange);
    if (cplNum < 0) parts.push(`CPL decreased ${Math.abs(cplNum).toFixed(1)}%`);
    else if (cplNum > 0) parts.push(`CPL increased ${cplNum.toFixed(1)}%`);
  }
  if (trends.leadsChange) {
    const leadNum = parseFloat(trends.leadsChange);
    if (leadNum > 0) parts.push(`lead volume up ${leadNum.toFixed(0)}%`);
    else if (leadNum < 0) parts.push(`lead volume down ${Math.abs(leadNum).toFixed(0)}%`);
  }
  if (parts.length > 0) parts[0] = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
  if (agentActions.length > 0) {
    const completed = agentActions.filter((a) => a.status === "completed").length;
    if (completed > 0) parts.push(`${completed} agent action(s) completed this week`);
  }
  if (actionOutcomes.length > 0) {
    const improved = actionOutcomes.filter((o) => o.outcome === "improved").length;
    if (improved > 0) parts.push(`${improved} action(s) showed improvement`);
  }
  if (parts.length === 0) return "No significant change this week.";
  let text = parts.join(". ");
  if (ads.spend > 0) text += " Recommend reviewing top campaign performance.";
  return text;
}

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
    if (body.status != null) {
      data.status = body.status;
      if (body.status === "completed") data.completedAt = new Date();
    }
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

// GET /api/clients/:clientId/actions — unified actionable items for this client only (no limit)
router.get("/:clientId/actions", async (req, res) => {
  try {
    const clientId = String(req.params.clientId || "").trim();
    if (!clientId) {
      return res.status(400).json({ error: "clientId required" });
    }
    const now = new Date();
    const actions = [];
    const whereClient = { clientId };

    const [tasks, contentItems, requests, agentActions] = await Promise.all([
      prisma.task.findMany({
        where: { ...whereClient, status: { in: ["pending", "in_progress"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.contentItem.findMany({
        where: { ...whereClient, status: { in: ["draft", "review"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientRequest.findMany({
        where: { ...whereClient, status: { in: ["new", "acknowledged", "in_progress", "waiting_client", "review"] } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.agentAction.findMany({
        where: { ...whereClient, status: "pending" },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    for (const t of tasks) {
      const dueDate = t.dueDate ? t.dueDate.toISOString() : null;
      const isOverdue = dueDate && new Date(dueDate) < now;
      const isInProgress = t.status === "in_progress";
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
        availableActions: isInProgress ? ["complete", "skip"] : ["start", "skip"],
        taskStatus: t.status === "in_progress" ? "in_progress" : "pending",
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
    for (const a of agentActions) {
      actions.push({
        id: `agent_action-${a.id}`,
        entityType: "agent_action",
        entityId: a.id,
        title: a.title,
        description: a.reasoning || null,
        priority: a.priority || "normal",
        source: "agent",
        sourceName: a.agentName || "Agent",
        dueDate: null,
        isOverdue: false,
        createdAt: a.createdAt.toISOString(),
        availableActions: ["execute", "reject", "skip"],
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

// GET /api/clients/:clientId/reports/latest — most recent week only
router.get("/:clientId/reports/latest", async (req, res) => {
  try {
    const clientId = String(req.params.clientId || "").trim();
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    const reports = await buildWeeklyReports(prisma, clientId, 1);
    const report = reports[0] || null;
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:clientId/reports — last 8 weeks
router.get("/:clientId/reports", async (req, res) => {
  try {
    const clientId = String(req.params.clientId || "").trim();
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    const reports = await buildWeeklyReports(prisma, clientId, 8);
    res.json({ reports });
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

    const [health, pendingAgentActionsCount] = await Promise.all([
      computeClientHealth(client.id),
      prisma.agentAction.count({ where: { clientId: client.id, status: "pending" } }),
    ]);
    res.json({ ...client, health, pendingAgentActionsCount });
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
