"use client";

import type { MomentumStats } from "@/lib/founder/mockFounderData";

type Props = {
  stats: MomentumStats;
};

export function MomentumModule({ stats }: Props) {
  const weekGoal = 15;
  const weekPct = Math.min(100, Math.round((stats.completedThisWeek / weekGoal) * 100));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="font-semibold text-gray-900 text-sm mb-3">Momentum</h3>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
          <p className="text-xs text-gray-500 mt-0.5">Today</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{stats.completedThisWeek}</p>
          <p className="text-xs text-gray-500 mt-0.5">This week</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-600">{stats.streak}</p>
          <p className="text-xs text-gray-500 mt-0.5">Day streak</p>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Week progress</span>
          <span>{stats.completedThisWeek}/{weekGoal}</span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${weekPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}
