"use client";

import Link from "next/link";
import {
  MOCK_BOTTLENECKS,
  MOCK_PIPELINE,
} from "@/lib/founderData";

const CATEGORY_LABELS: Record<string, string> = {
  waiting_on_me: "Waiting on me",
  waiting_on_team: "Waiting on team",
  waiting_on_client: "Waiting on client",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function BottlenecksPipeline() {
  const byCategory = {
    waiting_on_me: MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_me"),
    waiting_on_team: MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_team"),
    waiting_on_client: MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_client"),
  };

  const pipelineTotal = MOCK_PIPELINE.reduce(
    (s, d) => s + d.expectedMrr * (d.probability / 100),
    0
  );

  return (
    <div className="space-y-4">
      {/* Bottlenecks */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Bottlenecks</h3>
          <p className="text-xs text-gray-500 mt-0.5">Who is blocking what</p>
        </div>
        <div className="p-4 space-y-4">
          {(["waiting_on_me", "waiting_on_team", "waiting_on_client"] as const).map((cat) => (
            <div key={cat}>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[cat]} ({byCategory[cat].length})
              </h4>
              <ul className="space-y-1.5">
                {byCategory[cat].slice(0, 5).map((b) => (
                  <li key={b.id} className="flex justify-between items-center text-sm">
                    <Link
                      href={`/clients/${b.clientId}`}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {b.clientName}
                    </Link>
                    <span className="text-gray-600 truncate max-w-[180px]" title={b.action}>
                      {b.action}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Pipeline</h3>
          <p className="text-xs text-gray-500 mt-0.5">Deals closing this month</p>
        </div>
        <div className="p-4 space-y-3">
          {MOCK_PIPELINE.map((d) => (
            <div
              key={d.id}
              className="flex justify-between items-center text-sm border-b border-gray-50 last:border-0 pb-2 last:pb-0"
            >
              <div>
                <div className="font-medium text-gray-900">{d.name}</div>
                <div className="text-xs text-gray-500">{d.clientName} · {d.stage}</div>
              </div>
              <div className="text-right">
                <div className="font-medium text-gray-900">+{formatCurrency(d.expectedMrr)}/mo</div>
                <div className="text-xs text-gray-500">{d.probability}%</div>
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-gray-100 flex justify-between font-semibold text-gray-900">
            <span>Expected added MRR</span>
            <span className="text-emerald-600">+{formatCurrency(pipelineTotal)}/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
