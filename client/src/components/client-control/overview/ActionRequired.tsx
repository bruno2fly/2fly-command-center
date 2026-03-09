"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { CommandSection } from "@/components/ui/CommandSection";
import { SeverityBadge, type SeverityLevel } from "@/components/ui/SeverityBadge";

type TaskItem = {
  id: string;
  title: string;
  source: "task" | "request";
  sourceLabel?: string;
  priority: "high" | "medium" | "low";
  assignee?: string;
  dueAt: string | null;
};

type Props = {
  tasks: TaskItem[];
  limit?: number;
  onDoIt?: (id: string) => void;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priorityToSeverity(p: "high" | "medium" | "low"): SeverityLevel {
  if (p === "high") return "critical";
  if (p === "medium") return "important";
  return "routine";
}

export function ActionRequired({ tasks, limit = 5, onDoIt }: Props) {
  const { isDark } = useTheme();
  const topTasks = tasks.slice(0, limit);

  const rowCls = (p: string) =>
    p === "high"
      ? isDark ? "bg-red-500/5 border-red-500/20" : "bg-red-50/50 border-red-100"
      : p === "medium"
        ? isDark ? "bg-amber-500/5 border-amber-500/20" : "bg-amber-50/50 border-amber-100"
        : isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-gray-50 border-gray-100";

  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const metaCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const btnCls = isDark
    ? "px-2 py-1 rounded text-[10px] font-medium border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20"
    : "px-2 py-1 rounded text-[10px] font-medium border border-blue-300 text-blue-600 hover:bg-blue-50";

  const divideCls = isDark ? "divide-[#1a1810]" : "divide-gray-100";

  return (
    <CommandSection title="Action Required">
      <div className={`divide-y empty:divide-y-0 ${divideCls}`}>
        {topTasks.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className={`text-sm ${metaCls}`}>No actions required.</p>
          </div>
        ) : (
          topTasks.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-4 px-4 py-3 ${rowCls(t.priority)}`}
            >
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium truncate ${textCls}`}>{t.title}</p>
                <p className={`text-[10px] mt-0.5 ${metaCls}`}>
                  {t.source === "task" ? t.assignee : t.sourceLabel ?? "Request"} · Due {formatDate(t.dueAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SeverityBadge level={priorityToSeverity(t.priority)} size="sm" />
                <button type="button" onClick={() => onDoIt?.(t.id)} className={btnCls}>
                  Do it
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </CommandSection>
  );
}
