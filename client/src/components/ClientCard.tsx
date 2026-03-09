"use client";

import Link from "next/link";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { buildClientLanes } from "@/lib/clientLanes";
import type { Client } from "@/lib/mockData";

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function ClientCard({ client }: { client: Client }) {
  const { clients } = useClients();
  const { isDark } = useTheme();
  const lanes = buildClientLanes(clients);
  const lane = lanes.find((l) => l.clientId === client.id);
  const health = lane?.health ?? "green";
  const primaryCta = lane?.primaryCta ?? "View";
  const airplaneMode = isDark;

  const trendLabel =
    client.performanceTrend === "up" ? "↑ Up" : client.performanceTrend === "flat" ? "→ Flat" : "↓ Down";

  return (
    <Link
      href={`/clients/${client.id}`}
      className={`block rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow ${
        airplaneMode ? "bg-[#0a0a0e] border border-[#1a1810] hover:border-[#2a2018]" : "bg-white border border-gray-100"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className={`font-semibold text-lg ${airplaneMode ? "text-[#c4b8a8]" : "text-gray-900"}`}>{client.name}</h3>
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[health]}`} />
          <span className={`text-sm capitalize ${airplaneMode ? "text-[#8a7e6d]" : "text-gray-600"}`}>{health}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="py-2">
          <span className={`block text-xs ${airplaneMode ? "text-[#5a5040]" : "text-gray-500"}`}>Buffer</span>
          <span className={`font-medium ${airplaneMode ? "text-[#c4b8a8]" : "text-gray-900"}`}>{client.contentBufferDays} days</span>
        </div>
        <div className="py-2">
          <span className={`block text-xs ${airplaneMode ? "text-[#5a5040]" : "text-gray-500"}`}>ROAS</span>
          <span className={`font-medium ${airplaneMode ? "text-[#c4b8a8]" : "text-gray-900"}`}>{client.adsRoas != null ? `${client.adsRoas}x` : "—"}</span>
        </div>
        <div className="py-2">
          <span className={`block text-xs ${airplaneMode ? "text-[#5a5040]" : "text-gray-500"}`}>Requests</span>
          <span className={`font-medium ${airplaneMode ? "text-[#c4b8a8]" : "text-gray-900"}`}>{client.openRequests}</span>
        </div>
        <div className="py-2">
          <span className={`block text-xs ${airplaneMode ? "text-[#5a5040]" : "text-gray-500"}`}>Performance</span>
          <span className={`font-medium ${airplaneMode ? "text-[#c4b8a8]" : "text-gray-900"}`}>{trendLabel}</span>
        </div>
      </div>

      <div className={`pt-3 border-t ${airplaneMode ? "border-[#1a1810]" : "border-gray-100"}`}>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
          airplaneMode ? "bg-emerald-500/20 text-emerald-400/90" : "bg-blue-50 text-blue-700"
        }`}>
          {primaryCta}
        </span>
      </div>
    </Link>
  );
}
