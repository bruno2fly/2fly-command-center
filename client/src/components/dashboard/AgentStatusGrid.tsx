"use client";

import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { motion } from "framer-motion";
import { AGENT_SCHEDULE, getMockAgentActivities } from "@/lib/founder/agentActivity";
import type { AgentId } from "@/contexts/AgentChatContext";

export function AgentStatusGrid() {
  const { isDark } = useTheme();
  const { openPanel, setActiveAgent, gatewayOnline } = useAgentChat();
  const activities = useMemo(() => getMockAgentActivities(20), []);

  const statusByAgent = useMemo(() => {
    const map: Record<string, "completed" | "scheduled"> = {};
    for (const a of activities) {
      if (a.status === "completed" && !map[a.agentId]) map[a.agentId] = "completed";
      else if (!map[a.agentId]) map[a.agentId] = "scheduled";
    }
    return map;
  }, [activities]);

  function handleAgentClick(agentId: string) {
    setActiveAgent(agentId as AgentId);
    openPanel();
  }

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.4)] border-[rgba(51,65,85,0.5)] hover:border-blue-500/30" : "bg-white border-gray-200 hover:border-blue-400";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`text-xs font-semibold uppercase tracking-wider ${subCls}`}>
          🤖 Agents
        </h3>
        <span className={`text-[10px] ${subCls}`}>{AGENT_SCHEDULE.length} active</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {AGENT_SCHEDULE.map((agent, i) => {
          const status = statusByAgent[agent.agentId] ?? "scheduled";
          const s = agent.schedule;
          const scheduleShort =
            s === "Daily 9:00 AM" ? "9AM brief"
            : s === "Daily 10:00 AM" ? "10AM scan"
            : s === "Daily 11:00 AM" ? "11AM ads"
            : s === "Sunday 8:00 PM" ? "Sun 8PM"
            : s === "Hourly SLA check" ? "Hourly"
            : s === "On demand" ? "On demand"
            : s === "Always listening" ? "Listening"
            : s;
          return (
            <motion.button
              key={agent.agentId}
              type="button"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => handleAgentClick(agent.agentId)}
              className={`rounded-xl border p-3 text-left transition-all ${cardBg}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{agent.agentEmoji}</span>
                <span className={`text-xs font-medium truncate ${textCls}`}>
                  {agent.agentName.length > 10 ? agent.agentName.slice(0, 8) + "…" : agent.agentName}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${gatewayOnline ? "bg-emerald-500" : "bg-gray-500"}`} />
                <span className={`text-[10px] ${subCls}`}>Online</span>
              </div>
              <p className={`text-[10px] mt-1 ${subCls}`}>{scheduleShort}</p>
              {status === "completed" ? (
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">✅ Done</p>
              ) : (
                <p className={`text-[10px] mt-0.5 ${subCls}`}>⏰ Next</p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
