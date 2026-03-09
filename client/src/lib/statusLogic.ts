/**
 * Status logic: Green / Yellow / Red for all metrics
 */

export type Status = "green" | "yellow" | "red";

/**
 * Content Buffer: days ahead content is scheduled
 * >= 15 days → Green
 * 7–14 days → Yellow
 * < 7 days → Red
 */
export function getContentBufferStatus(daysAhead: number): Status {
  if (daysAhead >= 15) return "green";
  if (daysAhead >= 7) return "yellow";
  return "red";
}

/**
 * Ads Health: performance status
 * ROAS > 3 → Green, 1.5–3 → Yellow, < 1.5 → Red
 */
export function getAdsHealthStatus(roas: number | null): Status {
  if (roas == null) return "yellow";
  if (roas >= 3) return "green";
  if (roas >= 1.5) return "yellow";
  return "red";
}

/**
 * Open Requests: count-based
 * 0 → Green, 1–3 → Yellow, > 3 → Red
 */
export function getRequestsStatus(count: number): Status {
  if (count === 0) return "green";
  if (count <= 3) return "yellow";
  return "red";
}

/**
 * Website Backlog: count-based
 * 0–2 → Green, 3–5 → Yellow, > 5 → Red
 */
export function getBacklogStatus(count: number): Status {
  if (count <= 2) return "green";
  if (count <= 5) return "yellow";
  return "red";
}

/**
 * Monthly Performance trend: up/flat/down
 * Up → Green, Flat → Yellow, Down → Red
 */
export function getPerformanceTrendStatus(trend: "up" | "flat" | "down"): Status {
  if (trend === "up") return "green";
  if (trend === "flat") return "yellow";
  return "red";
}

/**
 * Overall client status: worst of all metrics
 */
export function getOverallStatus(statuses: Status[]): Status {
  if (statuses.includes("red")) return "red";
  if (statuses.includes("yellow")) return "yellow";
  return "green";
}
