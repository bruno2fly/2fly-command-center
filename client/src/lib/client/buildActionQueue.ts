/**
 * Builds the unified Action Queue for Mission Control.
 * Merges control items, inbox, and health risks into a prioritized list.
 */

import type { ControlItem, InboxItem, ClientHealth } from "./mockClientControlData";

export type ActionQueueItem = {
  id: string;
  type: "control" | "inbox" | "health_risk";
  title: string;
  source: string;
  priority: "critical" | "high" | "medium";
  status: string;
  dueAt: string | null;
  suggestedAction?: string;
  impactTag?: "cash_now" | "prevent_fire" | "strategic";
  owner?: string;
  linkedInboxId?: string;
  kind?: ControlItem["kind"];
};

function scorePriority(item: ActionQueueItem): number {
  const p = item.priority;
  if (p === "critical") return 100;
  if (p === "high") return 80;
  return 60;
}

function scoreDue(dueAt: string | null): number {
  if (!dueAt) return 0;
  const d = new Date(dueAt).getTime();
  const now = Date.now();
  const overdue = now - d;
  if (overdue > 0) return 90 + Math.min(overdue / 86400000, 10);
  const daysUntil = (d - now) / 86400000;
  if (daysUntil <= 1) return 85;
  if (daysUntil <= 3) return 75;
  return 50;
}

function controlToAction(c: ControlItem): ActionQueueItem {
  const isOverdue =
    c.dueAt && new Date(c.dueAt) < new Date();
  const priority: ActionQueueItem["priority"] =
    c.impactTag === "cash_now" || isOverdue
      ? "critical"
      : c.impactTag === "prevent_fire"
        ? "high"
        : "medium";

  return {
    id: c.id,
    type: "control",
    title: c.title,
    source: c.kind === "blocker" ? "Blocker" : c.kind === "approval" ? "Approval" : "Action",
    priority,
    status: c.status,
    dueAt: c.dueAt,
    impactTag: c.impactTag,
    owner: c.owner,
    linkedInboxId: c.linkedInboxId,
    kind: c.kind,
  };
}

function inboxToAction(i: InboxItem): ActionQueueItem {
  const hasUrgent = i.tags.includes("urgent");
  const hasPayment = i.tags.includes("payment");
  const hasApproval = i.tags.includes("approval");
  const priority: ActionQueueItem["priority"] =
    hasUrgent || hasPayment ? "critical" : hasApproval ? "high" : "medium";

  return {
    id: i.id,
    type: "inbox",
    title: i.summary,
    source: i.source === "whatsapp" ? "WhatsApp" : i.source === "2flyflow" ? "2FlyFlow" : "Manual",
    priority,
    status: "pending",
    dueAt: null,
    suggestedAction: i.suggestedAction,
  };
}

function healthToActions(health: ClientHealth): ActionQueueItem[] {
  const items: ActionQueueItem[] = [];

  if (health.paymentStatus === "overdue" && health.paymentDaysOverdue) {
    items.push({
      id: "health-payment",
      type: "health_risk",
      title: `Invoice overdue ${health.paymentDaysOverdue}d`,
      source: "Payment",
      priority: "critical",
      status: "overdue",
      dueAt: null,
      suggestedAction: "Follow up with client",
    });
  }

  if (health.websiteStatus === "down" || !health.formsOk) {
    items.push({
      id: "health-website",
      type: "health_risk",
      title: health.formsOk ? "Website down" : "Contact form issues",
      source: "Website",
      priority: "high",
      status: "alert",
      dueAt: null,
      suggestedAction: "Debug and fix",
    });
  }

  if (health.deliveryStatus === "late" || (health.deliveryStatus === "at_risk" && health.deliveryBufferDays < 7)) {
    items.push({
      id: "health-delivery",
      type: "health_risk",
      title: `Delivery at risk · ${health.deliveryBufferDays}d buffer`,
      source: "Delivery",
      priority: health.deliveryStatus === "late" ? "critical" : "high",
      status: health.deliveryStatus,
      dueAt: null,
      suggestedAction: "Produce content",
    });
  }

  return items;
}

export function buildActionQueue(
  controlItems: ControlItem[],
  inboxItems: InboxItem[],
  health: ClientHealth | null,
  limit = 5
): ActionQueueItem[] {
  const fromControl = controlItems.map(controlToAction);
  const fromInbox = inboxItems
    .filter((i) => i.tags.some((t) => ["urgent", "approval", "payment", "support"].includes(t)))
    .map(inboxToAction);
  const fromHealth = health ? healthToActions(health) : [];

  const seen = new Set<string>();
  const deduped: ActionQueueItem[] = [];

  for (const item of [...fromHealth, ...fromControl, ...fromInbox]) {
    const key = `${item.type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return deduped
    .sort((a, b) => {
      const pa = scorePriority(a) + scoreDue(a.dueAt);
      const pb = scorePriority(b) + scoreDue(b.dueAt);
      return pb - pa;
    })
    .slice(0, limit);
}
