// ============================================================
// Today Dashboard — priority engine: what matters today
// ============================================================

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning, Bruno";
  if (hour < 17) return "Good afternoon, Bruno";
  return "Good evening, Bruno";
}

function getTargetCPL(client) {
  const name = (client.name || "").toLowerCase();
  if (name.includes("shape") || name.includes("ardan")) return 25;
  if (name.includes("crisp") || name.includes("casa") || name.includes("sudbury") || name.includes("cafe")) return 3;
  if (name.includes("fortuna")) return 50;
  return 20;
}

function getHealthReason(client) {
  if (client.healthStatus === "red") return "Health status RED — needs immediate review";
  if (client.healthStatus === "yellow") return "Health status YELLOW — monitor closely";
  return "Health OK";
}

function parsePlatforms(client) {
  try {
    const p = client.platforms;
    if (typeof p === "string") return JSON.parse(p) || [];
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

async function getTodayView(prisma) {
  const clients = await prisma.client.findMany({
    where: { status: "active" },
    include: {
      tasks: { where: { status: { in: ["pending", "in_progress"] } }, orderBy: { createdAt: "desc" } },
      contentItems: { orderBy: { createdAt: "desc" }, take: 5 },
      adReports: { orderBy: { weekStart: "desc" }, take: 1 },
    },
  });

  const clientIds = clients.map((c) => c.id);
  const agentActions = await prisma.agentAction.findMany({
    where: {
      clientId: { in: clientIds },
      status: { in: ["pending", "proposed", "approved", "executing", "completed"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const actionsByClient = {};
  for (const a of agentActions) {
    if (!a.clientId) continue;
    if (!actionsByClient[a.clientId]) actionsByClient[a.clientId] = [];
    actionsByClient[a.clientId].push(a);
  }

  const critical = [];
  const attention = [];
  const agentsHandling = [];
  const yourTasks = [];
  const seenCritical = new Set();

  for (const client of clients) {
    const clientActions = actionsByClient[client.id] || [];
    const platforms = parsePlatforms(client);

    // ─── CRITICAL ───
    const nowMs = Date.now();
    const overdueTasks = client.tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate).getTime() < nowMs && t.status !== "completed"
    );
    if (overdueTasks.length > 0 && !seenCritical.has(client.id)) {
      seenCritical.add(client.id);
      critical.push({
        clientId: client.id,
        clientName: client.name,
        reason: `${overdueTasks.length} overdue task(s)`,
        action: overdueTasks[0].title,
        actionType: "task",
        actionId: overdueTasks[0].id,
      });
    }

    const urgentTasks = client.tasks.filter((t) => t.priority === "urgent");
    if (urgentTasks.length > 0 && !seenCritical.has(client.id)) {
      seenCritical.add(client.id);
      critical.push({
        clientId: client.id,
        clientName: client.name,
        reason: `${urgentTasks.length} urgent task(s) pending`,
        action: urgentTasks[0].title,
        actionType: "task",
        actionId: urgentTasks[0].id,
      });
    }

    if (client.healthStatus === "red" && !seenCritical.has(client.id)) {
      seenCritical.add(client.id);
      critical.push({
        clientId: client.id,
        clientName: client.name,
        reason: getHealthReason(client),
        action: "Review and fix health issues",
        actionType: "health",
      });
    }

    const adReport = client.adReports?.[0];
    if (adReport && client.adBudget > 0) {
      const leads = adReport.conversions || 0;
      const cpl = leads > 0 ? (adReport.spend || 0) / leads : (adReport.cpa || 0) || 0;
      const target = getTargetCPL(client);
      if (target > 0 && cpl > target * 3 && !seenCritical.has(client.id)) {
        seenCritical.add(client.id);
        critical.push({
          clientId: client.id,
          clientName: client.name,
          reason: `CPL $${cpl.toFixed(2)} — ${Math.round(cpl / target)}x above target ($${target})`,
          action: "Review campaign strategy",
          actionType: "ads",
        });
      }
    }

    // No ads but client has ad budget / is active — check meta connection
    const hasMeta = platforms.some((p) => String(p).toLowerCase().includes("meta") || String(p).toLowerCase().includes("instagram") || String(p).toLowerCase().includes("facebook"));
    if (hasMeta && client.adBudget > 0 && (!adReport || (adReport.spend === 0 && adReport.impressions === 0))) {
      const metaConn = await prisma.metaConnection.findUnique({ where: { clientId: client.id } }).catch(() => null);
      if (!metaConn && !seenCritical.has(client.id)) {
        seenCritical.add(client.id);
        critical.push({
          clientId: client.id,
          clientName: client.name,
          reason: "No ads running — Meta Ads not connected",
          action: "Set up Meta Ads account",
          actionType: "ads",
        });
      }
    }

    // ─── ATTENTION ───
    const latestContent = client.contentItems?.[0];
    if (latestContent) {
      const daysSince = Math.floor((Date.now() - new Date(latestContent.publishedDate || latestContent.createdAt).getTime()) / 86400000);
      if (daysSince >= 5) {
        attention.push({
          clientId: client.id,
          clientName: client.name,
          reason: `No content posted in ${daysSince} days`,
        });
      }
    } else if (platforms.some((p) => /instagram|facebook|meta/i.test(String(p)))) {
      attention.push({
        clientId: client.id,
        clientName: client.name,
        reason: "No content items in system",
      });
    }

    if (client.healthStatus === "yellow") {
      attention.push({
        clientId: client.id,
        clientName: client.name,
        reason: getHealthReason(client),
      });
    }

    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const dueSoonTasks = client.tasks.filter((t) => {
      if (!t.dueDate || t.status === "completed") return false;
      const dueMs = new Date(t.dueDate).getTime();
      return dueMs > nowMs && dueMs - nowMs <= twoDaysMs;
    });
    if (dueSoonTasks.length > 0) {
      attention.push({
        clientId: client.id,
        clientName: client.name,
        reason: `${dueSoonTasks.length} task(s) due within 2 days`,
      });
    }

    const staleTasks = client.tasks.filter((t) => {
      const age = (nowMs - new Date(t.createdAt).getTime()) / 86400000;
      return t.priority === "high" && t.status === "pending" && age >= 3;
    });
    if (staleTasks.length > 0) {
      attention.push({
        clientId: client.id,
        clientName: client.name,
        reason: `${staleTasks.length} high-priority task(s) pending 3+ days`,
      });
    }

    // Creative fatigue / CTR — high frequency + low CTR (ctr as decimal e.g. 0.02 = 2%)
    if (adReport && adReport.impressions > 0 && adReport.ctr != null) {
      const freq = adReport.impressions / Math.max(adReport.clicks || 1, 1);
      const ctrPct = adReport.ctr <= 1 ? adReport.ctr * 100 : adReport.ctr;
      if (freq >= 2.5 && adReport.ctr < 0.02) {
        attention.push({
          clientId: client.id,
          clientName: client.name,
          reason: `Creative fatigue: freq ${freq.toFixed(1)}, CTR ${ctrPct.toFixed(1)}%`,
        });
      }
    }

    // ─── PENDING AGENT ACTIONS (need Bruno's approval) ───
    const pendingActions = clientActions.filter(a => a.status === 'pending' || a.status === 'proposed');
    for (const a of pendingActions) {
      critical.push({
        clientId: client.id,
        clientName: client.name,
        reason: `🤖 Agent action needs approval: ${a.title}`,
        action: 'Review and approve/reject',
        actionType: 'agent_action',
        actionId: a.id,
        priority: a.priority,
      });
    }

    // ─── AGENTS HANDLING (approved/executing/completed) ───
    const activeActions = clientActions.filter(a => ['approved', 'executing', 'completed'].includes(a.status));
    for (const a of activeActions.slice(0, 3)) {
      agentsHandling.push({
        clientId: client.id,
        clientName: client.name,
        agentName: a.agentName || a.agentId,
        title: a.title,
        status: a.status,
      });
    }

    // ─── YOUR TASKS ───
    const brunoTasks = client.tasks.filter(
      (t) => !t.assignedTo || /bruno|founder/i.test(String(t.assignedTo))
    );
    for (const task of brunoTasks.slice(0, 3)) {
      const dueDate = task.dueDate ? task.dueDate.toISOString() : null;
      const isOverdue = dueDate && new Date(dueDate).getTime() < nowMs && task.status !== "completed";
      yourTasks.push({
        clientId: client.id,
        clientName: client.name,
        taskId: task.id,
        title: task.title,
        priority: task.priority,
        status: task.status,
        dueDate,
        isOverdue: !!isOverdue,
      });
    }
  }

  yourTasks.sort((a, b) => {
    const order = { urgent: 0, high: 1, normal: 2, low: 3 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  const mrr = clients.reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0);

  return {
    greeting: getGreeting(),
    date: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    stats: {
      activeClients: clients.length,
      mrr: Math.round(mrr),
      needsAttention: critical.length,
    },
    critical: critical.slice(0, 5),
    attention: attention.slice(0, 8),
    agentsHandling: agentsHandling.slice(0, 10),
    yourTasks: yourTasks.slice(0, 10),
  };
}

module.exports = { getTodayView, getGreeting, getTargetCPL, getHealthReason };
