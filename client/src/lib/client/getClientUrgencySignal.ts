/**
 * Client urgency signal for triage.
 * Determines the single most critical signal per client for sidebar and tables.
 */

import { MOCK_INVOICES } from "@/lib/founderData";
import {
  getInboxItems,
  getControlItems,
  getClientHealth,
  getClientControlMeta,
} from "./mockClientControlData";

export type UrgencyLevel = "red" | "yellow" | "green";

export type ClientUrgencySignal = {
  urgency: UrgencyLevel;
  signal: string;
  badgeCount: number;
};

function daysOverdue(dueDate: string): number {
  const d = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - now.getTime()) / 86400000);
}

function daysAgo(iso: string): number {
  const d = new Date(iso);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}

/**
 * Get the single most critical urgency signal for a client.
 * Used by sidebar, All Clients table, and triage views.
 */
export function getClientUrgencySignal(
  clientId: string,
  clientName: string
): ClientUrgencySignal {
  const inboxItems = getInboxItems(clientId);
  const controlItems = getControlItems(clientId);
  const health = getClientHealth(clientId);
  const meta = getClientControlMeta(clientId);

  let urgency: UrgencyLevel = "green";
  let signal = "On track";
  let badgeCount = 0;

  // 1. Overdue payments (highest priority)
  const overdueInvoices = MOCK_INVOICES.filter(
    (inv) => inv.clientId === clientId && inv.status === "overdue"
  );
  const overdueTotal = overdueInvoices.reduce((s, i) => s + i.amount, 0);
  const maxOverdueDays = overdueInvoices.length
    ? Math.max(...overdueInvoices.map((i) => daysOverdue(i.dueDate)))
    : 0;

  if (overdueTotal > 0) {
    urgency = "red";
    signal = `Invoice ${maxOverdueDays}d overdue · $${overdueTotal.toLocaleString()}`;
    badgeCount += overdueInvoices.length;
  }

  // 2. Health-based payment overdue (for clients not in MOCK_INVOICES)
  if (urgency === "green" && health?.paymentStatus === "overdue") {
    const days = health.paymentDaysOverdue ?? 0;
    urgency = "red";
    signal = `Invoice ${days}d overdue`;
    badgeCount += 1;
  }

  // 3. Urgent unanswered WhatsApp / inbox
  const urgentInbox = inboxItems.filter(
    (i) => i.tags.includes("urgent") || i.priority === "high"
  );
  if (urgency === "green" && urgentInbox.length > 0) {
    const oldest = urgentInbox[0];
    const age = daysAgo(oldest.createdAt);
    urgency = age > 1 ? "red" : "yellow";
    signal = age > 1 ? "WhatsApp reply needed" : "Reply needed";
    badgeCount += urgentInbox.length;
  }

  // 4. Pending approvals (blocked)
  const approvals = controlItems.filter((c) => c.kind === "approval");
  if (urgency === "green" && approvals.length > 0) {
    const oldest = approvals[0];
    const dueIn = oldest.dueAt ? daysUntil(oldest.dueAt) : 999;
    const overdue = oldest.dueAt ? daysOverdue(oldest.dueAt) : 0;
    if (overdue > 0) {
      urgency = "red";
      signal = `Approval ${overdue}d overdue`;
    } else if (dueIn <= 2) {
      urgency = "yellow";
      signal = dueIn === 0 ? "Approval due today" : dueIn === 1 ? "Approval due tomorrow" : `Approval due in ${dueIn}d`;
    } else {
      signal = `Approval waiting ${dueIn}d`;
      urgency = dueIn <= 5 ? "yellow" : "green";
    }
    badgeCount += approvals.length;
  }

  // 5. Blockers (waiting on client)
  const blockers = controlItems.filter((c) => c.kind === "blocker");
  if (urgency === "green" && blockers.length > 0) {
    urgency = "yellow";
    signal = "Waiting on client";
    badgeCount += blockers.length;
  }

  // 6. Content buffer critical
  if (urgency === "green" && health && health.deliveryBufferDays <= 5) {
    urgency = "red";
    signal = `Content buffer ${health.deliveryBufferDays}d`;
    badgeCount += 1;
  }

  // 7. Content buffer low
  if (urgency === "green" && health && health.deliveryBufferDays <= 10) {
    urgency = "yellow";
    signal = `Buffer ${health.deliveryBufferDays}d`;
    badgeCount += 1;
  }

  // 8. Upcoming deadline (next promise)
  if (urgency === "green" && meta?.nextPromiseDate) {
    const days = daysUntil(meta.nextPromiseDate);
    if (days < 0) {
      urgency = "red";
      signal = `Promise ${Math.abs(days)}d overdue`;
      badgeCount += 1;
    } else if (days <= 2) {
      urgency = "yellow";
      signal = `Due in ${days}d`;
      badgeCount += 1;
    } else {
      signal = `On track · next delivery in ${days}d`;
    }
  }

  return { urgency, signal, badgeCount };
}

/**
 * Sort clients by urgency: red first, then yellow, then green.
 * Within same level, sort by badge count (higher first).
 */
export function sortByUrgency<T extends { clientId: string; clientName: string }>(
  items: T[],
  getSignal: (id: string, name: string) => ClientUrgencySignal
): T[] {
  const order = { red: 0, yellow: 1, green: 2 };
  return [...items].sort((a, b) => {
    const sa = getSignal(a.clientId, a.clientName);
    const sb = getSignal(b.clientId, b.clientName);
    if (order[sa.urgency] !== order[sb.urgency]) {
      return order[sa.urgency] - order[sb.urgency];
    }
    return sb.badgeCount - sa.badgeCount;
  });
}
