"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type AgencyMetrics = {
  problems: { type: string; message: string; clientId?: string }[];
  throughput: {
    tasks_created_this_week: number;
    tasks_completed_this_week: number;
    avg_completion_hours: number;
  };
  team: Record<string, number>;
};

const API = process.env.NEXT_PUBLIC_API_URL || "";

export function TwoFlyFlowOverview() {
  const { isDark } = useTheme();
  const [data, setData] = useState<AgencyMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/clients/agency/2flyflow-overview`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return null;
  if (!data) return null;

  const cardCls = isDark
    ? "bg-[#0a0a0e] border border-white/5 rounded-xl p-4"
    : "bg-white border border-gray-200 rounded-xl p-4";
  const titleCls = isDark ? "text-gray-100" : "text-gray-900";
  const subtleCls = isDark ? "text-gray-400" : "text-gray-500";
  const alertCls = isDark
    ? "bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm"
    : "bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm";
  const warnCls = isDark
    ? "bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400 text-sm"
    : "bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-600 text-sm";
  const metricCls = isDark
    ? "bg-white/5 rounded-lg px-4 py-3 text-center"
    : "bg-gray-50 rounded-lg px-4 py-3 text-center";

  const teamEntries = Object.entries(data.team).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <h3 className={`text-sm font-semibold uppercase tracking-wider ${subtleCls}`}>
        2FlyFlow Overview
      </h3>

      {/* Problems — TOP */}
      {data.problems.length > 0 && (
        <div className={cardCls}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
            ⚡ Problems
          </h4>
          <div className="space-y-2">
            {data.problems.map((p, i) => (
              <div key={i} className={p.type === "overload" ? alertCls : warnCls}>
                {p.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Throughput */}
        <div className={cardCls}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
            Throughput
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className={metricCls}>
              <div className={`text-lg font-bold ${titleCls}`}>{data.throughput.tasks_created_this_week}</div>
              <div className={`text-xs ${subtleCls}`}>Created</div>
            </div>
            <div className={metricCls}>
              <div className={`text-lg font-bold ${titleCls}`}>{data.throughput.tasks_completed_this_week}</div>
              <div className={`text-xs ${subtleCls}`}>Completed</div>
            </div>
            <div className={metricCls}>
              <div className={`text-lg font-bold ${titleCls}`}>{data.throughput.avg_completion_hours}h</div>
              <div className={`text-xs ${subtleCls}`}>Avg Time</div>
            </div>
          </div>
        </div>

        {/* Team Load */}
        <div className={cardCls}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
            Team Load
          </h4>
          <div className="space-y-2">
            {teamEntries.length === 0 && (
              <div className={`text-sm ${subtleCls}`}>No assigned tasks</div>
            )}
            {teamEntries.map(([person, count]) => (
              <div key={person} className={`flex justify-between text-sm ${subtleCls}`}>
                <span>{person}</span>
                <span className={`font-bold ${count > 8 ? "text-red-400" : count > 5 ? "text-amber-400" : titleCls}`}>
                  {count} tasks
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
