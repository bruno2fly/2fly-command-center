"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

type HealthVariant = "green" | "yellow" | "red";

type Props = {
  retainer: number | null;
  retainerPaid: boolean;
  retainerOverdueDays?: number;
  contentBufferDays: number;
  contentBufferStatus: "green" | "yellow" | "red";
  activeRequestsCount: number;
  roas: string | null;
  roasTrend?: string;
  roasTrendUp?: boolean;
  health: HealthVariant;
  healthLabel: string;
};

export function OverviewKPIStrip({
  retainer,
  retainerPaid,
  retainerOverdueDays = 0,
  contentBufferDays,
  contentBufferStatus,
  activeRequestsCount,
  roas,
  roasTrend,
  roasTrendUp,
  health,
  healthLabel,
}: Props) {
  const { isDark } = useTheme();

  const cardBase =
    "flex flex-col gap-1 min-w-0 flex-1 rounded-2xl border backdrop-blur-[8px] transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-500/20";
  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]" : "bg-white border-[rgba(226,232,240,1)]";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-gray-500";
  const valueCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";

  const bufferColor =
    contentBufferStatus === "green"
      ? isDark
        ? "text-emerald-400"
        : "text-emerald-600"
      : contentBufferStatus === "yellow"
        ? isDark
          ? "text-amber-400"
          : "text-amber-600"
        : isDark
          ? "text-red-400"
          : "text-red-600";

  const healthPillCls =
    health === "green"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : health === "yellow"
        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
        : "bg-red-500/10 text-red-400 border-red-500/20";

  return (
    <div className="flex flex-wrap gap-3 p-4 overflow-x-auto">
      {/* Retainer */}
      <motion.div
        className={`${cardBase} ${cardBg} p-3 min-w-[120px]`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <p className={labelCls}>Retainer</p>
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold tabular-nums ${valueCls}`}>
            {retainer != null && retainer > 0 ? `$${retainer.toLocaleString()}/mo` : "—"}
          </span>
          {retainer != null && retainer > 0 && (
            <>
              {retainerPaid ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-hidden />
              ) : retainerOverdueDays > 0 ? (
                <span className="text-[10px] font-medium text-red-400">{retainerOverdueDays}d overdue</span>
              ) : null}
            </>
          )}
        </div>
      </motion.div>

      {/* Content Buffer */}
      <motion.div
        className={`${cardBase} ${cardBg} p-3 min-w-[100px]`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
      >
        <p className={labelCls}>Content Buffer</p>
        <p className={`text-lg font-bold tabular-nums ${bufferColor}`}>{contentBufferDays} days</p>
      </motion.div>

      {/* Active Requests */}
      <motion.div
        className={`${cardBase} ${cardBg} p-3 min-w-[100px]`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1, ease: "easeOut" }}
      >
        <p className={labelCls}>Active Requests</p>
        <p className={`text-lg font-bold tabular-nums ${valueCls}`}>{activeRequestsCount} open</p>
      </motion.div>

      {/* ROAS */}
      <motion.div
        className={`${cardBase} ${cardBg} p-3 min-w-[90px]`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.15, ease: "easeOut" }}
      >
        <p className={labelCls}>ROAS</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg font-bold tabular-nums ${valueCls}`}>{roas ?? "—"}</span>
          {roasTrend != null && roasTrend !== "—" && (
            <span
              className={`text-xs font-medium ${
                roasTrendUp ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-red-400" : "text-red-600"
              }`}
            >
              {roasTrendUp ? "↑" : "↓"}
              {roasTrend}
            </span>
          )}
        </div>
      </motion.div>

      {/* Health */}
      <motion.div
        className={`${cardBase} ${cardBg} p-3 min-w-[100px]`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.2, ease: "easeOut" }}
      >
        <p className={labelCls}>Health</p>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${healthPillCls}`}>
          {healthLabel}
        </span>
      </motion.div>
    </div>
  );
}
