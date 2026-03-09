/**
 * Founder Mode configuration
 * Central place for health scoring rules, buffer thresholds, and priority tags.
 * Tweak these to change how the dashboard surfaces risk and actions.
 */

export type HealthStatus = "green" | "yellow" | "red";

export type TaskPriority = "CASH_NOW" | "PREVENT_FIRE" | "STRATEGIC";

/** Buffer thresholds (content/fulfillment days ahead) */
export const BUFFER_THRESHOLDS = {
  red: 5,    // <= 5 days buffer → red
  yellow: 10, // 6–10 days → yellow, > 10 → green
} as const;

/** Payment overdue thresholds (days) */
export const PAYMENT_OVERDUE_THRESHOLDS = {
  red: 1,    // any overdue → red
  yellow: 7, // 1–7 days → yellow (if we had gradation)
} as const;

/** Max days since last delivery before client is considered "stale" */
export const LAST_DELIVERY_STALE_DAYS = 14;

/** Days after which an approval request is considered "old" (needsActionToday) */
export const APPROVAL_STALE_DAYS = 5;

/** Days after which an overdue invoice triggers needsActionToday */
export const INVOICE_OVERDUE_DAYS = 7;

/** Client MRR values — real 2FLY clients */
export const CLIENT_MRR: Record<string, number> = {
  "cmmil114j0001j2tq80ty6zag": 500,   // The Shape SPA Miami
  "cmmil114l0002j2tq3in1w0iz": 500,   // The Shape Spa FLL
  "cmmil114m0003j2tq5q9mgpg4": 700,   // Sudbury Point Grill
  "cmmil114m0004j2tqluvp06lw": 1000,  // Pro Fortuna
  "cmmil114n0005j2tqy0k2trgm": 1200,  // Casa Nova
  "cmmil114n0006j2tqy2ewcrd6": 1300,  // Ardan Med Spa
  "cmmil114o0007j2tq9mxw9a7x": 1100,  // This is it Brazil
  "cmmil114o0008j2tq3sviv4ed": 1400,  // Super Crisp
  "cmmil114p0009j2tqcmy06xrz": 800,   // Hafiza
  "cmmil114p000aj2tq2hhn6euo": 800,   // Cristiane Amorim
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  CASH_NOW: "Cash now",
  PREVENT_FIRE: "Prevent fire",
  STRATEGIC: "Strategic",
};
