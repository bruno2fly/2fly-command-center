"use client";

import {
  getGoals,
  getRoadmap,
  getKpis,
  type ClientGoal,
  type RoadmapItem,
  type ClientKpi,
} from "@/lib/client/mockClientTabData";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  clientId: string;
};

export function ClientPlanTab({ clientId }: Props) {
  const goals = getGoals(clientId);
  const roadmap = getRoadmap(clientId);
  const kpis = getKpis(clientId);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Goals</h2>
          <ul className="space-y-3">
            {goals.length === 0 ? (
              <li className="text-sm text-gray-500 py-4">No goals defined</li>
            ) : (
              goals.map((g) => (
                <li
                  key={g.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    g.status === "achieved" ? "bg-emerald-50/50 border-emerald-100" : "bg-white border-gray-100"
                  }`}
                >
                  <span className="text-sm font-medium text-gray-900">{g.text}</span>
                  <div className="flex items-center gap-2">
                    {g.targetDate && (
                      <span className="text-xs text-gray-500">{formatDate(g.targetDate)}</span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        g.status === "active" ? "bg-blue-100 text-blue-700" : g.status === "achieved" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {g.status}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Roadmap</h2>
          <ul className="space-y-2">
            {roadmap.length === 0 ? (
              <li className="text-sm text-gray-500 py-4">No roadmap items</li>
            ) : (
              roadmap.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{r.title}</p>
                    <p className="text-xs text-gray-500">{r.quarter}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      r.status === "in_progress" ? "bg-blue-100 text-blue-700" : r.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {r.status.replace("_", " ")}
                  </span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Key KPIs</h2>
          <div className="grid grid-cols-3 gap-4">
            {kpis.length === 0 ? (
              <p className="text-sm text-gray-500 col-span-3 py-4">No KPIs tracked</p>
            ) : (
              kpis.map((k) => (
                <div
                  key={k.id}
                  className="p-4 rounded-lg bg-white border border-gray-100"
                >
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{k.name}</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">{k.value}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs ${
                        k.trend === "up" ? "text-emerald-600" : k.trend === "down" ? "text-red-600" : "text-gray-500"
                      }`}
                    >
                      {k.trend === "up" ? "↑" : k.trend === "down" ? "↓" : "→"}
                    </span>
                    {k.target && <span className="text-xs text-gray-500">Target: {k.target}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
