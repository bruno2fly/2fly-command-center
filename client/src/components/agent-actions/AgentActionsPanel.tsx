"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api, type ApiAgentAction } from "@/lib/api";
import { PendingActions } from "./PendingActions";
import { CompletedActions } from "./CompletedActions";
import { AgentActionCard } from "./ActionCard";

type TabId = "pending" | "approved" | "completed";

type Props = {
  clientId?: string;
};

export function AgentActionsPanel({ clientId }: Props) {
  const { isDark } = useTheme();
  const [tab, setTab] = useState<TabId>("pending");
  const [actions, setActions] = useState<ApiAgentAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(() => {
    setLoading(true);
    api
      .getAgentActions(clientId ? { clientId, status: undefined } : undefined)
      .then((r) => setActions(r.actions ?? []))
      .catch(() => setActions([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const pending = actions.filter((a) => a.status === "pending" || a.status === "rejected");
  const approvedOrExecuting = actions.filter((a) => a.status === "approved" || a.status === "executing");
  const completed = actions.filter((a) => a.status === "completed" || a.status === "failed");

  // When on Approved tab, poll briefly so "Executing..." updates to Completed
  useEffect(() => {
    if (tab !== "approved" || approvedOrExecuting.length === 0) return;
    const t = setInterval(fetchActions, 3000);
    return () => clearInterval(t);
  }, [tab, approvedOrExecuting.length, fetchActions]);

  const handleExecute = useCallback(
    (id: string) => {
      api.executeAgentAction(id).then(() => fetchActions()).catch(() => fetchActions());
    },
    [fetchActions]
  );

  const handleReject = useCallback(
    (id: string) => {
      api.patchAgentAction(id, { status: "rejected" }).then(() => fetchActions()).catch(() => fetchActions());
    },
    [fetchActions]
  );

  const handleClear = useCallback(
    (id: string) => {
      api.deleteAgentAction(id).then(() => fetchActions()).catch(() => fetchActions());
    },
    [fetchActions]
  );

  const handleClearAll = useCallback(() => {
    api.clearCompletedActions().then(() => fetchActions()).catch(() => fetchActions());
  }, [fetchActions]);

  const borderCls = isDark ? "border-gray-800" : "border-gray-200";
  const tabCls = (active: boolean) =>
    active
      ? isDark
        ? "text-emerald-400 border-b-2 border-emerald-500"
        : "text-emerald-600 border-b-2 border-emerald-500"
      : isDark
        ? "text-gray-500 hover:text-gray-300"
        : "text-gray-500 hover:text-gray-700";

  return (
    <section className={`rounded-xl border-2 overflow-hidden ${isDark ? "bg-[#0a0a0e] border-emerald-500/20" : "bg-white border-emerald-200"}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${borderCls}`}>
        <h2 className={`text-sm font-semibold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
          🤖 Agent Actions
        </h2>
        <div className="flex gap-1">
          {(
            [
              { id: "pending" as TabId, label: "Pending", count: pending.length },
              { id: "approved" as TabId, label: "Approved", count: approvedOrExecuting.length },
              { id: "completed" as TabId, label: "Completed", count: completed.length },
            ] as const
          ).map(({ id, label, count }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${tabCls(tab === id)}`}
            >
              {label} {count > 0 ? `(${count})` : ""}
            </button>
          ))}
        </div>
      </div>
      <div className={`p-4 min-h-[200px] max-h-[420px] overflow-y-auto ${isDark ? "bg-[#0a0a0e]" : "bg-white"}`}>
        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>
        ) : tab === "pending" ? (
          <PendingActions actions={actions} onExecute={handleExecute} onReject={handleReject} />
        ) : tab === "approved" ? (
          approvedOrExecuting.length === 0 ? (
            <div className={`py-12 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              No actions in progress.
            </div>
          ) : (
            <div className="space-y-4">
              {approvedOrExecuting.map((action) => (
                <AgentActionCard
                  key={action.id}
                  action={action}
                  variant="executing"
                />
              ))}
            </div>
          )
        ) : (
          <CompletedActions actions={actions} onClear={handleClear} onClearAll={handleClearAll} />
        )}
      </div>
    </section>
  );
}
