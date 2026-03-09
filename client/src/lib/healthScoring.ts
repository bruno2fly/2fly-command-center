/**
 * Client health scoring for Founder Mode
 * Computes GREEN / YELLOW / RED based on buffer, payment, delivery, performance.
 * Uses founderConfig thresholds for easy tweaking.
 */

import type { HealthStatus } from "./founderConfig";
import { BUFFER_THRESHOLDS, LAST_DELIVERY_STALE_DAYS } from "./founderConfig";

type HealthInputs = {
  contentBufferDays: number;
  hasOverdueInvoice: boolean;
  lastDeliveredDate: string | null;
  nextPromiseDate: string | null;
  performanceTrend: "up" | "flat" | "down";
  openRequests: number;
};

/**
 * Compute client health status from metrics.
 * GREEN: buffer above threshold, no overdue invoices, recent delivery, good trend.
 * YELLOW: one soft risk (medium buffer, slightly overdue, slower response, close to promise).
 * RED: buffer low, overdue invoices, late deliverables, or negative trend.
 */
export function computeClientHealth(inputs: HealthInputs): HealthStatus {
  const buffer = inputs.contentBufferDays;
  const hasOverdue = inputs.hasOverdueInvoice;
  const lastDelivered = inputs.lastDeliveredDate ? daysAgo(inputs.lastDeliveredDate) : null;
  const nextPromise = inputs.nextPromiseDate ? daysUntil(inputs.nextPromiseDate) : null;
  const trend = inputs.performanceTrend;
  const requests = inputs.openRequests;

  // Red: hard risks (buffer <= 5, overdue, declining trend, missed promise)
  if (buffer <= BUFFER_THRESHOLDS.red) return "red";
  if (hasOverdue) return "red";
  if (trend === "down") return "red";
  if (nextPromise !== null && nextPromise < 0) return "red"; // past promise date

  // Yellow: soft risks (buffer 6–10, etc.)
  if (buffer <= BUFFER_THRESHOLDS.yellow) return "yellow";
  if (lastDelivered !== null && lastDelivered > LAST_DELIVERY_STALE_DAYS) return "yellow";
  if (nextPromise !== null && nextPromise <= 3) return "yellow";
  if (requests > 2) return "yellow";
  if (trend === "flat") return "yellow";

  return "green";
}

/** needsActionToday: true if buffer low, approval stale, invoice overdue, or promise today/past */
export function needsActionToday(inputs: {
  contentBufferDays: number;
  hasOverdueInvoice: boolean;
  nextPromiseDate: string | null;
  oldestApprovalDays?: number;
}): boolean {
  if (inputs.contentBufferDays <= BUFFER_THRESHOLDS.yellow) return true;
  if (inputs.hasOverdueInvoice) return true;
  if (inputs.oldestApprovalDays !== undefined && inputs.oldestApprovalDays >= 5) return true;
  const daysUntil = inputs.nextPromiseDate ? daysUntilDate(inputs.nextPromiseDate) : null;
  if (daysUntil !== null && daysUntil <= 0) return true;
  return false;
}

function daysAgo(isoDate: string): number {
  const d = new Date(isoDate);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

function daysUntil(isoDate: string): number {
  return daysUntilDate(isoDate);
}

function daysUntilDate(isoDate: string): number {
  const d = new Date(isoDate);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}
