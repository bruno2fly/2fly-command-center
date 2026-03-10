"use client";

import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import {
  getMockAgentActivities,
  getAgentBorderColor,
  getDiscordUrlForChannel,
  formatActivityTime,
  type AgentActivity,
} from "@/lib/founder/agentActivity";

const MAX_ITEMS = 10;

const STATUS_CONFIG: Record<AgentActivity["status"], { label: string; className: string }> = {
  completed: { label: "Completed", className: "text-emerald-600 dark:text-emerald-400" },
  running: { label: "Running", className: "text-blue-600 dark:text-blue-400 animate-pulse" },
  scheduled: { label: "Scheduled", className: "text-gray-500 dark:text-gray-400" },
  error: { label: "Error", className: "text-red-600 dark:text-red-400" },
};

export function AgentActivityFeed() {
  const { isDark } = useTheme();
  const activities = useMemo(() => getMockAgentActivities(MAX_ITEMS), []);

  const cardBg = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const borderCls = isDark ? "border-[#1a1810]" : "border-gray-100";

  return (
    <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      <div className={`px-4 py-3 border-b ${borderCls} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            🤖 Agent Activity
          </h3>
          <span className="flex items-center gap-1 text-[10px] text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
        <a
          href={getDiscordUrlForChannel("#boss")}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[10px] uppercase tracking-wider ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
        >
          View all →
        </a>
      </div>

      <div className={`divide-y ${borderCls} max-h-[420px] overflow-y-auto`}>
        {activities.map((act, idx) => (
          <motion.article
            key={act.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
            className={`pl-4 border-l-4 ${getAgentBorderColor(act.agentId)} ${isDark ? "hover:bg-[#141210]" : "hover:bg-gray-50"}`}
          >
            <div className="py-3 pr-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-800"}`}>
                    {act.agentEmoji} {act.agentName} · {formatActivityTime(act.timestamp)}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                    {act.action}
                  </p>
                  <p className={`text-xs mt-1.5 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    &quot;{act.summary}&quot;
                  </p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <a
                      href={getDiscordUrlForChannel(act.channel)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-[10px] font-medium ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
                    >
                      View Full Report →
                    </a>
                    <span className={`text-[10px] ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                      {act.channel}
                    </span>
                  </div>
                </div>
                <span className={`shrink-0 text-[10px] font-medium ${STATUS_CONFIG[act.status].className}`}>
                  {act.status === "completed" && "🟢"}
                  {act.status === "running" && "🔵"}
                  {act.status === "scheduled" && "⏰"}
                  {act.status === "error" && "🔴"}
                  {" "}
                  {STATUS_CONFIG[act.status].label}
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
