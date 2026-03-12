"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api, type ClientWeeklyReport } from "@/lib/api";
import { WeeklyReportCard, TrendChart } from "@/components/reports";

type Props = {
  clientId: string;
};

export function ClientReportsTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [reports, setReports] = useState<ClientWeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .getClientReports(clientId)
      .then((r) => setReports(r.reports ?? []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  const bgCls = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const emptyCls = isDark ? "text-gray-500" : "text-gray-500";

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
            No ad reports yet. Meta Ads sync runs daily at 11 AM.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-auto p-4 ${bgCls}`}>
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <section>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Performance trend
          </h2>
          <div className={`rounded-2xl border p-4 ${isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200"}`}>
            <TrendChart reports={reports} />
          </div>
        </section>

        <section>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Weekly reports
          </h2>
          <div className="space-y-3">
            {reports.map((report, i) => (
              <WeeklyReportCard
                key={`${report.weekStart}-${report.weekEnd}`}
                report={report}
                isLatest={i === 0}
                defaultExpanded={i === 0}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
