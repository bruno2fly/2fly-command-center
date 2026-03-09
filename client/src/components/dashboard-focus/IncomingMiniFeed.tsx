"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import type { ActivityEvent, ActivityType } from "@/lib/founder/mockFounderData";

const TYPE_ICON: Record<ActivityType, { icon: string; color: string }> = {
  whatsapp: { icon: "💬", color: "text-emerald-600" },
  request: { icon: "📋", color: "text-blue-600" },
  approval_requested: { icon: "⏳", color: "text-amber-600" },
  approval_approved: { icon: "✓", color: "text-emerald-600" },
  invoice_overdue: { icon: "⚠", color: "text-red-600" },
  invoice_paid: { icon: "💰", color: "text-emerald-600" },
  ads_alert: { icon: "📊", color: "text-amber-600" },
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffM / 60);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m`;
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

type Props = {
  events: ActivityEvent[];
};

export function IncomingMiniFeed({ events }: Props) {
  if (events.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Incoming</h3>
        <Link
          href="#"
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Open Inbox →
        </Link>
      </div>

      <div className="space-y-2">
        {events.map((e, i) => {
          const config = TYPE_ICON[e.type];
          return (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04, duration: 0.2 }}
              className="group rounded-xl bg-white border border-gray-100 px-4 py-3 hover:border-gray-200 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-base shrink-0 mt-0.5">{config.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-gray-900 truncate">{e.clientName}</span>
                    <span className="text-xs text-gray-400 shrink-0" suppressHydrationWarning>{relativeTime(e.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{e.message}</p>

                  {/* Hover actions */}
                  <div className="flex gap-3 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => toast.success(`Task created for ${e.clientName}`)}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-700"
                    >
                      Convert to task
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.success("Assigned to team")}
                      className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => toast("Snoozed")}
                      className="text-[11px] font-medium text-gray-400 hover:text-gray-600"
                    >
                      Snooze
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
