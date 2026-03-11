"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { AgentActionCard } from "./ActionCard";
import type { ApiAgentAction } from "@/lib/api";

type Props = {
  actions: ApiAgentAction[];
  onExecute: (id: string) => void;
  onReject: (id: string) => void;
};

export function PendingActions({ actions, onExecute, onReject }: Props) {
  const { isDark } = useTheme();
  const pending = actions.filter((a) => a.status === "pending");
  const rejected = actions.filter((a) => a.status === "rejected");

  if (pending.length === 0 && rejected.length === 0) {
    return (
      <div className={`py-12 text-center rounded-xl ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        <p className="text-sm">No pending actions — your campaigns are running smoothly.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.map((action) => (
        <AgentActionCard
          key={action.id}
          action={action}
          variant="pending"
          onExecute={onExecute}
          onReject={onReject}
        />
      ))}
      {rejected.length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className={`text-xs font-medium uppercase tracking-wider mb-3 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Rejected
          </p>
          <div className="space-y-3">
            {rejected.map((action) => (
              <AgentActionCard
                key={action.id}
                action={action}
                variant="rejected"
                onReject={onReject}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
