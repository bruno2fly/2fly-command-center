"use client";

import type { MomentumStats } from "@/lib/founder/mockFounderData";

type Props = {
  stats: MomentumStats;
};

export function MomentumMini({ stats }: Props) {
  const weekGoal = 15;
  const weekPct = Math.min(100, Math.round((stats.completedThisWeek / weekGoal) * 100));

  return (
    <div className="flex items-center gap-4 rounded-xl bg-white border border-gray-100 px-4 py-3">
      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold text-gray-900">{stats.completedToday}</span>
        <span className="text-xs text-gray-400">today</span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      <div className="flex items-center gap-1.5">
        <span className="text-lg font-bold text-emerald-600">{stats.streak}</span>
        <span className="text-xs text-gray-400">streak</span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      {/* Mini progress bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${weekPct}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">
            {stats.completedThisWeek}/{weekGoal}
          </span>
        </div>
      </div>
    </div>
  );
}
