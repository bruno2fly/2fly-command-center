"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ActivityEvent, ActivityType } from "@/lib/founder/mockFounderData";

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffM / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "yesterday";
  return `${diffD}d ago`;
}

const TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; color: string }
> = {
  whatsapp: { label: "WhatsApp", icon: "💬", color: "text-emerald-600" },
  request: { label: "Request", icon: "📋", color: "text-blue-600" },
  approval_requested: { label: "Approval needed", icon: "⏳", color: "text-amber-600" },
  approval_approved: { label: "Approved", icon: "✓", color: "text-emerald-600" },
  invoice_overdue: { label: "Overdue", icon: "⚠", color: "text-red-600" },
  invoice_paid: { label: "Paid", icon: "💰", color: "text-emerald-600" },
  ads_alert: { label: "Ads alert", icon: "📊", color: "text-amber-600" },
};

type Props = {
  events: ActivityEvent[];
};

export function ActivityFeed({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">Live Activity</h3>
        <p className="text-xs text-gray-500 mt-0.5">Across all clients</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
        {events.map((e, i) => {
          const config = TYPE_CONFIG[e.type];
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                href={`/clients/${e.clientId}`}
                className="block px-4 py-3 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex gap-3">
                  <span className="text-lg shrink-0">{config.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                      <span className="text-xs text-gray-500">· {e.clientName}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-0.5 truncate">
                      {e.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {relativeTime(e.timestamp)}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
