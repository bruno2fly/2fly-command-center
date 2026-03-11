"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type HealthStatus = "good" | "attention" | "critical";

type Props = {
  icon: string;
  label: string;
  status: HealthStatus;
  summary: string;
  onView: () => void;
};

const STATUS_STYLES: Record<HealthStatus, { border: string; icon: string; label: string }> = {
  good: {
    border: "border-l-[#22c55e]",
    icon: "✅",
    label: "Good",
  },
  attention: {
    border: "border-l-[#eab308]",
    icon: "⚠️",
    label: "Needs Attention",
  },
  critical: {
    border: "border-l-[#ef4444]",
    icon: "🔴",
    label: "Critical",
  },
};

export function HealthRow({ icon, label, status, summary, onView }: Props) {
  const { isDark } = useTheme();
  const style = STATUS_STYLES[status];
  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const summaryCls = isDark ? "text-gray-500" : "text-gray-600";

  return (
    <button
      type="button"
      onClick={onView}
      className={`w-full text-left rounded-xl border border-l-4 ${style.border} ${cardBg} ${cardBorder} px-4 py-3 flex items-center justify-between gap-3 hover:shadow-md hover:border-opacity-80 transition-all duration-200 cursor-pointer`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-xl shrink-0" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium ${textCls}`}>{label}</span>
            <span className={`text-xs ${summaryCls}`}>
              {style.icon} {style.label}
            </span>
          </div>
          <p className={`text-xs mt-0.5 truncate ${summaryCls}`}>{summary}</p>
        </div>
      </div>
      <span className={`text-xs font-medium shrink-0 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
        View →
      </span>
    </button>
  );
}
