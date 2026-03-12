"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { DashboardTodayAgent } from "@/lib/api";

type Props = { items: DashboardTodayAgent[] };

function statusPill(status: string, isDark: boolean) {
  const s = (status || "").toLowerCase();
  if (s === "completed") return "bg-emerald-500/20 text-emerald-400";
  if (s === "executing") return "bg-blue-500/20 text-blue-400";
  if (s === "approved") return "bg-amber-500/20 text-amber-400";
  return isDark ? "bg-[#2a2520] text-[#8a7e6d]" : "bg-gray-100 text-gray-600";
}

export function AgentsHandlingSection({ items }: Props) {
  const { isDark } = useTheme();
  const cardBg = isDark ? "bg-emerald-500/5 border-emerald-500/20" : "bg-emerald-50/60 border-emerald-200";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-600";

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-500/90">✅ Agents Handling — No action needed</h2>
        <p className={`text-sm ${muted}`}>No agent actions in progress.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-emerald-500/90">✅ Agents Handling — No action needed</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li
            key={`${item.clientId}-${item.agentName}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={`/clients/${item.clientId}?tab=ads`}
              className={`flex flex-wrap items-center gap-2 rounded-lg border-l-4 border-emerald-500/40 ${cardBg} border px-4 py-3 transition-colors`}
            >
              <span className="shrink-0">🤖</span>
              <span className={`font-medium ${text}`}>{item.agentName}</span>
              <span className={muted}>→</span>
              <span className={text}>{item.title}</span>
              <span className={`ml-auto rounded-full px-2 py-0.5 text-xs font-medium ${statusPill(item.status, isDark)}`}>{item.status}</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
