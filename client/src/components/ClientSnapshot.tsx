"use client";

/**
 * ClientSnapshot: Last 30 days wins, upcoming deliverables, key risks.
 * For founder view and later client-facing share.
 */

type Props = {
  clientId: string;
  clientName: string;
  last30DaysWins?: number;
  upcomingDeliverables?: string[];
  risks?: string[];
};

export function ClientSnapshot({
  clientName,
  last30DaysWins = 0,
  upcomingDeliverables = [],
  risks = [],
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Snapshot: {clientName}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Last 30 days wins
          </p>
          <p className="text-2xl font-bold text-gray-900">{last30DaysWins}</p>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Upcoming
          </p>
          <ul className="space-y-0.5">
            {upcomingDeliverables.length === 0 ? (
              <li className="text-gray-400">None scheduled</li>
            ) : (
              upcomingDeliverables.slice(0, 3).map((d, i) => (
                <li key={i} className="text-gray-700">
                  {d}
                </li>
              ))
            )}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Key risks
          </p>
          <ul className="space-y-0.5">
            {risks.length === 0 ? (
              <li className="text-emerald-600">None</li>
            ) : (
              risks.slice(0, 3).map((r, i) => (
                <li key={i} className="text-amber-700">
                  {r}
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
