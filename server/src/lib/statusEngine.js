// ============================================================
// STATUS ENGINE — The brain of the Command Center
// ============================================================
// Determines green / yellow / red for every module and
// rolls them up into an overall client health score.
//
// DESIGN PRINCIPLE: red = needs action TODAY
//                   yellow = needs attention THIS WEEK
//                   green = on track
// ============================================================

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Thresholds (easy to tweak) ─────────────────────────────

const THRESHOLDS = {
  buffer: {
    green: 15,  // >= 15 days of scheduled content
    yellow: 7,  // 7-14 days
    // red: < 7 days
  },
  requests: {
    greenHours: 24,   // resolved within 24h
    yellowHours: 48,  // pending 24-48h
    // red: > 48h unresolved
  },
  ads: {
    greenPct: 1.0,    // ROAS >= 100% of target
    yellowPct: 0.8,   // ROAS 80-99% of target
    // red: < 80% of target
  },
};

// ─── Module 2: Content Buffer Status ────────────────────────

async function getBufferStatus(clientId) {
  const now = new Date();
  const scheduledCount = await prisma.contentItem.count({
    where: {
      clientId,
      status: "scheduled",
      scheduledDate: { gte: now },
    },
  });

  // Each scheduled item ≈ 1 day of buffer (simplification).
  // For more accuracy, count distinct scheduled dates.
  const distinctDays = await prisma.contentItem.groupBy({
    by: ["scheduledDate"],
    where: {
      clientId,
      status: "scheduled",
      scheduledDate: { gte: now },
    },
  });

  const bufferDays = distinctDays.length;

  let status = "red";
  if (bufferDays >= THRESHOLDS.buffer.green) status = "green";
  else if (bufferDays >= THRESHOLDS.buffer.yellow) status = "yellow";

  return { status, bufferDays, scheduledCount };
}

// ─── Module 3: Request Intake Status ────────────────────────

async function getRequestStatus(clientId) {
  const now = new Date();

  const openRequests = await prisma.clientRequest.findMany({
    where: {
      clientId,
      status: { notIn: ["completed", "closed"] },
    },
  });

  let worstStatus = "green";
  let overdueCount = 0;
  let pendingCount = openRequests.length;

  for (const req of openRequests) {
    const ageHours = (now - new Date(req.createdAt)) / (1000 * 60 * 60);

    if (ageHours > THRESHOLDS.requests.yellowHours) {
      worstStatus = "red";
      overdueCount++;
    } else if (ageHours > THRESHOLDS.requests.greenHours && worstStatus !== "red") {
      worstStatus = "yellow";
    }
  }

  // Also check for SLA breaches
  const breachedCount = openRequests.filter((r) => {
    if (!r.dueDate) return false;
    return now > new Date(r.dueDate);
  }).length;

  if (breachedCount > 0) worstStatus = "red";

  return { status: worstStatus, pendingCount, overdueCount, breachedCount };
}

// ─── Module 4: Ads Performance Status ───────────────────────

async function getAdsStatus(clientId) {
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return { status: "green", roas: 0, target: 0 };

  // Get the most recent week's report
  const latestReport = await prisma.adReport.findFirst({
    where: { clientId },
    orderBy: { weekStart: "desc" },
  });

  if (!latestReport) {
    return { status: "green", roas: 0, target: client.roasTarget, note: "No ad data yet" };
  }

  const ratio = latestReport.roas / client.roasTarget;

  let status = "red";
  if (ratio >= THRESHOLDS.ads.greenPct) status = "green";
  else if (ratio >= THRESHOLDS.ads.yellowPct) status = "yellow";

  return {
    status,
    roas: latestReport.roas,
    target: client.roasTarget,
    ratio: parseFloat(ratio.toFixed(2)),
    spend: latestReport.spend,
    revenue: latestReport.revenue,
  };
}

// ─── Module 1: Overall Client Health (roll-up) ──────────────
//
// Priority weighting:
//   red in ANY module → client is red
//   yellow in 2+ modules → client is red
//   yellow in 1 module → client is yellow
//   all green → client is green
//

async function computeClientHealth(clientId) {
  const [buffer, requests, ads] = await Promise.all([
    getBufferStatus(clientId),
    getRequestStatus(clientId),
    getAdsStatus(clientId),
  ]);

  const statuses = [buffer.status, requests.status, ads.status];
  const redCount = statuses.filter((s) => s === "red").length;
  const yellowCount = statuses.filter((s) => s === "yellow").length;

  let overall = "green";
  if (redCount > 0) overall = "red";
  else if (yellowCount >= 2) overall = "red";
  else if (yellowCount === 1) overall = "yellow";

  return {
    overall,
    modules: {
      contentBuffer: buffer,
      requests,
      ads,
    },
  };
}

// ─── Batch: recompute all clients ───────────────────────────

async function recomputeAllClients() {
  const clients = await prisma.client.findMany({
    where: { status: "active" },
  });

  const results = [];

  for (const client of clients) {
    const health = await computeClientHealth(client.id);

    // Update client record
    await prisma.client.update({
      where: { id: client.id },
      data: { healthStatus: health.overall },
    });

    // Log it for historical tracking
    await prisma.healthLog.create({
      data: {
        clientId: client.id,
        healthStatus: health.overall,
        bufferDays: health.modules.contentBuffer.bufferDays,
        openRequests: health.modules.requests.pendingCount,
        weeklyRoas: health.modules.ads.roas,
      },
    });

    results.push({ clientId: client.id, clientName: client.name, ...health });
  }

  return results;
}

module.exports = {
  THRESHOLDS,
  getBufferStatus,
  getRequestStatus,
  getAdsStatus,
  computeClientHealth,
  recomputeAllClients,
};
