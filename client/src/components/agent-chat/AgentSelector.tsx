"use client";

import { useAgentChat, AGENTS, type AgentId } from "@/contexts/AgentChatContext";
import { AgentStatusBadge } from "./AgentStatusBadge";

interface AgentSelectorProps {
  compact?: boolean;
}

export function AgentSelector({ compact = false }: AgentSelectorProps) {
  const { activeAgent, setActiveAgent, gatewayOnline } = useAgentChat();

  if (compact) {
    return (
      <select
        value={activeAgent}
        onChange={(e) => setActiveAgent(e.target.value as AgentId)}
        className="bg-gray-800 text-gray-200 text-xs border border-gray-700 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {AGENTS.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.emoji} {agent.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="space-y-0.5">
      {AGENTS.map((agent) => {
        const isActive = activeAgent === agent.id;
        return (
          <button
            key={agent.id}
            type="button"
            onClick={() => setActiveAgent(agent.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              isActive
                ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/60"
            }`}
          >
            <span className="text-base shrink-0">{agent.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-xs">{agent.name}</span>
                <AgentStatusBadge online={gatewayOnline} />
              </div>
              <p className="text-[10px] text-gray-500 truncate">{agent.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
