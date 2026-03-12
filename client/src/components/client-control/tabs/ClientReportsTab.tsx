"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api, type DailyReport } from "@/lib/api";
import { WeeklyWrapCard, DailyReportRow } from "@/components/reports";

type Props = {
  clientId: string;
};

type ViewFilter = "all" | "daily" | "weekly";

export function ClientReportsTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ViewFilter>("all");

  useEffect(() => {
    setLoading(true);
    api
      .getClientReports(clientId, { limit: 60 })
      .then((r) => setReports(r.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  const weeklyReports = reports.filter((r) => r.type === "weekly");
  const dailyReports = reports.filter((r) => r.type === "daily");

  const bgCls = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const emptyCls = isDark ? "text-gray-500" : "text-gray-500";
  const tabCls = (active: boolean) =>
    active
      ? isDark
        ? "border-emerald-500/80 text-emerald-400"
        : "border-blue-600 text-blue-600"
      : isDark
        ? "border-transparent text-gray-500 hover:text-gray-300"
        : "border-transparent text-gray-600 hover:text-gray-900";

  if (loading) {
    return (
      <div className={`flex flex-col h-full overflow-auto p-4 ${bgCls}`}>
        <div className="max-w-4xl mx-auto w-full py-12 text-center text-sm text-gray-500">
          Loading reports…
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className={`flex flex-col h-full overflow-auto p-4 ${bgCls}`}>
        <div className="max-w-4xl mx-auto w-full py-12 text-center">
          <p className={`text-sm ${emptyCls}`}>
            No reports yet. Daily reports are generated at 10 PM. Weekly wraps run every Friday.
          </p>
        </div>
      </div>
    );
  }

  const showWeekly = filter === "all" || filter === "weekly";
  const showDaily = filter === "all" || filter === "daily";

  return (
    <div className={`flex flex-col h-full overflow-auto p-4 ${bgCls}`}>
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h2 className={`text-sm font-semibold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
            📊 Reports
          </h2>
          <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {(["all", "daily", "weekly"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tabCls(filter === f)}`}
              >
                {f === "all" ? "All" : f === "daily" ? "Daily" : "Weekly"}
              </button>
            ))}
          </div>
        </div>

        {showWeekly && weeklyReports.length > 0 && (
          <section>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Weekly wraps
            </h3>
            <div className="space-y-3">
              {weeklyReports.map((r, i) => (
                <WeeklyWrapCard
                  key={r.id}
                  report={r}
                  isLatest={i === 0}
                  defaultExpanded={i === 0}
                />
              ))}
            </div>
          </section>
        )}

        {showDaily && dailyReports.length > 0 && (
          <section>
            <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {filter === "all" ? "Daily reports" : "Daily"}
            </h3>
            <div className="space-y-2">
              {dailyReports.map((r) => (
                <DailyReportRow key={r.id} report={r} />
              ))}
            </div>
          </section>
        )}

        {filter !== "all" && ((filter === "weekly" && weeklyReports.length === 0) || (filter === "daily" && dailyReports.length === 0)) && (
          <p className={`text-sm py-8 text-center ${emptyCls}`}>
            No {filter} reports yet.
          </p>
        )}
      </div>
    </div>
  );
}
