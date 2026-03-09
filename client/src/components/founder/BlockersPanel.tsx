"use client";

import Link from "next/link";
import type { BlockerItem } from "@/lib/founder/mockFounderData";

type Props = {
  teamBlockers: BlockerItem[];
  clientBlockers: BlockerItem[];
};

function BlockerColumn({
  title,
  items,
  emptyMessage,
}: {
  title: string;
  items: BlockerItem[];
  emptyMessage: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-4 space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">{emptyMessage}</p>
        ) : (
          items.map((b) => (
            <div
              key={b.id}
              className="flex items-start justify-between gap-3 py-2 border-b border-gray-50 last:border-0"
            >
              <div>
                <Link
                  href={`/clients/${b.clientId}`}
                  className="font-medium text-blue-600 hover:text-blue-700"
                >
                  {b.clientName}
                </Link>
                <p className="text-sm text-gray-600 mt-0.5">{b.reason}</p>
                <span className="text-xs text-gray-400">{b.ageDays}d</span>
              </div>
              <button
                type="button"
                className="shrink-0 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100"
              >
                Ping on WhatsApp
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function BlockersPanel({ teamBlockers, clientBlockers }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <BlockerColumn
        title="Team Blockers"
        items={teamBlockers}
        emptyMessage="Nothing blocking from team"
      />
      <BlockerColumn
        title="Client Blockers"
        items={clientBlockers}
        emptyMessage="No client blockers"
      />
    </div>
  );
}
