"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Action = { title: string; status: string; result: string | null };

type Props = {
  actions: Action[];
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: "✅ Completed", className: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  pending: { label: "⏳ Pending", className: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  rejected: { label: "❌ Rejected", className: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30" },
  executing: { label: "🔄 Executing", className: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  failed: { label: "❌ Failed", className: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30" },
};

export function AgentActionsList({ actions }: Props) {
  const { isDark } = useTheme();
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-800";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  if (actions.length === 0) {
    return (
      <p className={`text-sm ${mutedCls}`}>No agent actions this week.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {actions.map((a, i) => {
        const config = STATUS_CONFIG[a.status] ?? { label: a.status, className: "bg-gray-500/20 text-gray-600 dark:text-gray-400" };
        return (
          <li key={i} className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${textCls}`}>{a.title}</span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${config.className}`}>
                {config.label}
              </span>
            </div>
            {a.result && (
              <p className={`text-xs ${mutedCls}`}>{a.result}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
