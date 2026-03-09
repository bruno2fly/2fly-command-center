"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { ControlItem } from "@/lib/client/mockClientControlData";
import type { ClientHealth } from "@/lib/client/mockClientControlData";
import type { InboxItem } from "@/lib/client/mockClientControlData";

export type BlockerItem = {
  id: string;
  title: string;
  reason: string;
  delayIndicator?: string;
  severity: "critical" | "warning";
};

type Props = {
  controlItems: ControlItem[];
  health: ClientHealth | null;
  inboxItems?: InboxItem[];
};

function buildBlockers(controlItems: ControlItem[], health: ClientHealth | null, inboxItems: InboxItem[] = []): BlockerItem[] {
  const blockers: BlockerItem[] = [];

  // Overdue invoice
  if (health?.paymentStatus === "overdue" && health.paymentDaysOverdue) {
    blockers.push({
      id: "invoice-overdue",
      title: "Invoice overdue",
      reason: `Payment ${health.paymentDaysOverdue} days late`,
      delayIndicator: `${health.paymentDaysOverdue}d`,
      severity: "critical",
    });
  }

  // Contact form bug
  if (health?.formsOk === false) {
    blockers.push({
      id: "forms-bug",
      title: "Contact form bug",
      reason: "Submissions not working",
      severity: "critical",
    });
  }

  // Approvals holding production
  const approvals = controlItems.filter((c) => c.kind === "approval");
  for (const a of approvals) {
    blockers.push({
      id: `approval-${a.id}`,
      title: a.title,
      reason: "Awaiting approval",
      delayIndicator: a.dueAt ? `${Math.ceil((new Date(a.dueAt).getTime() - Date.now()) / 86400000)}d` : undefined,
      severity: "warning",
    });
  }

  // Client delays / blockers
  const clientBlockers = controlItems.filter((c) => c.kind === "blocker");
  for (const b of clientBlockers) {
    blockers.push({
      id: `blocker-${b.id}`,
      title: b.title,
      reason: "Waiting on client",
      severity: "warning",
    });
  }

  // Urgent inbox items (missing assets, etc.) — skip payment if we already have invoice
  const hasInvoice = blockers.some((b) => b.id === "invoice-overdue");
  const urgentInbox = inboxItems.filter(
    (i) =>
      i.tags.includes("urgent") &&
      i.type !== "approval" &&
      !(i.type === "payment" && hasInvoice)
  );
  for (const i of urgentInbox.slice(0, 2)) {
    blockers.push({
      id: `inbox-${i.id}`,
      title: i.summary,
      reason: i.type === "payment" ? "Payment issue" : "Action needed",
      severity: i.priority === "high" ? "critical" : "warning",
    });
  }

  return blockers;
}

export function CriticalBlockersPanel({ controlItems, health, inboxItems = [] }: Props) {
  const { isDark } = useTheme();
  const blockers = buildBlockers(controlItems, health, inboxItems);

  const panelCls = isDark
    ? "bg-[#0a0a0e] border-red-500/20"
    : "bg-white border-amber-200";
  const borderCls = isDark ? "border-[#1a1810]" : "border-gray-100";
  const criticalIcon = "🔴";
  const warningIcon = "🟠";

  return (
    <section
      className={`rounded-xl border-2 overflow-hidden ${panelCls} ${
        isDark ? "border-red-500/30" : "border-amber-300"
      }`}
    >
      <div
        className={`px-3 py-2.5 border-b flex items-center gap-2 ${
          isDark ? "border-red-500/20 bg-red-500/5" : "border-amber-200 bg-amber-50/50"
        }`}
      >
        <span className="text-red-500 text-sm">⚠</span>
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-red-400" : "text-amber-800"
          }`}
        >
          Critical Blockers
        </h2>
      </div>
      <div
        className={`divide-y max-h-[280px] overflow-y-auto ${
          isDark ? "divide-[#1a1810]" : "divide-amber-100"
        }`}
      >
        {blockers.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
              No blockers
            </p>
          </div>
        ) : (
          blockers.map((b) => (
            <div
              key={b.id}
              className={`px-3 py-2.5 ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-amber-50/30"}`}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-[10px] mt-0.5">
                  {b.severity === "critical" ? criticalIcon : warningIcon}
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-medium truncate ${
                      isDark ? "text-[#c4b8a8]" : "text-gray-900"
                    }`}
                  >
                    {b.title}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                    {b.reason}
                    {b.delayIndicator && (
                      <span
                        className={`ml-1 ${
                          b.severity === "critical"
                            ? "text-red-400 font-medium"
                            : "text-amber-500"
                        }`}
                      >
                        · {b.delayIndicator}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
