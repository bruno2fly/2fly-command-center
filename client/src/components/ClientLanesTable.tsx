"use client";

import Link from "next/link";
import { buildClientLanes } from "@/lib/clientLanes";

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatCurrency(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function ClientLanesTable() {
  const lanes = buildClientLanes();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Client Lanes</h3>
        <p className="text-xs text-gray-500 mt-0.5">One row per client · Health = computed</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
              <th className="py-3 px-4 font-medium">Client</th>
              <th className="py-3 px-4 font-medium">Health</th>
              <th className="py-3 px-4 font-medium">Buffer</th>
              <th className="py-3 px-4 font-medium">Last Delivered</th>
              <th className="py-3 px-4 font-medium">Next Promise</th>
              <th className="py-3 px-4 font-medium">Unpaid</th>
              <th className="py-3 px-4 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <tr
                key={lane.clientId}
                className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50"
              >
                <td className="py-3 px-4">
                  <Link
                    href={`/clients/${lane.clientId}`}
                    className="font-medium text-blue-600 hover:text-blue-700"
                  >
                    {lane.clientName}
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[lane.health]}`}
                    />
                    <span className="capitalize">{lane.health}</span>
                  </span>
                </td>
                <td className="py-3 px-4 text-gray-700">{lane.contentBufferDays} days</td>
                <td className="py-3 px-4 text-gray-600">{formatDate(lane.lastDeliveredDate)}</td>
                <td className="py-3 px-4 text-gray-600">{formatDate(lane.nextPromiseDate)}</td>
                <td className="py-3 px-4">
                  {lane.unpaidInvoiceAmount ? (
                    <span className="text-red-600 font-medium">
                      {formatCurrency(lane.unpaidInvoiceAmount)}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <Link
                    href={`/clients/${lane.clientId}`}
                    className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                  >
                    {lane.primaryCta}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
