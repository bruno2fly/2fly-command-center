"use client";

import { motion } from "framer-motion";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
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

const IMPACT_COLOR: { light: Record<string, string>; dark: Record<string, string> } = {
  light: { cash_now: "text-emerald-700 bg-emerald-50", prevent_fire: "text-amber-700 bg-amber-50", strategic: "text-blue-700 bg-blue-50" },
  dark: { cash_now: "text-emerald-400 bg-emerald-500/20", prevent_fire: "text-amber-400 bg-amber-500/20", strategic: "text-blue-400 bg-blue-500/20" },
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
  const { isDark } = useTheme();
  const actions = items.filter((i) => i.kind === "action").slice(0, 3);
  const blockers = items.filter((i) => i.kind === "blocker");
  const approvals = items.filter((i) => i.kind === "approval");
  const impact = isDark ? IMPACT_COLOR.dark : IMPACT_COLOR.light;

  return (
    <div className="flex flex-col gap-4 mt-6">
      <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>Control Panel</h2>

      {/* Next 3 Actions */}
      <div>
        <h3 className={`text-xs font-medium mb-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Next 3 Actions</h3>
        {actions.length === 0 ? (
          <p className={`text-sm py-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No actions</p>
        ) : (
          <ul className="space-y-2">
            {actions.map((item, idx) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${
                  isDark ? "bg-[#0a0a0e] border-[#1a1810] hover:border-[#2a2018]" : "bg-white border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{item.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{item.owner}</span>
                    <span className={`text-xs ${isDark ? "text-[#4a4030]" : "text-gray-400"}`}>·</span>
                    <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{formatDue(item.dueAt)}</span>
                    {item.impactTag && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${impact[item.impactTag] ?? (isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-100 text-gray-600")}`}>
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
                  className={`flex-shrink-0 px-2 py-1 text-xs font-medium rounded ${
                    isDark ? "text-emerald-400 hover:bg-emerald-500/20" : "text-blue-600 hover:bg-blue-50"
                  }`}
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
        <h3 className={`text-xs font-medium mb-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Blockers</h3>
        {blockers.length === 0 ? (
          <p className={`text-sm py-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>None</p>
        ) : (
          <ul className="space-y-2">
            {blockers.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${
                  isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50/50 border-amber-100"
                }`}
              >
                <p className={`text-sm font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{item.title}</p>
                <span className={isDark ? "text-xs text-amber-400" : "text-xs text-amber-700"}>Waiting</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Approvals Queue */}
      <div>
        <h3 className={`text-xs font-medium mb-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Approvals Queue</h3>
        {approvals.length === 0 ? (
          <p className={`text-sm py-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No pending approvals</p>
        ) : (
          <ul className="space-y-2">
            {approvals.map((item) => (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-2 p-2.5 rounded-lg border ${
                  isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-100"
                }`}
              >
                <p className={`text-sm font-medium truncate flex-1 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{item.title}</p>
                <div className="flex gap-1 flex-shrink-0">
                  <button className={`px-2 py-1 text-xs font-medium rounded ${isDark ? "text-emerald-400 hover:bg-emerald-500/20" : "text-emerald-600 hover:bg-emerald-50"}`}>
                    Approve
                  </button>
                  <button className={`px-2 py-1 text-xs font-medium rounded ${isDark ? "text-red-400 hover:bg-red-500/20" : "text-red-600 hover:bg-red-50"}`}>
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
