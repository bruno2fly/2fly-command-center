"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import type { ApiAgentAction } from "@/lib/api";

type Props = {
  action: ApiAgentAction;
  onExecute?: (id: string) => void;
  onReject?: (id: string) => void;
  onClear?: (id: string) => void;
  variant: "pending" | "executing" | "completed" | "rejected";
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day(s) ago`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  normal: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function AgentActionCard({ action, onExecute, onReject, onClear, variant }: Props) {
  const { isDark } = useTheme();
  const [reasoningOpen, setReasoningOpen] = useState(false);
  const priority = (action.priority as string) || "normal";
  const priorityCls = PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.normal;

  const isFailed = variant === "completed" && action.status === "failed";
  const cardBg =
    variant === "rejected"
      ? isDark
        ? "bg-gray-900/50 border-gray-700 opacity-75"
        : "bg-gray-50 border-gray-200 opacity-90"
      : variant === "completed"
        ? isFailed
          ? isDark
            ? "bg-red-950/30 border-red-500/30 border-l-4"
            : "bg-red-50/80 border-red-200 border-l-4"
          : isDark
            ? "bg-[rgba(16,32,24,0.5)] border-emerald-500/30 border-l-4"
            : "bg-emerald-50/80 border-emerald-200 border-l-4"
        : isDark
          ? "bg-[rgba(30,41,59,0.6)] border-[rgba(51,65,85,0.5)]"
          : "bg-white border-gray-200";

  const titleCls = variant === "rejected" ? "line-through opacity-80" : "";

  return (
    <div className={`rounded-xl border p-5 ${cardBg}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {variant === "pending" && (
              <span className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${priorityCls}`}>
                {priority === "urgent" ? "🔴 Urgent" : priority === "high" ? "🟡 High" : priority === "normal" ? "🟢 Normal" : "Low"}
              </span>
            )}
            {variant === "rejected" && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                ❌ Rejected
              </span>
            )}
            {variant === "completed" && (
              <span className={isFailed ? "text-red-500 font-medium" : "text-emerald-500 font-medium"}>
                {isFailed ? "✗ Failed" : "✓"}
              </span>
            )}
            {action.clientName && (
              <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {action.clientName}
              </span>
            )}
          </div>
          <h3 className={`font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"} ${titleCls}`}>
            {action.title}
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            📊 {action.agentName} · Proposed {timeAgo(action.createdAt)}
          </p>
        </div>
      </div>

      {variant === "pending" || variant === "rejected" ? (
        <>
          <button
            type="button"
            onClick={() => setReasoningOpen((o) => !o)}
            className={`text-sm font-medium mb-2 ${isDark ? "text-emerald-400 hover:text-emerald-300" : "text-emerald-600 hover:text-emerald-700"}`}
          >
            {reasoningOpen ? "Hide reasoning" : "View reasoning"}
          </button>
          {reasoningOpen && (
            <div className={`rounded-lg p-3 mb-4 text-sm whitespace-pre-wrap ${isDark ? "bg-black/30 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
              {action.reasoning}
            </div>
          )}
          <div className={`rounded-lg p-3 mb-4 text-sm whitespace-pre-wrap ${isDark ? "bg-black/20 text-gray-400" : "bg-gray-50 text-gray-600"}`}>
            <span className="font-medium text-xs uppercase tracking-wider opacity-80">Proposed action</span>
            <div className="mt-1">{action.proposedAction}</div>
          </div>
        </>
      ) : null}

      {variant === "executing" && (
        <div className="flex items-center gap-3 py-2 text-amber-500">
          <span className="inline-block w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Executing…</span>
        </div>
      )}

      {variant === "completed" && (
        <>
          {action.status === "failed" && action.errorMessage && (
            <div className="rounded-lg p-3 mb-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {action.errorMessage}
            </div>
          )}
          {action.result && (
            <div className={`rounded-lg p-3 mb-3 text-sm ${isDark ? "bg-black/20 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
              {action.result}
            </div>
          )}
          <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            {action.approvedAt && <span>Approved {formatDate(action.approvedAt)}</span>}
            {action.completedAt && <span>Completed {formatDate(action.completedAt)}</span>}
          </div>
        </>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {variant === "pending" && (
          <>
            {onExecute && (
              <button
                type="button"
                onClick={() => onExecute(action.id)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-colors"
              >
                Execute ✅
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={() => onReject(action.id)}
                className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 border border-red-500/30 transition-colors"
              >
                ❌ Reject
              </button>
            )}
          </>
        )}
        {variant === "completed" && onClear && (
          <button
            type="button"
            onClick={() => onClear(action.id)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
