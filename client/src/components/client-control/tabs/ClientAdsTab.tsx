"use client";

import {
  getAdsSummary,
  getAdsAlerts,
  getAdsCampaigns,
} from "@/lib/client/mockClientTabData";

type Props = {
  clientId: string;
};

export function ClientAdsTab({ clientId }: Props) {
  const summary = getAdsSummary(clientId);
  const alerts = getAdsAlerts(clientId);
  const campaigns = getAdsCampaigns(clientId);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl space-y-6">
        <section className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Spend (MTD)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {summary ? `$${summary.spend.toLocaleString()}` : "—"}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-white border border-gray-100">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">ROAS trend</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {summary?.roasTrend ?? "—"}
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Alerts</h2>
          <ul className="space-y-2">
            {alerts.length === 0 ? (
              <li className="text-sm text-gray-500 py-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                No alerts
              </li>
            ) : (
              alerts.map((a) => (
                <li
                  key={a.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    a.severity === "critical" ? "bg-red-50/50 border-red-100" : a.severity === "warning" ? "bg-amber-50/50 border-amber-100" : "bg-white border-gray-100"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${
                      a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                    }`}
                  />
                  <p className="text-sm text-gray-900 flex-1">{a.message}</p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Campaigns</h2>
          <div className="rounded-lg border border-gray-100 bg-white overflow-hidden">
            {campaigns.length === 0 ? (
              <p className="text-sm text-gray-500 p-6">No campaigns</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Spend</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">ROAS</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-3 px-4 font-medium text-gray-900">{c.name}</td>
                      <td className="py-3 px-4 text-right text-gray-600">${c.spend.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right text-gray-600">{c.roas}x</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                            c.status === "active" ? "bg-emerald-100 text-emerald-700" : c.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
