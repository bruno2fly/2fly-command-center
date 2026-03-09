"use client";

import type { RevenuePulse as RevenuePulseType } from "@/lib/founder/mockFounderData";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const CARD_CLASS =
  "rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md";

type Props = {
  data: RevenuePulseType;
};

export function RevenuePulse({ data }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className={`${CARD_CLASS} border-l-4 border-l-emerald-500`}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Cash In (This month)
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {formatCurrency(data.cashInThisMonth)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.cashInDeltaVsLastMonth > 0 ? "+" : ""}
          {data.cashInDeltaVsLastMonth}% vs last month
        </p>
      </div>

      <div className={`${CARD_CLASS} border-l-4 border-l-blue-500`}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Expected (Next 30 days)
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {formatCurrency(data.expectedNext30Days)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.expectedCount} invoices/retainers
        </p>
      </div>

      <div
        className={`${CARD_CLASS} border-l-4 ${
          data.overdue > 0 ? "border-l-red-500" : "border-l-gray-200"
        }`}
      >
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          Overdue
        </p>
        <p
          className={`text-2xl font-bold mt-1 ${
            data.overdue > 0 ? "text-red-600" : "text-gray-900"
          }`}
        >
          {formatCurrency(data.overdue)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.overdueCount} item{data.overdueCount !== 1 ? "s" : ""}
          {data.overdue > 0 && " · needs action"}
        </p>
      </div>

      <div className={`${CARD_CLASS} border-l-4 border-l-amber-500`}>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          At-Risk Revenue
        </p>
        <p className="text-2xl font-bold text-gray-900 mt-1">
          {formatCurrency(data.atRiskRevenue)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {data.atRiskClientCount} client
          {data.atRiskClientCount !== 1 ? "s" : ""} at risk
        </p>
      </div>
    </div>
  );
}
