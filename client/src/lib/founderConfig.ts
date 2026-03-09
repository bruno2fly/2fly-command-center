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

/** Client MRR values (for at-risk revenue calc) - TODO: connect to real billing */
export const CLIENT_MRR: Record<string, number> = {
  "1": 2500,
  "2": 1800,
  "3": 3200,
  "4": 4200,
  "5": 1500,
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  CASH_NOW: "Cash now",
  PREVENT_FIRE: "Prevent fire",
  STRATEGIC: "Strategic",
};
