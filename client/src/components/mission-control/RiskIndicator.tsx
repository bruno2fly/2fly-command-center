"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type RiskLevel = "critical" | "warning" | "info" | "ok";

const STYLES: Record<
  RiskLevel,
  { dark: string; light: string; dot: string }
> = {
  critical: {
    dark: "bg-red-500/10 border-red-500/30 text-red-400",
    light: "bg-red-50 border-red-200 text-red-700",
    dot: "bg-red-500",
  },
  warning: {
    dark: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    light: "bg-amber-50 border-amber-200 text-amber-700",
    dot: "bg-amber-500",
  },
  info: {
    dark: "bg-blue-500/10 border-blue-500/30 text-blue-400",
    light: "bg-blue-50 border-blue-200 text-blue-700",
    dot: "bg-blue-500",
  },
  ok: {
    dark: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    light: "bg-emerald-50 border-emerald-200 text-emerald-700",
    dot: "bg-emerald-500",
  },
};

type Props = {
  level: RiskLevel;
  message: string;
  detail?: string;
};

export function RiskIndicator({ level, message, detail }: Props) {
  const { isDark } = useTheme();
  const s = STYLES[level];
  const styles = isDark ? s.dark : s.light;

  return (
    <div
      className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border ${styles}`}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{message}</p>
        {detail && (
          <p className={`text-xs mt-0.5 ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
