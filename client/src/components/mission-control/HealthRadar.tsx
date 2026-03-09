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

type SignalStatus = "ok" | "alert" | "unknown";

function SignalDot({ status }: { status: SignalStatus }) {
  const color =
    status === "ok"
      ? "bg-emerald-500"
      : status === "alert"
        ? "bg-red-500"
        : "bg-slate-500";
  return (
    <span
      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color} ${
        status === "ok" ? "shadow-[0_0_6px_rgba(16,185,129,0.5)]" : ""
      }`}
    />
  );
}

export function HealthRadar({ health }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!health) {
    return (
      <section
        className={`rounded-xl border p-4 ${
          isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"
        }`}
      >
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-[#8a7e6d]" : "text-gray-600"
          }`}
        >
          Client Health
        </h2>
        <p className={`text-sm mt-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          No health data
        </p>
      </section>
    );
  }

  const signals = [
    {
      id: "website",
      label: "Website",
      status:
        health.websiteStatus === "up"
          ? ("ok" as SignalStatus)
          : health.websiteStatus === "down"
            ? ("alert" as SignalStatus)
            : ("unknown" as SignalStatus),
      summary:
        health.websiteStatus === "up"
          ? (health.formsOk ? "Up · Forms OK" : "Up · Form issues")
          : health.websiteStatus === "down"
            ? "Down"
            : "Unknown",
      detail: `Last checked ${formatChecked(health.websiteLastChecked)}. Forms ${
        health.formsOk ? "OK" : "Issues"
      }.`,
    },
    {
      id: "ads",
      label: "Ads",
      status: health.adsStatus as SignalStatus,
      summary: `${health.adsPacing} · ${health.adsRoasTrend}`,
      detail: `Pacing: ${health.adsPacing}. ROAS trend: ${health.adsRoasTrend}.`,
    },
    {
      id: "payment",
      label: "Payment",
      status:
        health.paymentStatus === "paid"
          ? ("ok" as SignalStatus)
          : health.paymentStatus === "overdue"
            ? ("alert" as SignalStatus)
            : ("unknown" as SignalStatus),
      summary:
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
      status: health.deliveryStatus === "ok" ? ("ok" as SignalStatus) : ("alert" as SignalStatus),
      summary: `${health.deliveryBufferDays}d buffer${
        health.missedPromises > 0 ? ` · ${health.missedPromises} missed` : ""
      }`,
      detail: `${health.deliveryBufferDays} days content buffer. ${health.missedPromises} missed promise(s).`,
    },
    {
      id: "content",
      label: "Content Cadence",
      status: health.deliveryBufferDays >= 14 ? ("ok" as SignalStatus) : health.deliveryBufferDays >= 7 ? ("unknown" as SignalStatus) : ("alert" as SignalStatus),
      summary: health.deliveryBufferDays >= 14 ? "On track" : health.deliveryBufferDays >= 7 ? "Tight" : "Low buffer",
      detail: `${health.deliveryBufferDays} days of content buffer.`,
    },
  ];

  return (
    <section
      className={`rounded-xl border overflow-hidden ${
        isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"
      }`}
    >
      <div
        className={`px-4 py-3 border-b ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-[#8a7e6d]" : "text-gray-600"
          }`}
        >
          Client Health
        </h2>
        <p
          className={`text-[10px] mt-0.5 ${
            isDark ? "text-[#5a5040]" : "text-gray-500"
          }`}
        >
          System status
        </p>
      </div>
      <div className="divide-y divide-[#1a1810]">
        {signals.map((s) => (
          <div key={s.id}>
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
                isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"
              }`}
            >
              <SignalDot status={s.status} />
              <span
                className={`text-sm font-medium flex-1 ${
                  isDark ? "text-[#c4b8a8]" : "text-gray-700"
                }`}
              >
                {s.label}
              </span>
              <span
                className={`text-xs truncate max-w-[100px] ${
                  isDark ? "text-[#5a5040]" : "text-gray-500"
                }`}
              >
                {s.summary}
              </span>
              <svg
                className={`w-4 h-4 transition-transform flex-shrink-0 ${
                  expanded === s.id ? "rotate-180" : ""
                } ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
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
                  <p
                    className={`px-4 pb-3 pl-9 text-xs ${
                      isDark ? "text-[#5a5040]" : "text-gray-500"
                    }`}
                  >
                    {s.detail}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </section>
  );
}
