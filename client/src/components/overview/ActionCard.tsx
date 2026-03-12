"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { ApiAction } from "@/lib/api";

type Props = {
  action: ApiAction;
  position: number;
  total: number;
  onApprove?: () => void;
  onReject?: () => void;
  onComplete?: () => void;
  onStart?: () => void;
  onAcknowledge?: () => void;
  onResolve?: () => void;
  onExecute?: () => void;
  onSkip?: () => void;
};

function formatDue(dueDate: string | null, isOverdue: boolean): string | null {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return isOverdue ? `${formatted} — overdue` : `Due: ${formatted}`;
}

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

const PRIORITY_STYLE = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  normal: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  low: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

export function ActionCard({
  action,
  position,
  total,
  onApprove,
  onReject,
  onComplete,
  onStart,
  onAcknowledge,
  onResolve,
  onExecute,
  onSkip,
}: Props) {
  const { isDark } = useTheme();
  const priority = (action.priority as keyof typeof PRIORITY_STYLE) || "normal";
  const cardBg = isDark ? "bg-[rgba(30,41,59,0.8)] border-[rgba(51,65,85,0.5)]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  const dueStr = formatDue(action.dueDate, action.isOverdue);

  return (
    <div className={`rounded-2xl border ${cardBg} p-6 shadow-lg`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${PRIORITY_STYLE[priority] ?? PRIORITY_STYLE.normal}`}>
          {action.isOverdue ? "OVERDUE" : action.priority.toUpperCase()}
        </span>
        <span className={`text-xs ${mutedCls}`}>{position} of {total}</span>
      </div>

      <h3 className={`text-lg font-semibold ${textCls} mb-1`}>{action.title}</h3>
      <p className={`text-xs ${mutedCls} mb-3`}>
        Created by {action.sourceName} · {timeAgo(action.createdAt)}
      </p>
      {dueStr && (
        <p className={`text-xs mb-4 ${action.isOverdue ? "text-red-400" : mutedCls}`}>{dueStr}</p>
      )}

      <div className="flex flex-wrap gap-3">
        {action.entityType === "content" && (
          <>
            {onApprove && (
              <button
                type="button"
                onClick={onApprove}
                className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
              >
                ✅ Approve
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
              >
                ❌ Reject
              </button>
            )}
          </>
        )}
        {action.entityType === "task" && (
          <>
            {action.taskStatus === "in_progress" && onComplete && (
              <button
                type="button"
                onClick={onComplete}
                className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
              >
                Complete ✅
              </button>
            )}
            {action.taskStatus === "pending" && onStart && (
              <button
                type="button"
                onClick={onStart}
                className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors"
              >
                Start →
              </button>
            )}
          </>
        )}
        {action.entityType === "request" && (
          <>
            {onAcknowledge && (
              <button
                type="button"
                onClick={onAcknowledge}
                className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-amber-500 text-white font-medium hover:bg-amber-600 transition-colors"
              >
                ✅ Acknowledge
              </button>
            )}
            {onResolve && (
              <button
                type="button"
                onClick={onResolve}
                className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
              >
                ✔️ Resolve
              </button>
            )}
          </>
        )}
        {action.entityType === "agent_action" && (
          <>
            {onExecute && (
              <button
                type="button"
                onClick={onExecute}
                className="flex-1 min-w-[120px] py-3 px-4 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors"
              >
                Execute ✅
              </button>
            )}
            {onReject && (
              <button
                type="button"
                onClick={onReject}
                className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
              >
                ❌ Reject
              </button>
            )}
          </>
        )}
        {onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 min-w-[100px] py-3 px-4 rounded-xl bg-gray-500/20 text-gray-400 font-medium hover:bg-gray-500/30 transition-colors"
          >
            ➡️ Skip
          </button>
        )}
      </div>

      <div className="flex justify-center gap-1.5 mt-6">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === position - 1 ? (isDark ? "bg-blue-400" : "bg-blue-600") : isDark ? "bg-gray-600" : "bg-gray-300"
            }`}
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}
