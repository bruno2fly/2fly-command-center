/**
 * Builds Client Lanes for Founder Mode from clients + invoices + config
 */

import type { Client } from "./mockData";
import { computeClientHealth } from "./healthScoring";
import type { ClientLane, InvoiceForLane } from "./founderData";
import { getClientControlMeta } from "./client/mockClientControlData";

function daysOverdue(dueDate: string): number {
  const d = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function getPrimaryCta(client: Client, lane: Partial<ClientLane>): string {
  if (lane.unpaidInvoiceAmount) return "Chase payment";
  if (client.contentBufferDays < 7) return "Produce content";
  if (client.openRequests > 0) return "Handle requests";
  if (client.contentBufferDays < 15) return "Schedule content";
  return "Send report";
}

function computeUrgencyFromLane(
  client: Client,
  lane: ClientLane,
  overdueInvoices: { amount: number; dueDate: string }[]
): { signal: string; badgeCount: number } {
  let signal = "On track";
  let badgeCount = 0;

  if (overdueInvoices.length > 0) {
    const total = overdueInvoices.reduce((s, i) => s + i.amount, 0);
    const maxDays = Math.max(...overdueInvoices.map((i) => daysOverdue(i.dueDate)));
    signal = `Invoice ${maxDays}d overdue · $${total.toLocaleString()}`;
    badgeCount = overdueInvoices.length;
  } else if (client.contentBufferDays <= 5) {
    signal = `Content buffer ${client.contentBufferDays}d`;
    badgeCount = 1;
  } else if (client.contentBufferDays <= 10) {
    signal = `Buffer ${client.contentBufferDays}d`;
    badgeCount = 1;
  } else if (client.openRequests > 0) {
    signal = `${client.openRequests} request${client.openRequests > 1 ? "s" : ""} pending`;
    badgeCount = client.openRequests;
  }

  return { signal, badgeCount };
}

export function buildClientLanes(
  clients: Client[],
  invoices: InvoiceForLane[] = []
): ClientLane[] {
  const overdueByClient = new Map<string, { amount: number; dueDate: string }[]>();
  const paidByClient = new Map<string, boolean>();
  const sentByClient = new Map<string, { amount: number; dueDate: string }[]>();

  for (const inv of invoices) {
    if (inv.status === "overdue" || (inv.status === "sent" && new Date(inv.dueDate) < new Date())) {
      const arr = overdueByClient.get(inv.clientId) ?? [];
      arr.push({ amount: inv.amount, dueDate: inv.dueDate });
      overdueByClient.set(inv.clientId, arr);
    } else if (inv.status === "paid" || inv.paidDate) {
      paidByClient.set(inv.clientId, true);
    } else if (inv.status === "sent") {
      const arr = sentByClient.get(inv.clientId) ?? [];
      arr.push({ amount: inv.amount, dueDate: inv.dueDate });
      sentByClient.set(inv.clientId, arr);
    }
  }

  const lanes: ClientLane[] = clients.map((client) => {
    const meta = getClientControlMeta(client.id);
    const extra = {
      lastDeliveredDate: meta?.lastDelivery ?? null,
      nextPromiseDate: meta?.nextPromiseDate ?? null,
    };
    const overdueInvoices = overdueByClient.get(client.id) ?? [];
    const unpaidAmount = overdueInvoices.length > 0
      ? overdueInvoices.reduce((s, i) => s + i.amount, 0)
      : null;
    const health = computeClientHealth({
      contentBufferDays: client.contentBufferDays,
      hasOverdueInvoice: unpaidAmount != null && unpaidAmount > 0,
      lastDeliveredDate: extra.lastDeliveredDate,
      nextPromiseDate: extra.nextPromiseDate,
      performanceTrend: client.performanceTrend,
      openRequests: client.openRequests,
    });

    const lane: ClientLane = {
      clientId: client.id,
      clientName: client.name,
      health,
      contentBufferDays: client.contentBufferDays,
      lastDeliveredDate: extra.lastDeliveredDate,
      nextPromiseDate: extra.nextPromiseDate,
      unpaidInvoiceAmount: unpaidAmount,
      primaryCta: "",
      adsRoas: client.adsRoas ?? null,
      adsRoasTrend: client.adsRoas != null ? `ROAS ${client.adsRoas.toFixed(1)}x` : undefined,
    };
    lane.primaryCta = getPrimaryCta(client, lane);

    if (paidByClient.get(client.id)) {
      lane.paymentStatus = "paid";
    } else if (overdueInvoices.length > 0) {
      lane.paymentStatus = "overdue";
      lane.paymentDaysOverdue = Math.max(...overdueInvoices.map((i) => daysOverdue(i.dueDate)));
    } else if (sentByClient.get(client.id)) {
      lane.paymentStatus = "pending";
    }

    const urgency = computeUrgencyFromLane(client, lane, overdueInvoices);
    lane.urgencySignal = urgency.signal;
    lane.badgeCount = urgency.badgeCount;

    return lane;
  });

  const order = { red: 0, yellow: 1, green: 2 };
  return [...lanes].sort((a, b) => {
    if (order[a.health] !== order[b.health]) return order[a.health] - order[b.health];
    return (b.badgeCount ?? 0) - (a.badgeCount ?? 0);
  });
}
