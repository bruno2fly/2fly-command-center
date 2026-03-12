"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { DashboardTodayAttention } from "@/lib/api";

type Props = { items: DashboardTodayAttention[] };

export function AttentionSection({ items }: Props) {
  const { isDark } = useTheme();
  const cardBg = isDark
    ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
    : "bg-amber-50/60 border-amber-200 hover:border-amber-300";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-600";

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500/90">⚡ Needs Attention</h2>
        <p className={`text-sm ${muted}`}>Nothing requiring attention right now.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-500/90">⚡ Needs Attention</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li
            key={`${item.clientId}-${i}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link
              href={`/clients/${item.clientId}?tab=overview`}
              className={`block rounded-lg border-l-4 border-amber-500/50 ${cardBg} border px-4 py-3 transition-colors`}
            >
              <span className={`font-medium ${text}`}>{item.clientName}</span>
              <span className={`text-sm ${muted}`}> — {item.reason}</span>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
