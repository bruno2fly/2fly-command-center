// ============================================================
// Report generation engine — daily at 10 PM, weekly wrap on Friday
// ============================================================

async function generateDailyReport(prisma, clientId, date) {
  const dayStart = new Date(date + "T00:00:00.000Z");
  const dayEnd = new Date(date + "T23:59:59.999Z");

  const [contentCreatedCount, contentPublishedCount, tasksUpdated, requestsResolved, agentActions, adReportLatest] =
    await Promise.all([
      prisma.contentItem.count({
        where: { clientId, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.contentItem.count({
        where: {
          clientId,
          status: "published",
          OR: [
            { publishedDate: { gte: dayStart, lte: dayEnd } },
            { updatedAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
      }),
      prisma.task.findMany({
        where: { clientId, updatedAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.clientRequest.count({
        where: {
          clientId,
          status: { in: ["completed", "closed"] },
          OR: [
            { resolvedAt: { gte: dayStart, lte: dayEnd } },
            { updatedAt: { gte: dayStart, lte: dayEnd } },
          ],
        },
      }),
      prisma.agentAction.findMany({
        where: { clientId, createdAt: { gte: dayStart, lte: dayEnd } },
      }),
      prisma.adReport.findFirst({
        where: { clientId },
        orderBy: { weekStart: "desc" },
      }),
    ]);

  const tasksStarted = tasksUpdated.filter((t) => t.status === "in_progress").length;
  const tasksCompleted = tasksUpdated.filter((t) => t.status === "completed").length;
  const actionsProposed = agentActions.length;
  const actionsExecuted = agentActions.filter((a) => a.status === "completed" && a.completedAt >= dayStart && a.completedAt <= dayEnd).length;

  const parts = [];
  if (contentCreatedCount > 0) parts.push(`${contentCreatedCount} content item(s) created`);
  if (contentPublishedCount > 0) parts.push(`${contentPublishedCount} content published`);
  if (tasksStarted > 0) parts.push(`${tasksStarted} task(s) started`);
  if (tasksCompleted > 0) parts.push(`${tasksCompleted} task(s) completed`);
  if (requestsResolved > 0) parts.push(`${requestsResolved} request(s) resolved`);
  if (actionsProposed > 0) parts.push(`${actionsProposed} agent action(s) proposed`);
  if (actionsExecuted > 0) parts.push(`${actionsExecuted} agent action(s) executed`);
  if (adReportLatest && (adReportLatest.spend > 0 || adReportLatest.conversions > 0)) {
    parts.push(`$${(adReportLatest.spend || 0).toFixed(2)} ad spend, ${adReportLatest.conversions || 0} leads`);
  }

  const summary = parts.length > 0 ? parts.join(", ") : "No activity recorded";

  const adSpend = adReportLatest?.spend ?? null;
  const adLeads = adReportLatest?.conversions ?? null;
  const adCPL = adReportLatest?.cpa ?? null;
  const adCTR = adReportLatest?.ctr != null ? adReportLatest.ctr * 100 : null;
  const adImpressions = adReportLatest?.impressions ?? null;
  const adClicks = adReportLatest?.clicks ?? null;

  const data = {
    clientId,
    date,
    type: "daily",
    weekStart: null,
    weekEnd: null,
    contentCreated: contentCreatedCount,
    contentPublished: contentPublishedCount,
    tasksStarted,
    tasksCompleted,
    requestsHandled: requestsResolved,
    agentActionsProposed: actionsProposed,
    agentActionsExecuted: actionsExecuted,
    adSpend,
    adLeads,
    adCPL,
    adCTR,
    adImpressions,
    adClicks,
    summary,
    highlights: null,
  };

  return prisma.dailyReport.upsert({
    where: {
      clientId_date_type: { clientId, date, type: "daily" },
    },
    create: data,
    update: data,
  });
}

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff));
}

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

async function generateWeeklyWrap(prisma, clientId, weekStart, weekEnd) {
  const dailies = await prisma.dailyReport.findMany({
    where: { clientId, type: "daily", date: { gte: weekStart, lte: weekEnd } },
  });

  const totals = dailies.reduce(
    (acc, d) => ({
      contentCreated: acc.contentCreated + (d.contentCreated || 0),
      contentPublished: acc.contentPublished + (d.contentPublished || 0),
      tasksStarted: acc.tasksStarted + (d.tasksStarted || 0),
      tasksCompleted: acc.tasksCompleted + (d.tasksCompleted || 0),
      requestsHandled: acc.requestsHandled + (d.requestsHandled || 0),
      agentActionsProposed: acc.agentActionsProposed + (d.agentActionsProposed || 0),
      agentActionsExecuted: acc.agentActionsExecuted + (d.agentActionsExecuted || 0),
      adSpend: acc.adSpend + (d.adSpend || 0),
      adLeads: acc.adLeads + (d.adLeads || 0),
    }),
    {
      contentCreated: 0,
      contentPublished: 0,
      tasksStarted: 0,
      tasksCompleted: 0,
      requestsHandled: 0,
      agentActionsProposed: 0,
      agentActionsExecuted: 0,
      adSpend: 0,
      adLeads: 0,
    }
  );

  const parts = [];
  if (totals.contentCreated > 0) parts.push(`${totals.contentCreated} content item(s)`);
  if (totals.contentPublished > 0) parts.push(`${totals.contentPublished} published`);
  if (totals.tasksCompleted > 0) parts.push(`${totals.tasksCompleted} tasks completed`);
  if (totals.requestsHandled > 0) parts.push(`${totals.requestsHandled} requests handled`);
  if (totals.adSpend > 0) parts.push(`$${totals.adSpend.toFixed(2)} total ad spend, ${totals.adLeads} leads`);
  if (totals.agentActionsExecuted > 0) parts.push(`${totals.agentActionsExecuted} agent actions executed`);

  const summary =
    `Week of ${weekStart} to ${weekEnd}: ` + (parts.length > 0 ? parts.join(", ") : "No activity");

  const adCPL = totals.adLeads > 0 ? totals.adSpend / totals.adLeads : null;
  const adCTR = null;

  const data = {
      clientId,
      date: weekEnd,
      type: "weekly",
      weekStart,
      weekEnd,
      contentCreated: totals.contentCreated,
      contentPublished: totals.contentPublished,
      tasksStarted: totals.tasksStarted,
      tasksCompleted: totals.tasksCompleted,
      requestsHandled: totals.requestsHandled,
      agentActionsProposed: totals.agentActionsProposed,
      agentActionsExecuted: totals.agentActionsExecuted,
      adSpend: totals.adSpend > 0 ? totals.adSpend : null,
      adLeads: totals.adLeads > 0 ? totals.adLeads : null,
      adCPL,
      adCTR,
      adImpressions: null,
      adClicks: null,
      summary,
      highlights: null,
    };

  return prisma.dailyReport.upsert({
    where: {
      clientId_date_type: { clientId, date: weekEnd, type: "weekly" },
    },
    create: data,
    update: data,
  });
}

module.exports = { generateDailyReport, generateWeeklyWrap, getMonday, addDays };
