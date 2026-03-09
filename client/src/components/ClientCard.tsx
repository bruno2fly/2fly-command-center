"use client";

import Link from "next/link";
import { useClients } from "@/contexts/ClientsContext";
import { buildClientLanes } from "@/lib/clientLanes";
import type { Client } from "@/lib/mockData";

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function ClientCard({ client }: { client: Client }) {
  const { clients } = useClients();
  const lanes = buildClientLanes(clients);
  const lane = lanes.find((l) => l.clientId === client.id);
  const health = lane?.health ?? "green";
  const primaryCta = lane?.primaryCta ?? "View";

  const trendLabel =
    client.performanceTrend === "up" ? "↑ Up" : client.performanceTrend === "flat" ? "→ Flat" : "↓ Down";

  return (
    <Link
      href={`/clients/${client.id}`}
      className="block bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg text-gray-900">{client.name}</h3>
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${HEALTH_DOT[health]}`} />
          <span className="text-sm capitalize text-gray-600">{health}</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm mb-4">
        <div className="py-2">
          <span className="text-gray-500 block text-xs">Buffer</span>
          <span className="font-medium text-gray-900">{client.contentBufferDays} days</span>
        </div>
        <div className="py-2">
          <span className="text-gray-500 block text-xs">ROAS</span>
          <span className="font-medium text-gray-900">{client.adsRoas != null ? `${client.adsRoas}x` : "—"}</span>
        </div>
        <div className="py-2">
          <span className="text-gray-500 block text-xs">Requests</span>
          <span className="font-medium text-gray-900">{client.openRequests}</span>
        </div>
        <div className="py-2">
          <span className="text-gray-500 block text-xs">Performance</span>
          <span className="font-medium text-gray-900">{trendLabel}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-gray-100">
        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
          {primaryCta}
        </span>
      </div>
    </Link>
  );
}
