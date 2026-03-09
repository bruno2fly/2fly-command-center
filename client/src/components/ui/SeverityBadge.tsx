"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type SeverityLevel = "critical" | "important" | "routine";

type Props = {
  level: SeverityLevel;
  label?: string;
  size?: "sm" | "md";
};

const LABELS: Record<SeverityLevel, string> = {
  critical: "Critical",
  important: "Important",
  routine: "Routine",
};

export function SeverityBadge({ level, label, size = "sm" }: Props) {
  const { isDark } = useTheme();

  const displayLabel = label ?? LABELS[level];

  const baseCls =
    level === "critical"
      ? isDark
        ? "bg-red-500/20 text-red-400 border-red-500/30"
        : "bg-red-100 text-red-700 border-red-200"
      : level === "important"
        ? isDark
          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
          : "bg-amber-100 text-amber-700 border-amber-200"
        : isDark
          ? "bg-[#1a1810] text-[#8a7e6d] border-[#2a2018]"
          : "bg-gray-100 text-gray-600 border-gray-200";

  const sizeCls = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-semibold uppercase tracking-wider border ${baseCls} ${sizeCls}`}
    >
      {level !== "routine" && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            level === "critical" ? "bg-red-500" : "bg-amber-500"
          }`}
        />
      )}
      {displayLabel}
    </span>
  );
}
