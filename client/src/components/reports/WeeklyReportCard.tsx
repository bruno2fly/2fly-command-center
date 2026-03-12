"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import type { ClientWeeklyReport } from "@/lib/api";
import { KPICards } from "./KPICards";
import { AgentActionsList } from "./AgentActionsList";
import { WeeklySummary } from "./WeeklySummary";

type Props = {
  report: ClientWeeklyReport;
  isLatest?: boolean;
  defaultExpanded?: boolean;
};

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const s = new Date(weekStart + "T12:00:00");
  const e = new Date(weekEnd + "T12:00:00");
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export function WeeklyReportCard({ report, isLatest, defaultExpanded = false }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const cardBg = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const headerBorder = isDark ? "border-[#1a1810]" : "border-gray-100";

  const { weekStart, weekEnd, ads, agentActions, trends, summary } = report;

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-sm ${cardBg}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`w-full px-4 py-3 flex items-center justify-between text-left border-b ${headerBorder}`}
      >
        <span className={`font-semibold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
          📊 Week of {formatWeekRange(weekStart, weekEnd)}
        </span>
        {isLatest && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Latest
          </span>
        )}
        {!isLatest && (
          <span className={`text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            {expanded ? "▲ Collapse" : "▼ Expand"}
          </span>
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
              <KPICards
                spend={ads.spend}
                leads={ads.leads}
                cpl={ads.cpl}
                ctr={ads.ctr}
                spendChange={trends.spendChange}
                leadsChange={trends.leadsChange}
                cplChange={trends.cplChange}
                ctrChange={trends.ctrChange}
              />
              {ads.topCampaign && (
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <span className="font-medium">Top Campaign: </span>
                  {ads.topCampaign}
                </p>
              )}
              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  🤖 Agent Actions This Week
                </h4>
                <AgentActionsList actions={agentActions} />
              </div>
              <WeeklySummary summary={summary} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
