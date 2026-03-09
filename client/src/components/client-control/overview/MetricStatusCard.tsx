"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  label: string;
  value: string;
  status?: "ok" | "warning" | "critical" | "neutral";
};

export function MetricStatusCard({ label, value, status = "neutral" }: Props) {
  const { isDark } = useTheme();

  const valueCls =
    status === "ok"
      ? isDark ? "text-emerald-400" : "text-emerald-600"
      : status === "warning"
        ? isDark ? "text-amber-400" : "text-amber-600"
        : status === "critical"
          ? isDark ? "text-red-400" : "text-red-600"
          : isDark ? "text-[#c4b8a8]" : "text-gray-900";

  const cardCls = isDark
    ? "bg-[#0a0a0e] border-[#1a1810] hover:border-[#2a2018]"
    : "bg-white border-gray-200 hover:border-gray-300";
  const labelCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <div
      className={`flex flex-col gap-0.5 px-3 py-2 rounded-lg border transition-colors min-w-[72px] ${cardCls}`}
    >
      <span className={`text-[10px] font-medium uppercase tracking-wider ${labelCls}`}>{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${valueCls}`}>{value}</span>
    </div>
  );
}
