"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { ReactNode } from "react";

type Props = {
  title: string;
  accent?: "fire" | "waiting" | "live" | "neutral";
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const TITLE_COLORS: Record<NonNullable<Props["accent"]>, { dark: string; light: string }> = {
  fire: { dark: "text-emerald-400/90", light: "text-blue-600" },
  waiting: { dark: "text-[#8a7e6d]", light: "text-gray-600" },
  live: { dark: "text-[#8a7e6d]", light: "text-gray-600" },
  neutral: { dark: "text-[#8a7e6d]", light: "text-gray-600" },
};

export function CommandSection({
  title,
  accent = "neutral",
  action,
  children,
  className = "",
}: Props) {
  const { isDark } = useTheme();
  const titleColors = TITLE_COLORS[accent];

  return (
    <section
      className={`rounded-xl border overflow-hidden ${
        isDark ? "border-[#1a1810]" : "border-gray-200"
      } ${isDark ? "bg-[#0a0a0e]/60" : "bg-white"} ${className}`}
    >
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? titleColors.dark : titleColors.light
          }`}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}
