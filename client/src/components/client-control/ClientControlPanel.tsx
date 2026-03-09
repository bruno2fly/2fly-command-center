"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import type { ControlItem } from "@/lib/client/mockClientControlData";

type Props = {
  items: ControlItem[];
  onDoItAction?: (itemId: string) => void;
};

const IMPACT_LABEL: Record<string, string> = {
  cash_now: "Cash now",
  prevent_fire: "Prevent fire",
  strategic: "Strategic",
};

const IMPACT_COLOR: Record<string, string> = {
  cash_now: "text-emerald-700 bg-emerald-50",
  prevent_fire: "text-amber-700 bg-amber-50",
  strategic: "text-blue-700 bg-blue-50",
};

function formatDue(d: string | null) {
  if (!d) return "—";
  const date = new Date(d);
  const today = new Date();
  const diff = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `${diff}d`;
}

export function ClientControlPanel({ items, onDoItAction }: Props) {
  const actions = items.filter((i) => i.kind === "action").slice(0, 3);
  const blockers = items.filter((i) => i.kind === "blocker");
  const approvals = items.filter((i) => i.kind === "approval");

  return (
    <div className="flex flex-col gap-4 mt-6">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Control Panel</h2>

      {/* Next 3 Actions */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 mb-2">Next 3 Actions</h3>
        {actions.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No actions</p>
        ) : (
          <ul className="space-y-2">
            {actions.map((item, idx) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-gray-100 hover:border-gray-200"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{item.owner}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">{formatDue(item.dueAt)}</span>
                    {item.impactTag && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          IMPACT_COLOR[item.impactTag] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {IMPACT_LABEL[item.impactTag]}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (onDoItAction) {
                      onDoItAction(item.id);
                      toast.success("✓ Task completed");
                    }
                  }}
                  className="flex-shrink-0 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                >
                  Do it
                </button>
              </motion.li>
            ))}
          </ul>
        )}
      </div>

      {/* Blockers */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 mb-2">Blockers</h3>
        {blockers.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">None</p>
        ) : (
          <ul className="space-y-2">
            {blockers.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-amber-50/50 border border-amber-100"
              >
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <span className="text-xs text-amber-700">Waiting</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Approvals Queue */}
      <div>
        <h3 className="text-xs font-medium text-gray-500 mb-2">Approvals Queue</h3>
        {approvals.length === 0 ? (
          <p className="text-sm text-gray-500 py-2">No pending approvals</p>
        ) : (
          <ul className="space-y-2">
            {approvals.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-gray-100"
              >
                <p className="text-sm font-medium text-gray-900 truncate flex-1">{item.title}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button className="px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded">
                    Approve
                  </button>
                  <button className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded">
                    Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
