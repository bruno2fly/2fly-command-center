"use client";

import { useEffect } from "react";
import { useAgentChat, AGENTS } from "@/contexts/AgentChatContext";
import { AgentStatusBadge } from "../agent-chat/AgentStatusBadge";

export function AgentStatusWidget() {
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">AI Agents</h3>
          <AgentStatusBadge online={gatewayOnline} size="sm" />
        </div>
        <span className="text-[10px] text-gray-400 uppercase tracking-wider">
          {gatewayOnline ? "Gateway Online" : "Gateway Offline"}
        </span>
      </div>

      {/* Agent list */}
      <div className="divide-y divide-gray-50">
        {AGENTS.map((agent) => {
          const status = agentStatuses.find((s) => s.id === agent.id);
          const isOnline = status?.online ?? gatewayOnline;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => handleAgentClick(agent.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
            >
              <span className="text-lg shrink-0">{agent.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-gray-800">{agent.name}</span>
                  <AgentStatusBadge online={isOnline} size="sm" />
                </div>
                <p className="text-[11px] text-gray-500 truncate">{agent.description}</p>
              </div>
              <svg className="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Quick action footer */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
        <button
          type="button"
          onClick={() => handleAgentClick("founder-boss")}
          className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
        >
          Ask Founder Boss for a pulse
        </button>
      </div>
    </div>
  );
}
