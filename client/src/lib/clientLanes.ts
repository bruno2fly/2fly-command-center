/**
 * Builds Client Lanes for Founder Mode from clients + invoices + config
 */

import type { Client } from "./mockData";
import { MOCK_CLIENTS } from "./mockData";
import { MOCK_INVOICES } from "./founderData";
import { computeClientHealth } from "./healthScoring";
import type { ClientLane } from "./founderData";
import { getClientUrgencySignal, sortByUrgency } from "./client/getClientUrgencySignal";
import { getClientControlMeta } from "./client/mockClientControlData";

// Augmented data per client (TODO: load from project/billing systems)
const CLIENT_EXTRA: Record<
  string,
  { lastDeliveredDate: string | null; nextPromiseDate: string | null }
> = {
  "1": { lastDeliveredDate: "2025-02-10", nextPromiseDate: "2025-02-20" },
  "2": { lastDeliveredDate: "2025-02-12", nextPromiseDate: "2025-02-18" },
  "3": { lastDeliveredDate: "2025-02-01", nextPromiseDate: "2025-02-14" },
  "4": { lastDeliveredDate: "2025-02-14", nextPromiseDate: "2025-02-25" },
  "5": { lastDeliveredDate: "2025-02-08", nextPromiseDate: "2025-02-22" },
};

function getPrimaryCta(client: Client, lane: Partial<ClientLane>): string {
  if (lane.unpaidInvoiceAmount) return "Chase payment";
  if (client.contentBufferDays < 7) return "Produce content";
  if (client.openRequests > 0) return "Handle requests";
  if (client.contentBufferDays < 15) return "Schedule content";
  return "Send report";
}

export function buildClientLanes(clients: Client[] = MOCK_CLIENTS): ClientLane[] {
  const overdueByClient = new Map<string, number>();
  for (const inv of MOCK_INVOICES) {
    if (inv.status === "overdue") {
      overdueByClient.set(inv.clientId, (overdueByClient.get(inv.clientId) ?? 0) + inv.amount);
    }
  }

  const lanes = clients.map((client) => {
    const meta = getClientControlMeta(client.id);
    const extra = CLIENT_EXTRA[client.id] ?? {
      lastDeliveredDate: meta?.lastDelivery ?? null,
      nextPromiseDate: meta?.nextPromiseDate ?? null,
    };
    const unpaidAmount = overdueByClient.get(client.id) ?? null;
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
    };
    lane.primaryCta = getPrimaryCta(client, lane);

    const urgency = getClientUrgencySignal(client.id, client.name);
    lane.urgencySignal = urgency.signal;
    lane.badgeCount = urgency.badgeCount;

    return lane;
  });

  return sortByUrgency(lanes, getClientUrgencySignal);
}
