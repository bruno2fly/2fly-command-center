"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import Link from "next/link";
import { api, type ApiDirective } from "@/lib/api";

const STATUS_ICON: Record<string, string> = {
  pending: "⏳",
  processing: "⏳",
  completed: "✅",
  failed: "❌",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function RecentDirectives() {
  const { isDark } = useTheme();
  const [directives, setDirectives] = useState<ApiDirective[]>([]);

  useEffect(() => {
    api
      .getDirectives()
      .then((r) => setDirectives((r.directives ?? []).slice(0, 5)))
      .catch(() => {});
  }, []);

  const cardBg = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";

  if (directives.length === 0) return null;

  return (
    <section className={`rounded-2xl border overflow-hidden ${cardBg}`}>
      <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <h2 className={`text-sm font-semibold ${textCls}`}>Recent Agent Activity</h2>
      </div>
      <ul className={`divide-y ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
        {directives.map((d, i) => (
          <motion.li
            key={d.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={`/clients${d.clientId ? `/${d.clientId}` : ""}`}
              className={`block px-4 py-2.5 hover:bg-black/5 dark:hover:bg-white/5 ${textCls}`}
            >
              <p className="text-xs truncate">{d.message.slice(0, 50)}{d.message.length > 50 ? "…" : ""}</p>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                <span>{STATUS_ICON[d.status] ?? "•"} {d.agentName}</span>
                {d.tasksCreated + d.contentCreated > 0 && (
                  <span>{d.contentCreated} content, {d.tasksCreated} tasks</span>
                )}
                {d.clientName && <span>{d.clientName}</span>}
                <span>{formatTime(d.createdAt)}</span>
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
