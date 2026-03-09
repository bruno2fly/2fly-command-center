"use client";

import { useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import type { AgentAction, AgentActionStatus } from "@/lib/client/mockAdsData";

type Props = {
  actions: AgentAction[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
};

type FilterTab = "all" | "pending" | "approved" | "rejected";

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function AgentActionsPanel({ actions, onApprove, onReject }: Props) {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered =
    filter === "all"
      ? actions
      : filter === "pending"
        ? actions.filter((a) => a.status === "pending")
        : filter === "approved"
          ? actions.filter((a) => a.status === "approved" || a.status === "auto_applied")
          : actions.filter((a) => a.status === "rejected");

  const pendingCount = actions.filter((a) => a.status === "pending").length;

  const statusCls = (s: AgentActionStatus) => {
    if (s === "pending") return isDark ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-100 text-amber-700 border-amber-200";
    if (s === "approved" || s === "auto_applied") return isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-200";
    return isDark ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-red-100 text-red-700 border-red-200";
  };

  const statusLabel = (s: AgentActionStatus) =>
    s === "pending" ? "Pending Approval" : s === "approved" ? "Approved" : s === "auto_applied" ? "Auto-Applied" : "Rejected";

  const panelCls = isDark ? "bg-[#0a0a0e] border-emerald-500/20" : "bg-white border-emerald-200";
  const tabCls = (active: boolean) =>
    active
      ? isDark
        ? "text-emerald-400 border-b-2 border-emerald-500"
        : "text-emerald-600 border-b-2 border-emerald-500"
      : isDark
        ? "text-[#8a7e6d] hover:text-[#c4b8a8]"
        : "text-gray-500 hover:text-gray-700";

  return (
    <section className={`rounded-xl border-2 overflow-hidden ${panelCls}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <h2 className={`text-sm font-semibold ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>
          🤖 Agent Actions
        </h2>
        <div className="flex gap-1">
          {(["all", "pending", "approved", "rejected"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider ${tabCls(filter === t)}`}
            >
              {t === "pending" && pendingCount > 0 ? `${t} (${pendingCount})` : t}
            </button>
          ))}
        </div>
      </div>
      <div className={`max-h-[320px] overflow-y-auto divide-y ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
        {filtered.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
              {filter === "pending"
                ? "No pending actions — your campaigns are running smoothly"
                : `No ${filter} actions`}
            </p>
          </div>
        ) : (
          filtered.map((a) => (
            <div
              key={a.id}
              className={`px-4 py-3 transition-colors ${
                a.status === "pending"
                  ? isDark
                    ? "bg-amber-500/5"
                    : "bg-amber-50/50"
                  : isDark
                    ? "hover:bg-[#0c0c10]"
                    : "hover:bg-gray-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-[10px] ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                      {formatTime(a.createdAt)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${statusCls(a.status)} ${a.status === "pending" ? "animate-pulse" : ""}`}
                    >
                      {statusLabel(a.status)}
                    </span>
                  </div>
                  <p className={`text-sm ${isDark ? "text-[#c4b8a8]" : "text-gray-800"}`}>
                    {a.action}
                  </p>
                  {a.status === "pending" && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => onApprove?.(a.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => onReject?.(a.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    className={`mt-2 text-xs font-medium ${isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"}`}
                  >
                    {expandedId === a.id ? "Hide reasoning" : "View reasoning"}
                  </button>
                  {expandedId === a.id && (
                    <div className={`mt-2 p-2 rounded-lg text-xs ${isDark ? "bg-[#0c0c10] text-[#8a7e6d]" : "bg-gray-100 text-gray-600"}`}>
                      {a.reasoning}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
