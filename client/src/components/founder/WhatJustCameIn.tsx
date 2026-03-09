"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { ActivityEvent, ActivityType } from "@/lib/founder/mockFounderData";

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffM / 60);

  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

const TYPE_CONFIG: Record<ActivityType, { label: string; icon: string; color: string }> = {
  whatsapp: { label: "WhatsApp", icon: "💬", color: "text-emerald-600" },
  request: { label: "Request", icon: "📋", color: "text-blue-600" },
  approval_requested: { label: "Approval", icon: "⏳", color: "text-amber-600" },
  approval_approved: { label: "Approved", icon: "✓", color: "text-emerald-600" },
  invoice_overdue: { label: "Overdue", icon: "⚠", color: "text-red-600" },
  invoice_paid: { label: "Paid", icon: "💰", color: "text-emerald-600" },
  ads_alert: { label: "Ads", icon: "📊", color: "text-amber-600" },
};

type Props = {
  events: ActivityEvent[];
};

export function WhatJustCameIn({ events }: Props) {
  const display = events.slice(0, 10);

  if (display.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center">
        <p className="text-sm text-gray-500">Nothing came in yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">What Just Came In</h3>
        <p className="text-xs text-gray-500 mt-0.5">Last 10 across all clients</p>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-50">
        {display.map((e, i) => {
          const config = TYPE_CONFIG[e.type];
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="group"
            >
              <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50">
                <span className="text-lg shrink-0">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                    <span className="text-xs text-gray-500">· {e.clientName}</span>
                  </div>
                  <p className="text-sm text-gray-700 mt-0.5 truncate">{e.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5" suppressHydrationWarning>{relativeTime(e.timestamp)}</p>
                  <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => toast.success(`✓ Task created for ${e.clientName}`)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Convert to task
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success(`→ Assigned to team`)}
                      className="text-xs font-medium text-gray-600 hover:text-gray-700"
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success(`⏰ Snoozed until tomorrow`)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-600"
                    >
                      Snooze
                    </button>
                  </div>
                </div>
                <Link
                  href={`/clients/${e.clientId}`}
                  className="shrink-0 text-xs font-medium text-gray-500 hover:text-gray-700"
                >
                  →
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
