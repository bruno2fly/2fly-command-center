"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { AgentActionCard } from "./ActionCard";
import type { ApiAgentAction } from "@/lib/api";

type Props = {
  actions: ApiAgentAction[];
  onClear: (id: string) => void;
  onClearAll: () => void;
};

export function CompletedActions({ actions, onClear, onClearAll }: Props) {
  const { isDark } = useTheme();
  const completed = actions.filter((a) => a.status === "completed" || a.status === "failed");

  if (completed.length === 0) {
    return (
      <div className={`py-12 text-center rounded-xl ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        <p className="text-sm">No completed actions yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClearAll}
          className="px-3 py-1.5 rounded-lg text-sm bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
        >
          Clear All
        </button>
      </div>
      {completed.map((action) => (
        <AgentActionCard
          key={action.id}
          action={action}
          variant="completed"
          onClear={onClear}
        />
      ))}
    </div>
  );
}
