"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import type { DailyReport } from "@/lib/api";

type Props = {
  report: DailyReport;
  isLatest?: boolean;
  defaultExpanded?: boolean;
};

function formatRange(weekStart: string | null, weekEnd: string | null): string {
  if (!weekStart || !weekEnd) return "";
  const s = new Date(weekStart + "T12:00:00");
  const e = new Date(weekEnd + "T12:00:00");
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export function WeeklyWrapCard({ report, isLatest, defaultExpanded = false }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cardBg = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const borderCls = isDark ? "border-[#1a1810]" : "border-gray-100";
  const textCls = isDark ? "text-[#e8e0d4]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  const { weekStart, weekEnd, contentCreated, contentPublished, tasksCompleted, requestsHandled, adSpend, adLeads, agentActionsExecuted, summary } = report;

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardBg}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`w-full px-4 py-3 flex items-center justify-between text-left border-b ${borderCls}`}
      >
        <span className={`font-semibold ${textCls}`}>
          🗓️ Weekly wrap — {formatRange(weekStart, weekEnd)}
        </span>
        {isLatest && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Latest
          </span>
        )}
        {!isLatest && (
          <span className={`text-sm ${mutedCls}`}>{expanded ? "▲ Collapse" : "▼ Expand"}</span>
        )}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`rounded-xl border p-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <p className={`text-xs uppercase tracking-wider ${mutedCls}`}>Content</p>
                  <p className={`text-lg font-semibold ${textCls}`}>{contentCreated + contentPublished}</p>
                </div>
                <div className={`rounded-xl border p-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <p className={`text-xs uppercase tracking-wider ${mutedCls}`}>Tasks</p>
                  <p className={`text-lg font-semibold ${textCls}`}>{report.tasksStarted + report.tasksCompleted}</p>
                </div>
                <div className={`rounded-xl border p-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <p className={`text-xs uppercase tracking-wider ${mutedCls}`}>Requests</p>
                  <p className={`text-lg font-semibold ${textCls}`}>{requestsHandled}</p>
                </div>
                <div className={`rounded-xl border p-3 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                  <p className={`text-xs uppercase tracking-wider ${mutedCls}`}>Ad spend</p>
                  <p className={`text-lg font-semibold ${textCls}`}>
                    {adSpend != null ? `$${adSpend.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
                  </p>
                </div>
              </div>
              {(adLeads != null || agentActionsExecuted > 0) && (
                <p className={`text-sm ${mutedCls}`}>
                  {adLeads != null && adLeads > 0 && `${adLeads} leads`}
                  {adLeads != null && adLeads > 0 && agentActionsExecuted > 0 && " | "}
                  {agentActionsExecuted > 0 && `${agentActionsExecuted} agent action(s) executed`}
                </p>
              )}
              <div className={`rounded-lg p-3 ${isDark ? "bg-black/20" : "bg-gray-50"}`}>
                <p className={`text-sm ${textCls}`}>{summary}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
