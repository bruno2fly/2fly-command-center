"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { DashboardTodayResponse } from "@/lib/api";

type Props = {
  data: Pick<DashboardTodayResponse, "greeting" | "date" | "stats">;
};

export function DashboardHeader({ data }: Props) {
  const { isDark } = useTheme();
  const { greeting, date, stats } = data;

  const bg = isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-white border-gray-200";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const pillBg = isDark ? "bg-[#1a1818] border-[#2a2520]" : "bg-gray-50 border-gray-200";

  return (
    <header className={`rounded-xl border px-6 py-5 ${bg}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`text-xl font-semibold ${text}`}>☀️ {greeting}</h1>
          <p className={`text-sm ${muted} mt-0.5`}>{date}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1.5 text-sm ${pillBg} ${muted}`}>
            {stats.activeClients} active clients
          </span>
          <span className={`rounded-full border px-3 py-1.5 text-sm ${pillBg} ${muted}`}>
            ${stats.mrr.toLocaleString()} MRR
          </span>
          <span
            className={`rounded-full border px-3 py-1.5 text-sm ${pillBg} ${
              stats.needsAttention > 0 ? "border-amber-500/40 text-amber-600 dark:text-amber-400" : muted
            }`}
          >
            {stats.needsAttention} item{stats.needsAttention !== 1 ? "s" : ""} need your attention
          </span>
        </div>
      </div>
    </header>
  );
}
