// ============================================================
// API: CLIENT HEALTH BOARD
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { computeClientHealth, recomputeAllClients } = require("../lib/statusEngine");

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/clients — all clients with current health (optional ?workspace=agency|saas)
router.get("/", async (req, res) => {
  try {
    const workspace = (req.query.workspace || "agency").toString();
    const where = { status: "active" };
    if (workspace === "agency" || workspace === "saas") where.workspace = workspace;
    const clients = await prisma.client.findMany({
      where,
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
    if (body.description != null) data.description = body.description;
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

// GET /api/clients/:clientId/reports/latest — most recent daily + weekly
router.get("/:clientId/reports/latest", async (req, res) => {
  try {
    const clientId = String(req.params.clientId || "").trim();
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    const [daily, weekly] = await Promise.all([
      prisma.dailyReport.findFirst({
        where: { clientId, type: "daily" },
        orderBy: { date: "desc" },
      }),
      prisma.dailyReport.findFirst({
        where: { clientId, type: "weekly" },
        orderBy: { date: "desc" },
      }),
    ]);
    res.json({ daily: daily || null, weekly: weekly || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:clientId/reports — daily + weekly reports (query: ?type=daily|weekly&limit=30)
router.get("/:clientId/reports", async (req, res) => {
  try {
    const clientId = String(req.params.clientId || "").trim();
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    const { type, limit = "30" } = req.query;
    const where = { clientId };
    if (type === "daily" || type === "weekly") where.type = type;
    const take = Math.min(parseInt(limit, 10) || 30, 100);
    const reports = await prisma.dailyReport.findMany({
      where,
      orderBy: { date: "desc" },
      take,
    });
    res.json({ reports, total: reports.length });
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
        adCampaigns: { orderBy: { createdAt: "desc" } },
        metaConnection: true,
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

const ONBOARDING_TASKS = [
  { title: "Set up Meta Ads account", type: "ads", priority: "high" },
  { title: "Audit Google Business Profile", type: "task", priority: "high" },
  { title: "Create content calendar", type: "content", priority: "high" },
  { title: "Set up analytics tracking", type: "task", priority: "normal" },
  { title: "Competitor analysis", type: "task", priority: "normal", assignedTo: "research-intel" },
  { title: "Define target audience", type: "ads", priority: "high" },
  { title: "Collect brand assets", type: "content", priority: "normal" },
  { title: "Initial content batch (5 posts)", type: "content", priority: "high" },
];

// POST /api/clients — create new client + onboarding tasks
router.post("/", async (req, res) => {
  try {
    const client = await prisma.client.create({ data: req.body });
    for (const t of ONBOARDING_TASKS) {
      await prisma.task.create({
        data: {
          clientId: client.id,
          title: t.title,
          type: t.type,
          priority: t.priority,
          assignedTo: t.assignedTo ?? null,
          source: "onboarding",
        },
      });
    }
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
// ─── Content Strategy (AI-generated strategy docs) ─────────────────────
// GET /api/clients/:clientId/strategy — list all for client
router.get("/:clientId/strategy", async (req, res) => {
  try {
    const { clientId } = req.params;
    const list = await prisma.contentStrategy.findMany({
      where: { clientId },
      orderBy: [{ type: "asc" }, { version: "desc" }, { updatedAt: "desc" }],
    });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:clientId/strategy/:type — get latest by type
router.get("/:clientId/strategy/:type", async (req, res) => {
  try {
    const { clientId, type } = req.params;
    const doc = await prisma.contentStrategy.findFirst({
      where: { clientId, type },
      orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
    });
    if (!doc) return res.status(404).json({ error: "Not found" });
    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients/:clientId/strategy — create or update (version history)
router.post("/:clientId/strategy", async (req, res) => {
  try {
    const { clientId } = req.params;
    const { type, title, data } = req.body;
    if (!type || !title) {
      return res.status(400).json({ error: "type and title required" });
    }
    const last = await prisma.contentStrategy.findFirst({
      where: { clientId, type },
      orderBy: { version: "desc" },
    });
    const version = (last?.version ?? 0) + 1;
    const doc = await prisma.contentStrategy.create({
      data: {
        clientId,
        type: String(type),
        title: String(title),
        data: typeof data === "string" ? data : JSON.stringify(data ?? {}),
        version,
      },
    });
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:clientId/strategy/:id — delete by strategy id
router.delete("/:clientId/strategy/:id", async (req, res) => {
  try {
    const { clientId, id } = req.params;
    await prisma.contentStrategy.deleteMany({
      where: { id, clientId },
    });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/recompute", async (_req, res) => {
  try {
    const results = await recomputeAllClients();
    res.json({ message: "Recomputed", results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:clientId/2flyflow — 2FlyFlow metrics
router.get("/:clientId/2flyflow", async (req, res) => {
  try {
    const { clientId } = req.params;
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Content pipeline
    const allContent = await prisma.contentItem.findMany({ where: { clientId } });
    const contentByStatus = { requested: 0, in_progress: 0, pending_approval: 0, approved: 0, scheduled: 0, posted: 0 };
    const statusMap = { draft: "requested", idea: "requested", review: "pending_approval", approved: "approved", scheduled: "scheduled", published: "posted" };
    for (const c of allContent) {
      const mapped = statusMap[c.status] || "requested";
      contentByStatus[mapped] = (contentByStatus[mapped] || 0) + 1;
    }

    // Tasks
    const allTasks = await prisma.task.findMany({ where: { clientId } });
    const tasksThisWeek = allTasks.filter(t => new Date(t.createdAt) >= weekAgo);
    const completedThisWeek = allTasks.filter(t => t.status === "completed" && t.completedAt && new Date(t.completedAt) >= weekAgo);
    const overdue = allTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed");

    // Avg completion time
    const completedWithTime = allTasks.filter(t => t.status === "completed" && t.completedAt);
    let avgCompletionHours = 0;
    if (completedWithTime.length > 0) {
      const totalMs = completedWithTime.reduce((sum, t) => sum + (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()), 0);
      avgCompletionHours = Math.round(totalMs / completedWithTime.length / 3600000);
    }

    // Team workload
    const teamLoad = {};
    for (const t of allTasks.filter(t => t.assignedTo && t.status !== "completed")) {
      teamLoad[t.assignedTo] = (teamLoad[t.assignedTo] || 0) + 1;
    }

    // Bottlenecks
    const bottlenecks = [];
    // Stuck tasks by owner
    const stuckByOwner = {};
    for (const t of allTasks.filter(t => t.status === "pending" && new Date(t.createdAt) < dayAgo && t.assignedTo)) {
      stuckByOwner[t.assignedTo] = (stuckByOwner[t.assignedTo] || 0) + 1;
    }
    for (const [owner, count] of Object.entries(stuckByOwner)) {
      if (count >= 1) bottlenecks.push({ type: "blocked", message: `Blocked at ${owner} (${count} tasks, >24h)` });
    }
    // Pending approval
    const pendingApproval = allTasks.filter(t => t.status === "review" || contentByStatus.pending_approval > 2);
    if (contentByStatus.pending_approval > 2) bottlenecks.push({ type: "approval", message: `Waiting client approval (${contentByStatus.pending_approval} items)` });
    // Overloaded
    for (const [person, count] of Object.entries(teamLoad)) {
      if (count > 5) bottlenecks.push({ type: "overload", message: `${person} overloaded (${count} active tasks)` });
    }

    // Client activity
    const requestsThisWeek = tasksThisWeek.length;
    const approvalTasks = allTasks.filter(t => t.status === "approved" && t.updatedAt);
    let avgApprovalDelay = 0;
    if (approvalTasks.length > 0) {
      const totalDelay = approvalTasks.reduce((sum, t) => sum + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime()), 0);
      avgApprovalDelay = Math.round(totalDelay / approvalTasks.length / 3600000);
    }

    // Client Requests (from ClientRequest model)
    const allRequests = await prisma.clientRequest.findMany({ where: { clientId } });
    const requestsThisWeekList = allRequests.filter(r => new Date(r.createdAt) >= weekAgo);
    const requestsByStatus = { new: 0, acknowledged: 0, in_progress: 0, review: 0, completed: 0, closed: 0 };
    for (const r of allRequests) {
      requestsByStatus[r.status] = (requestsByStatus[r.status] || 0) + 1;
    }
    const activeRequests = allRequests.filter(r => !["completed", "closed"].includes(r.status));
    const recentRequests = allRequests
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(r => ({ id: r.id, title: r.title, type: r.type, status: r.status, priority: r.priority, assignedTo: r.assignedTo, createdAt: r.createdAt, slaBreach: r.slaBreach }));

    // Delivery gap reasons
    const deliveryGapReasons = [];
    const postsPlanned = tasksThisWeek.filter(t => t.type?.includes("instagram") || t.type?.includes("post")).length;
    const postsDelivered = completedThisWeek.filter(t => t.type?.includes("instagram") || t.type?.includes("post")).length;
    if (postsPlanned > postsDelivered) {
      const inProgressContent = allTasks.filter(t => t.status === "in_progress" && (t.type?.includes("instagram") || t.type?.includes("post")));
      const pendingContent = allTasks.filter(t => t.status === "pending" && (t.type?.includes("instagram") || t.type?.includes("post")));
      const reviewContent = allTasks.filter(t => t.status === "review" && (t.type?.includes("instagram") || t.type?.includes("post")));
      if (inProgressContent.length > 0) deliveryGapReasons.push(`${inProgressContent.length} stuck in production`);
      if (reviewContent.length > 0 || contentByStatus.pending_approval > 0) deliveryGapReasons.push(`${reviewContent.length + contentByStatus.pending_approval} waiting approval`);
      if (pendingContent.length > 0) deliveryGapReasons.push(`${pendingContent.length} not started`);
      if (deliveryGapReasons.length === 0) deliveryGapReasons.push("No content ready");
    }

    // Owner load — real names only
    const ownerLoad = {};
    const knownTeam = ["Milena", "Guilherme", "Igor", "Bruno"];
    for (const t of allTasks.filter(t => t.assignedTo && t.status !== "completed")) {
      const owner = t.assignedTo;
      if (!ownerLoad[owner]) ownerLoad[owner] = { active: 0, overloaded: false };
      ownerLoad[owner].active++;
    }
    for (const [owner, data] of Object.entries(ownerLoad)) {
      data.overloaded = data.active > 5;
    }

    // Requests quality
    const openThisWeek = tasksThisWeek.filter(t => t.status !== "completed").length;
    const completedThisWeekCount = tasksThisWeek.filter(t => t.status === "completed").length;
    const withDeliverable = tasksThisWeek.filter(t => t.status === "completed" && (t.type?.includes("instagram") || t.type?.includes("post") || t.type?.includes("design"))).length;

    res.json({
      client_requests: {
        by_status: requestsByStatus,
        active_count: activeRequests.length,
        this_week: requestsThisWeekList.length,
        sla_breaches: allRequests.filter(r => r.slaBreach).length,
        recent: recentRequests,
      },
      content: contentByStatus,
      delivery: {
        posts_planned_this_week: postsPlanned,
        posts_delivered_this_week: postsDelivered,
        overdue_items: overdue.length,
        avg_completion_hours: avgCompletionHours,
        gap_reasons: deliveryGapReasons,
      },
      bottlenecks: bottlenecks.slice(0, 3),
      team: teamLoad,
      owner_load: ownerLoad,
      client_activity: {
        new_requests_this_week: requestsThisWeek,
        avg_approval_delay_hours: avgApprovalDelay,
      },
      requests_quality: {
        open: openThisWeek,
        completed: completedThisWeekCount,
        turned_into_deliverables: withDeliverable,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/agency/2flyflow-overview — Agency-wide 2FlyFlow metrics
router.get("/agency/2flyflow-overview", async (req, res) => {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const clients = await prisma.client.findMany({ where: { status: "active", workspace: "agency" } });
    const allTasks = await prisma.task.findMany();
    const tasksThisWeek = allTasks.filter(t => new Date(t.createdAt) >= weekAgo);
    const completedThisWeek = allTasks.filter(t => t.status === "completed" && t.completedAt && new Date(t.completedAt) >= weekAgo);

    // Problems
    const problems = [];
    for (const client of clients) {
      const clientTasks = allTasks.filter(t => t.clientId === client.id);
      const overdue = clientTasks.filter(t => t.dueDate && new Date(t.dueDate) < now && t.status !== "completed");
      if (overdue.length > 0) problems.push({ type: "delayed", message: `${client.name}: ${overdue.length} overdue tasks`, clientId: client.id });
      const stuck = clientTasks.filter(t => t.status === "pending" && new Date(t.createdAt) < dayAgo);
      if (stuck.length >= 3) problems.push({ type: "stuck", message: `${client.name}: ${stuck.length} tasks stuck >24h`, clientId: client.id });
    }

    // Team load
    const teamLoad = {};
    for (const t of allTasks.filter(t => t.assignedTo && t.status !== "completed")) {
      teamLoad[t.assignedTo] = (teamLoad[t.assignedTo] || 0) + 1;
    }
    for (const [person, count] of Object.entries(teamLoad)) {
      if (count > 8) problems.push({ type: "overload", message: `${person} overloaded (${count} active tasks)` });
    }

    // Avg completion
    const completedWithTime = completedThisWeek.filter(t => t.completedAt);
    let avgHours = 0;
    if (completedWithTime.length > 0) {
      const totalMs = completedWithTime.reduce((sum, t) => sum + (new Date(t.completedAt).getTime() - new Date(t.createdAt).getTime()), 0);
      avgHours = Math.round(totalMs / completedWithTime.length / 3600000);
    }

    res.json({
      problems: problems.slice(0, 5),
      throughput: {
        tasks_created_this_week: tasksThisWeek.length,
        tasks_completed_this_week: completedThisWeek.length,
        avg_completion_hours: avgHours,
      },
      team: teamLoad,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
