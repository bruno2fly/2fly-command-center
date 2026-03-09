"use client";

import type { PipelineSnapshot as PipelineSnapshotType } from "@/lib/founder/mockFounderData";

type Props = {
  data: PipelineSnapshotType;
};

const ROWS: { key: keyof PipelineSnapshotType; label: string }[] = [
  { key: "leadsThisWeek", label: "Leads this week" },
  { key: "demosBooked", label: "Demos booked" },
  { key: "proposalsOut", label: "Proposals out" },
  { key: "newClientsThisMonth", label: "New clients this month" },
  { key: "churnRiskCount", label: "Churn risk" },
];

export function PipelineSnapshot({ data }: Props) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Pipeline Snapshot</h3>
        <p className="text-xs text-gray-500 mt-0.5">This month</p>
      </div>
      <div className="divide-y divide-gray-50">
        {ROWS.map(({ key, label }) => {
          const value = data[key];
          const isChurn = key === "churnRiskCount" && value > 0;
          return (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-gray-600">{label}</span>
              <span
                className={`font-semibold ${
                  isChurn ? "text-amber-600" : "text-gray-900"
                }`}
              >
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
