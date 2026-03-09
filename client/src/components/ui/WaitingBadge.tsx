"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type WaitingVariant = "on_me" | "on_client" | "on_team";

type Props = {
  variant: WaitingVariant;
  count?: number;
};

const LABELS: Record<WaitingVariant, string> = {
  on_me: "On Me",
  on_client: "On Client",
  on_team: "On Team",
};

export function WaitingBadge({ variant, count }: Props) {
  const { isDark } = useTheme();

  const isOnMe = variant === "on_me";

  const badgeCls =
    variant === "on_me"
      ? isDark
        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
        : "bg-emerald-100 text-emerald-700 border-emerald-200"
      : isDark
        ? "bg-[#141210] text-[#8a7e6d] border-[#2a2018]"
        : "bg-gray-100 text-gray-600 border-gray-200";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border ${badgeCls}`}
    >
      {isOnMe && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
      )}
      {LABELS[variant]}
      {count !== undefined && count > 0 && (
        <span className="opacity-75">({count})</span>
      )}
    </span>
  );
}
