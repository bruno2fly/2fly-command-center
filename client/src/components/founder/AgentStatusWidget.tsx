"use client";

import { useEffect } from "react";
import { useAgentChat, AGENTS } from "@/contexts/AgentChatContext";
import { useTheme } from "@/contexts/ThemeContext";
import { AgentStatusBadge } from "../agent-chat/AgentStatusBadge";

export function AgentStatusWidget() {
  const { isDark } = useTheme();
  const {
    gatewayOnline,
    agentStatuses,
    refreshStatus,
    openPanel,
    setActiveAgent,
  } = useAgentChat();

  // Refresh status on mount and every 30 seconds
  useEffect(() => {
    refreshStatus();
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  function handleAgentClick(agentId: string) {
    setActiveAgent(agentId as typeof AGENTS[number]["id"]);
    openPanel();
  }

  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200"}`}>
      {/* Header */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>AI Agents</h3>
          <AgentStatusBadge online={gatewayOnline} size="sm" />
        </div>
        <span className={`text-[10px] uppercase tracking-wider ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
          {gatewayOnline ? "Gateway Online" : "Gateway Offline"}
        </span>
      </div>

      {/* Agent list */}
      <div className={isDark ? "divide-y divide-[#1a1810]" : "divide-y divide-gray-50"}>
        {AGENTS.map((agent) => {
          const status = agentStatuses.find((s) => s.id === agent.id);
          const isOnline = status?.online ?? gatewayOnline;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => handleAgentClick(agent.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${isDark ? "hover:bg-[#141210]" : "hover:bg-gray-50"}`}
            >
              <span className="text-lg shrink-0">{agent.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-800"}`}>{agent.name}</span>
                  <AgentStatusBadge online={isOnline} size="sm" />
                </div>
                <p className={`text-[11px] truncate ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{agent.description}</p>
              </div>
              <svg className={`w-3.5 h-3.5 shrink-0 ${isDark ? "text-[#3a3a40]" : "text-gray-300"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Quick action footer */}
      <div className={`px-4 py-2.5 border-t ${isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-100 bg-gray-50/50"}`}>
        <button
          type="button"
          onClick={() => handleAgentClick("founder-boss")}
          className={`w-full text-center text-xs font-medium py-1 ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-700"}`}
        >
          Ask Founder Boss for a pulse
        </button>
      </div>
    </div>
  );
}
