"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import type { DailyReport } from "@/lib/api";

type Props = {
  report: DailyReport;
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function DailyReportRow({ report }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const cardBg = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-800";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  const oneLiner =
    report.summary.length > 80 ? report.summary.slice(0, 80) + "…" : report.summary;

  return (
    <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`w-full px-4 py-3 flex items-center justify-between gap-2 text-left`}
      >
        <span className={`font-medium ${textCls}`}>📅 {formatDate(report.date)}</span>
        <span className={`text-sm truncate flex-1 mx-2 ${mutedCls}`}>{oneLiner}</span>
        <span className={`text-xs shrink-0 ${mutedCls}`}>{expanded ? "▲" : "▼"}</span>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-gray-200 dark:border-[#1a1810]"
          >
            <div className="p-4 space-y-2">
              <p className={`text-sm ${textCls}`}>{report.summary}</p>
              <div className={`flex flex-wrap gap-3 text-xs ${mutedCls}`}>
                {report.contentCreated > 0 && <span>{report.contentCreated} content created</span>}
                {report.contentPublished > 0 && <span>{report.contentPublished} published</span>}
                {report.tasksCompleted > 0 && <span>{report.tasksCompleted} tasks completed</span>}
                {report.tasksStarted > 0 && <span>{report.tasksStarted} tasks started</span>}
                {report.requestsHandled > 0 && <span>{report.requestsHandled} requests handled</span>}
                {report.agentActionsExecuted > 0 && (
                  <span>{report.agentActionsExecuted} agent actions executed</span>
                )}
                {report.adSpend != null && report.adSpend > 0 && (
                  <span>${report.adSpend.toFixed(2)} ad spend, {report.adLeads ?? 0} leads</span>
                )}
              </div>
              {report.highlights && (
                <p className={`text-xs ${mutedCls}`}>{report.highlights}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
