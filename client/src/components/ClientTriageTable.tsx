"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { buildClientLanes } from "@/lib/clientLanes";
import { getClientHealth } from "@/lib/client/mockClientControlData";
import { HealthDot, type HealthState } from "@/components/ui/HealthDot";

type Filter = "all" | "at_risk" | "warning" | "healthy";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  at_risk: "At Risk",
  warning: "Warning",
  healthy: "Healthy",
};

function PaymentIndicator({ clientId }: { clientId: string }) {
  const health = getClientHealth(clientId);
  if (!health) return <span className="text-gray-400">—</span>;
  if (health.paymentStatus === "paid")
    return (
      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
        Paid
      </span>
    );
  if (health.paymentStatus === "overdue")
    return (
      <span className="text-red-600 dark:text-red-400 font-medium">
        Overdue {health.paymentDaysOverdue}d
      </span>
    );
  return (
    <span className="text-amber-600 dark:text-amber-400">Pending</span>
  );
}

function AdsIndicator({ clientId }: { clientId: string }) {
  const health = getClientHealth(clientId);
  if (!health) return <span className="text-gray-400">—</span>;
  if (health.adsStatus === "ok")
    return (
      <span className="text-emerald-600 dark:text-emerald-400">
        {health.adsRoasTrend}
      </span>
    );
  if (health.adsStatus === "alert")
    return (
      <span className="text-amber-600 dark:text-amber-400">
        {health.adsRoasTrend}
      </span>
    );
  return <span className="text-gray-400">—</span>;
}

export function ClientTriageTable() {
  const { clients } = useClients();
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const lanes = useMemo(() => buildClientLanes(clients), [clients]);

  const filtered = useMemo(() => {
    let list = lanes;
    if (filter === "at_risk") list = list.filter((l) => l.health === "red");
    else if (filter === "warning") list = list.filter((l) => l.health === "yellow");
    else if (filter === "healthy") list = list.filter((l) => l.health === "green");

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.clientName.toLowerCase().includes(q) ||
          (l.urgencySignal ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [lanes, filter, search]);

  const counts = useMemo(
    () => ({
      at_risk: lanes.filter((l) => l.health === "red").length,
      warning: lanes.filter((l) => l.health === "yellow").length,
      healthy: lanes.filter((l) => l.health === "green").length,
    }),
    [lanes]
  );

  const statusLabel = (health: HealthState) =>
    health === "red" ? "At Risk" : health === "yellow" ? "Warning" : "Healthy";

  const baseCls = isDark
    ? "bg-[#0a0a0e] border-[#1a1810]"
    : "bg-white border-gray-200";

  const thCls = isDark
    ? "text-[#8a7e6d] border-[#1a1810]"
    : "text-gray-500 border-gray-100";

  const tdCls = isDark
    ? "text-[#c4b8a8] border-[#1a1810]"
    : "text-gray-700 border-gray-50";

  const getRowStyles = (health: HealthState) => {
    const base = "border-b last:border-0 transition-colors";
    const hover = isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50/50";
    if (health === "red") {
      const accent = isDark
        ? "border-l-2 border-l-red-500/60 bg-red-500/5"
        : "border-l-2 border-l-red-400 bg-red-50/30";
      return `${base} ${hover} ${accent}`;
    }
    if (health === "yellow") {
      const accent = isDark
        ? "border-l-2 border-l-amber-500/40 bg-amber-500/5"
        : "border-l-2 border-l-amber-400 bg-amber-50/20";
      return `${base} ${hover} ${accent}`;
    }
    return `${base} ${hover}`;
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${baseCls}`}>
      <div
        className={`px-4 py-4 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className={`px-3 py-2 rounded-lg text-sm w-48 ${
              isDark
                ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8] placeholder-[#5a5040]"
                : "border border-gray-200"
            }`}
          />
          {(["all", "at_risk", "warning", "healthy"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === f
                  ? isDark
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-blue-100 text-blue-700"
                  : isDark
                    ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {FILTER_LABELS[f]}
              {f !== "all" && (
                <span className="ml-1 opacity-75">
                  (
                  {f === "at_risk"
                    ? counts.at_risk
                    : f === "warning"
                      ? counts.warning
                      : counts.healthy}
                  )
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={`sticky top-0 ${isDark ? "bg-[#08080c]" : "bg-gray-50"}`}>
            <tr className={`border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>Priority</th>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>Client</th>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>Status</th>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>#1 Issue</th>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>Payment</th>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>Ads</th>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>Buffer</th>
              <th className={`py-3 px-4 font-medium text-left ${thCls}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lane, idx) => (
              <tr
                key={lane.clientId}
                className={getRowStyles(lane.health as HealthState)}
              >
                <td className={`py-3 px-4 ${tdCls}`}>
                  <span className="font-medium">
                    <HealthDot state={lane.health as HealthState} size="sm" /> {idx + 1}
                  </span>
                </td>
                <td className={`py-3 px-4 ${tdCls}`}>
                  <span className="font-medium">{lane.clientName}</span>
                </td>
                <td className={`py-3 px-4 ${tdCls}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <HealthDot
                      state={lane.health as HealthState}
                      size="sm"
                      showLabel
                    />
                  </span>
                </td>
                <td className={`py-3 px-4 ${tdCls} max-w-[200px] truncate`}>
                  {lane.urgencySignal ?? "—"}
                </td>
                <td className={`py-3 px-4 ${tdCls}`}>
                  <PaymentIndicator clientId={lane.clientId} />
                </td>
                <td className={`py-3 px-4 ${tdCls}`}>
                  <AdsIndicator clientId={lane.clientId} />
                </td>
                <td className={`py-3 px-4 ${tdCls}`}>{lane.contentBufferDays}d</td>
                <td className={`py-3 px-4 ${tdCls}`}>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/clients/${lane.clientId}`}
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        isDark
                          ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      }`}
                    >
                      Go
                    </Link>
                    <a
                      href="#"
                      className={`px-2.5 py-1 rounded text-xs font-medium ${
                        isDark
                          ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                      title="Open WhatsApp"
                    >
                      WhatsApp
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div
          className={`py-12 text-center ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}
        >
          No clients match
        </div>
      )}
    </div>
  );
}
