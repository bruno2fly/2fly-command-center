"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { MomentumStats } from "@/lib/founder/mockFounderData";

type Props = {
  stats: MomentumStats;
};

export function MomentumWidget({ stats }: Props) {
  const { isDark } = useTheme();
  const weekGoal = 15;
  const pct = Math.min(100, Math.round((stats.completedThisWeek / weekGoal) * 100));

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <div className={`rounded-xl border p-4 ${baseCls}`}>
      <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
        📊 Momentum
      </h3>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className={`text-xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>{stats.completedToday}</p>
          <p className={`text-[10px] ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Today</p>
        </div>
        <div>
          <p className={`text-xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>{stats.completedThisWeek}</p>
          <p className={`text-[10px] ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Week</p>
        </div>
        <div>
          <p className={`text-xl font-bold text-emerald-500`}>{stats.streak}</p>
          <p className={`text-[10px] ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Streak 🔥</p>
        </div>
      </div>
      <div className="mt-2">
        <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? "bg-[#141210]" : "bg-gray-100"}`}>
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <p className={`text-[10px] mt-1 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          {stats.completedThisWeek}/{weekGoal} this week
        </p>
      </div>
    </div>
  );
}
