"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { DashboardTodayActivity } from "@/lib/api";

type Props = {
  items: DashboardTodayActivity[];
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function RecentActivityFeed({ items }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-[#141414] border-[#2a2520]" : "bg-gray-50 border-gray-200";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8a7e6d]">📰 Recent Activity (last 24h)</h2>
        <p className={`text-sm ${muted}`}>No recent activity.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8a7e6d]">📰 Recent Activity (last 24h)</h2>
        <Link
          href="/clients"
          className="text-sm font-medium text-indigo-500 hover:text-indigo-400"
        >
          View All
        </Link>
      </div>
      <ul className={`space-y-2 rounded-xl border ${cardBg} border p-3`}>
        {items.map((item, i) => (
          <motion.li
            key={`${item.time}-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex gap-3 py-2 border-b border-[#2a2520]/50 last:border-0 last:pb-0"
          >
            <span className={`shrink-0 text-xs ${muted}`}>{formatTime(item.time)}</span>
            <span className={`text-sm ${text}`}>{item.text}</span>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
