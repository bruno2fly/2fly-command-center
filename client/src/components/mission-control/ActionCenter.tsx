"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { DueDateChip } from "./DueDateChip";
import type { ActionQueueItem } from "@/lib/client/buildActionQueue";

const IMPACT_LABEL: Record<string, string> = {
  cash_now: "Cash now",
  prevent_fire: "Prevent fire",
  strategic: "Strategic",
};

const IMPACT_STYLES = {
  dark: {
    cash_now: "bg-emerald-500/20 text-emerald-400",
    prevent_fire: "bg-amber-500/20 text-amber-400",
    strategic: "bg-blue-500/20 text-blue-400",
  },
  light: {
    cash_now: "bg-emerald-100 text-emerald-700",
    prevent_fire: "bg-amber-100 text-amber-700",
    strategic: "bg-blue-100 text-blue-700",
  },
};

type Props = {
  items: ActionQueueItem[];
  onDoIt?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onConvertToTask?: (id: string) => void;
  onSelectInbox?: (id: string) => void;
};

export function ActionCenter({
  items,
  onDoIt,
  onApprove,
  onReject,
  onConvertToTask,
  onSelectInbox,
}: Props) {
  const { isDark } = useTheme();
  const impactStyles = isDark ? IMPACT_STYLES.dark : IMPACT_STYLES.light;

  const btnPrimary = isDark
    ? "text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30"
    : "text-emerald-600 hover:bg-emerald-50 border border-emerald-200";

  return (
    <section
      className={`rounded-xl border overflow-hidden ${
        isDark
          ? "bg-[#0a0a0e]/80 border-[#1a1810] shadow-[0_0_0_1px_rgba(26,24,16,0.5)]"
          : "bg-white border-gray-200 shadow-sm"
      }`}
    >
      <div
        className={`px-5 py-4 border-b ${
          isDark ? "border-[#1a1810] bg-[#08080c]/50" : "border-gray-100 bg-gray-50/50"
        }`}
      >
        <h2
          className={`text-sm font-semibold uppercase tracking-wider ${
            isDark ? "text-emerald-400/90" : "text-blue-600"
          }`}
        >
          Command Queue
        </h2>
        <p
          className={`text-xs mt-0.5 ${
            isDark ? "text-[#8a7e6d]" : "text-gray-500"
          }`}
        >
          Immediate priorities · act now
        </p>
      </div>

      <div className="divide-y divide-[#1a1810]">
        {items.length === 0 ? (
          <div
            className={`px-5 py-12 text-center ${
              isDark ? "text-[#5a5040]" : "text-gray-500"
            }`}
          >
            <p className="text-sm font-medium">All clear</p>
            <p className="text-xs mt-1">No urgent actions right now</p>
          </div>
        ) : (
          items.map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${
                isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50/50"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      item.priority === "critical"
                        ? isDark
                          ? "bg-red-500/20 text-red-400"
                          : "bg-red-100 text-red-700"
                        : item.priority === "high"
                          ? isDark
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-amber-100 text-amber-700"
                          : isDark
                            ? "bg-[#141210] text-[#8a7e6d]"
                            : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.priority}
                  </span>
                  <span
                    className={`text-xs ${
                      isDark ? "text-[#5a5040]" : "text-gray-500"
                    }`}
                  >
                    {item.source}
                  </span>
                  {item.impactTag && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${
                        impactStyles[item.impactTag]
                      }`}
                    >
                      {IMPACT_LABEL[item.impactTag]}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-1 text-sm font-medium ${
                    isDark ? "text-[#e8e0d4]" : "text-gray-900"
                  }`}
                >
                  {item.title}
                </p>
                {item.suggestedAction && (
                  <p
                    className={`mt-1 text-xs ${
                      isDark ? "text-[#8a7e6d]" : "text-gray-500"
                    }`}
                  >
                    → {item.suggestedAction}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <DueDateChip dueAt={item.dueAt} compact />

                {item.kind === "approval" ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onApprove?.(item.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg ${btnPrimary}`}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject?.(item.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg ${
                        isDark
                          ? "text-red-400 hover:bg-red-500/20"
                          : "text-red-600 hover:bg-red-50"
                      }`}
                    >
                      Reject
                    </button>
                  </div>
                ) : item.kind === "blocker" ? (
                  <span
                    className={`text-xs font-medium ${
                      isDark ? "text-amber-400" : "text-amber-600"
                    }`}
                  >
                    Waiting on client
                  </span>
                ) : item.type === "inbox" ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => onSelectInbox?.(item.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg ${btnPrimary}`}
                    >
                      View
                    </button>
                    <button
                      onClick={() => onConvertToTask?.(item.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg ${btnPrimary}`}
                    >
                      To Task
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onDoIt?.(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg ${btnPrimary}`}
                  >
                    Do it
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
}
