"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MOCK_BOTTLENECKS } from "@/lib/founderData";
import { api } from "@/lib/api";
import type { ApiRequestItem } from "@/lib/api";

type WaitingItem = {
  id: string;
  clientId: string;
  clientName: string;
  reason: string;
  ageDays: number;
};

const AGE_BY_ID: Record<string, number> = {
  b1: 3,
  b2: 2,
  b3: 6,
  b4: 3,
  b5: 1,
};

function computeAgeDays(dateStr: string): number {
  const created = new Date(dateStr);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)));
}

function buildWaitingItems(requests: ApiRequestItem[]): {
  onClient: WaitingItem[];
  onTeam: WaitingItem[];
  onMe: WaitingItem[];
} {
  const onClient: WaitingItem[] = [];
  const onTeam: WaitingItem[] = [];
  const onMe: WaitingItem[] = [];

  for (const r of requests) {
    // Only include in-progress or pending requests
    if (r.status === "completed" || r.status === "cancelled") continue;

    const item: WaitingItem = {
      id: r.id,
      clientId: r.clientId,
      clientName: r.client?.name || "Unknown",
      reason: r.title,
      ageDays: computeAgeDays(r.createdAt),
    };

    // Categorize based on status and assignee
    if (r.status === "waiting_on_client" || r.status === "blocked") {
      onClient.push(item);
    } else if (r.assignedTo && r.assignedTo !== "You" && r.assignedTo !== "Unassigned") {
      onTeam.push(item);
    } else {
      onMe.push(item);
    }
  }

  return { onClient, onTeam, onMe };
}

function WaitingColumn({
  title,
  items,
}: {
  title: string;
  items: WaitingItem[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">None</p>
        ) : (
          items.map((b) => (
            <div
              key={b.id}
              className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <div>
                <Link
                  href={`/clients/${b.clientId}`}
                  className="font-medium text-blue-600 hover:text-blue-700 text-sm"
                >
                  {b.clientName}
                </Link>
                <p className="text-sm text-gray-600 mt-0.5">{b.reason}</p>
                <span className="text-xs text-gray-400">{b.ageDays}d</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function WaitingOnPanel() {
  // Start with mock data as fallback
  const toItem = (b: { id: string; clientId: string; clientName: string; action: string }): WaitingItem => ({
    id: b.id,
    clientId: b.clientId,
    clientName: b.clientName,
    reason: b.action,
    ageDays: AGE_BY_ID[b.id] ?? 0,
  });

  const mockOnClient = MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_client").map(toItem);
  const mockOnTeam = MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_team").map(toItem);
  const mockOnMe = MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_me").map(toItem);

  const [onClient, setOnClient] = useState<WaitingItem[]>(mockOnClient);
  const [onTeam, setOnTeam] = useState<WaitingItem[]>(mockOnTeam);
  const [onMe, setOnMe] = useState<WaitingItem[]>(mockOnMe);

  useEffect(() => {
    async function loadRealBottlenecks() {
      try {
        const data = await api.getRequestsRaw();
        const requests = data.requests || [];
        if (requests.length > 0) {
          const { onClient: rc, onTeam: rt, onMe: rm } = buildWaitingItems(requests);
          // Only replace if we got at least some items (avoid empty panel when API returns no waiting items)
          if (rc.length > 0 || rt.length > 0 || rm.length > 0) {
            setOnClient(rc);
            setOnTeam(rt);
            setOnMe(rm);
          }
        }
      } catch (err) {
        console.warn("Failed to load real bottlenecks, using mock:", err);
      }
    }
    loadRealBottlenecks();
  }, []);

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Waiting On</h2>
        <p className="text-xs text-gray-500 mt-0.5">Client · Team · Me</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <WaitingColumn title="Waiting on Client" items={onClient} />
        <WaitingColumn title="Waiting on Team" items={onTeam} />
        <WaitingColumn title="Waiting on Me" items={onMe} />
      </div>
    </div>
  );
}
