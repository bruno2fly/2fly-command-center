"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import type { ClientHealth } from "@/lib/client/mockClientControlData";

type Props = {
  health: ClientHealth | null;
};

function formatChecked(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function StatusDot({ status }: { status: "ok" | "alert" | "unknown" | "up" | "down" }) {
  const color =
    status === "ok" || status === "up"
      ? "bg-emerald-500"
      : status === "alert" || status === "down"
        ? "bg-red-500"
        : "bg-gray-400";
  return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${color}`} />;
}

export function ClientHealthPanel({ health }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!health) {
    return (
      <div className={`rounded-lg border p-4 ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-100 bg-white"}`}>
        <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>Health</h2>
        <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No health data</p>
      </div>
    );
  }

  const signals = [
    {
      id: "website",
      label: "Website",
      status: health.websiteStatus === "up" ? "ok" : health.websiteStatus === "down" ? "alert" : "unknown",
      reason: health.websiteStatus === "up" ? "Up" : health.websiteStatus === "down" ? "Down" : "Unknown",
      detail: `Last checked ${formatChecked(health.websiteLastChecked)}. Forms ${health.formsOk ? "OK" : "Issues"}.`,
    },
    {
      id: "ads",
      label: "Ads",
      status: health.adsStatus,
      reason: `${health.adsPacing} · ${health.adsRoasTrend}`,
      detail: `Pacing: ${health.adsPacing}. ROAS trend: ${health.adsRoasTrend}.`,
    },
    {
      id: "payment",
      label: "Payment",
      status: health.paymentStatus === "paid" ? "ok" : health.paymentStatus === "overdue" ? "alert" : "unknown",
      reason:
        health.paymentStatus === "paid"
          ? "Paid"
          : health.paymentStatus === "overdue"
            ? `Overdue ${health.paymentDaysOverdue ?? 0}d`
            : "Pending",
      detail:
        health.paymentStatus === "overdue"
          ? `Invoice overdue by ${health.paymentDaysOverdue ?? 0} days.`
          : health.paymentStatus === "paid"
            ? "All invoices paid."
            : "Payment pending.",
    },
    {
      id: "delivery",
      label: "Delivery",
      status: health.deliveryStatus === "ok" ? "ok" : "alert",
      reason: `${health.deliveryBufferDays}d buffer${health.missedPromises > 0 ? ` · ${health.missedPromises} missed` : ""}`,
      detail: `${health.deliveryBufferDays} days content buffer. ${health.missedPromises} missed promise(s).`,
    },
  ];

  return (
    <div className={`rounded-lg border p-4 ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-100 bg-white"}`}>
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>Health</h2>
      <div className="space-y-2">
        {signals.map((s) => (
          <div key={s.id}>
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className={`w-full flex items-center gap-3 py-2 px-2 rounded-lg text-left ${
                isDark ? "hover:bg-[#141210]" : "hover:bg-gray-50"
              }`}
            >
              <StatusDot status={s.status as "ok" | "alert" | "unknown"} />
              <span className={`text-sm font-medium flex-1 ${isDark ? "text-[#c4b8a8]" : "text-gray-700"}`}>{s.label}</span>
              <span className={`text-xs truncate max-w-[120px] ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{s.reason}</span>
              <svg
                className={`w-4 h-4 transition-transform ${expanded === s.id ? "rotate-180" : ""} ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {expanded === s.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className={`text-xs pl-7 pb-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{s.detail}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
