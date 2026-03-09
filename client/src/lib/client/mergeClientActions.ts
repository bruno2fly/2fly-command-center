/**
 * Merges priority items (from ActionsContext / Execution Board) with control items
 * so Client page "Next 3 Actions" matches Dashboard Execution Board for that client.
 */

import type { ControlItem } from "./mockClientControlData";
import type { PriorityItem } from "@/lib/founder/mockFounderData";
import type { TaskPriority } from "@/lib/founderConfig";

const PRIORITY_TO_IMPACT: Record<TaskPriority, ControlItem["impactTag"]> = {
  CASH_NOW: "cash_now",
  PREVENT_FIRE: "prevent_fire",
  STRATEGIC: "strategic",
};

/** Convert PriorityItem to ControlItem shape for actions */
function priorityToControlItem(p: PriorityItem): ControlItem {
  return {
    id: p.id,
    clientId: p.clientId,
    title: p.title,
    kind: "action",
    owner: p.assignedTo === "You" ? "me" : p.assignedTo.toLowerCase(),
    dueAt: p.dueAt,
    impactTag: PRIORITY_TO_IMPACT[p.tags[0] ?? "STRATEGIC"],
    status: "pending",
  };
}

/**
 * Merge priorities (from Execution Board) with control items.
 * Actions = first 3 priorities for client (same as Dashboard).
 * Blockers & Approvals = from control items.
 */
export function mergeClientControlItems(
  clientId: string,
  controlItems: ControlItem[],
  priorities: PriorityItem[]
): ControlItem[] {
  const clientPriorities = priorities
    .filter((p) => p.clientId === clientId)
    .slice(0, 3)
    .map(priorityToControlItem);

  const blockers = controlItems.filter((i) => i.kind === "blocker");
  const approvals = controlItems.filter((i) => i.kind === "approval");

  return [...clientPriorities, ...blockers, ...approvals];
}
