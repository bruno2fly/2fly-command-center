/**
 * Client urgency signal for triage.
 * Fetches real data from API, falls back to mock data.
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

/**
 * Fetch urgency signal from real API data.
 * Returns null if API unavailable — caller should fall back to getClientUrgencySignal.
 */
export async function fetchClientUrgencySignal(
  clientId: string,
): Promise<ClientUrgencySignal | null> {
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  try {
    // Fetch requests + invoices for this client in parallel
    const [reqRes, invRes] = await Promise.all([
      fetch(`${API}/api/agent-tools/requests?clientId=${clientId}`).then(r => r.ok ? r.json() : null),
      fetch(`${API}/api/agent-tools/invoices?clientId=${clientId}`).then(r => r.ok ? r.json() : null),
    ]);

    let urgency: UrgencyLevel = "green";
    let signal = "On track";
    let badgeCount = 0;

    // 1. Overdue invoices (highest priority)
    const invoices = invRes?.invoices || [];
    const overdue = invoices.filter((inv: { status: string; dueDate: string }) =>
      inv.status === "overdue" || (inv.status === "sent" && new Date(inv.dueDate) < new Date())
    );
    if (overdue.length > 0) {
      const totalOverdue = overdue.reduce((s: number, i: { amount: number }) => s + i.amount, 0);
      const maxDays = Math.max(...overdue.map((i: { dueDate: string }) => daysOverdue(i.dueDate)));
      urgency = "red";
      signal = `Invoice ${maxDays}d overdue · $${totalOverdue.toLocaleString()}`;
      badgeCount += overdue.length;
    }

    // 2. SLA-breached or overdue requests
    const requests = reqRes?.requests || [];
    const breached = requests.filter((r: { slaBreached: boolean; status: string }) =>
      r.slaBreached && !["completed", "closed"].includes(r.status)
    );
    const urgentOpen = requests.filter((r: { priority: string; status: string }) =>
      r.priority === "urgent" && !["completed", "closed"].includes(r.status)
    );
    
    if (urgency === "green" && breached.length > 0) {
      urgency = "red";
      signal = `${breached.length} request${breached.length > 1 ? "s" : ""} SLA breached`;
      badgeCount += breached.length;
    } else if (urgency === "green" && urgentOpen.length > 0) {
      urgency = "yellow";
      signal = `${urgentOpen.length} urgent request${urgentOpen.length > 1 ? "s" : ""} open`;
      badgeCount += urgentOpen.length;
    }

    // 3. Pending requests (action needed)
    const pending = requests.filter((r: { status: string }) =>
      ["new", "acknowledged"].includes(r.status)
    );
    if (urgency === "green" && pending.length > 0) {
      const oldest = pending[pending.length - 1];
      const age = daysOverdue(oldest.createdAt);
      if (age > 3) {
        urgency = "yellow";
        signal = `Request pending ${age}d`;
      } else {
        signal = `${pending.length} request${pending.length > 1 ? "s" : ""} pending`;
      }
      badgeCount += pending.length;
    }

    // 4. Due soon invoices
    const dueSoon = invoices.filter((inv: { status: string; dueDate: string }) =>
      inv.status === "sent" && daysUntil(inv.dueDate) <= 3 && daysUntil(inv.dueDate) >= 0
    );
    if (urgency === "green" && dueSoon.length > 0) {
      const days = daysUntil(dueSoon[0].dueDate);
      urgency = "yellow";
      signal = days === 0 ? "Invoice due today" : `Invoice due in ${days}d`;
      badgeCount += dueSoon.length;
    }

    return { urgency, signal, badgeCount };
  } catch {
    return null; // API unavailable, caller falls back
  }
}

/**
 * Get the single most critical urgency signal for a client (sync, mock data).
 * Used as fallback when API is unavailable.
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

  // 2. Health-based payment overdue
  if (urgency === "green" && health?.paymentStatus === "overdue") {
    const days = health.paymentDaysOverdue ?? 0;
    urgency = "red";
    signal = `Invoice ${days}d overdue`;
    badgeCount += 1;
  }

  // 3. Urgent inbox
  const urgentInbox = inboxItems.filter(
    (i) => i.tags.includes("urgent") || i.priority === "high"
  );
  if (urgency === "green" && urgentInbox.length > 0) {
    const oldest = urgentInbox[0];
    const age = daysOverdue(oldest.createdAt);
    urgency = age > 1 ? "red" : "yellow";
    signal = age > 1 ? "WhatsApp reply needed" : "Reply needed";
    badgeCount += urgentInbox.length;
  }

  // 4. Pending approvals
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
      signal = dueIn === 0 ? "Approval due today" : `Approval due in ${dueIn}d`;
    }
    badgeCount += approvals.length;
  }

  // 5. Content buffer
  if (urgency === "green" && health && health.deliveryBufferDays <= 5) {
    urgency = "red";
    signal = `Content buffer ${health.deliveryBufferDays}d`;
    badgeCount += 1;
  } else if (urgency === "green" && health && health.deliveryBufferDays <= 10) {
    urgency = "yellow";
    signal = `Buffer ${health.deliveryBufferDays}d`;
    badgeCount += 1;
  }

  // 6. Next promise
  if (urgency === "green" && meta?.nextPromiseDate) {
    const days = daysUntil(meta.nextPromiseDate);
    if (days < 0) {
      urgency = "red";
      signal = `Promise ${Math.abs(days)}d overdue`;
      badgeCount += 1;
    } else if (days <= 2) {
      urgency = "yellow";
      signal = `Due in ${days}d`;
    } else {
      signal = `On track · next delivery in ${days}d`;
    }
  }

  return { urgency, signal, badgeCount };
}

/**
 * Sort clients by urgency: red first, then yellow, then green.
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
