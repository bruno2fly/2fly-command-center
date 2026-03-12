"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ApiBrief } from "@/lib/api";

const SUMMARY_TRUNCATE = 300;

type Props = {
  dateLabel: string;
};

function parseHealthSnapshot(snapshot: string | null): string | null {
  if (!snapshot) return null;
  try {
    const o = typeof snapshot === "string" ? JSON.parse(snapshot) : snapshot;
    if (o && typeof o === "object") {
      const g = Number(o.green) || 0;
      const y = Number(o.yellow) || 0;
      const r = Number(o.red) || 0;
      if (g + y + r > 0) return `${g}🟢 ${y}🟡 ${r}🔴`;
    }
  } catch {
    // ignore
  }
  return null;
}

export function DailyBriefCard({ dateLabel }: Props) {
  const { isDark } = useTheme();
  const [brief, setBrief] = useState<ApiBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    api
      .getBriefs({ type: "morning", date: "today", limit: 1 })
      .then((r) => setBrief(r.briefs?.[0] ?? null))
      .catch(() => setBrief(null))
      .finally(() => setLoading(false));
  }, []);

  const bg = isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-white border-gray-200";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8a7e6d]">📋 Today&apos;s Brief</h2>
        <div className={`rounded-xl border ${bg} border px-4 py-6 animate-pulse`} />
      </section>
    );
  }

  const healthStr = brief ? parseHealthSnapshot(brief.healthSnapshot) : null;
  const summary = brief?.summary ?? "";
  const truncated = summary.length > SUMMARY_TRUNCATE ? summary.slice(0, SUMMARY_TRUNCATE) + "…" : summary;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[#8a7e6d]">
        📋 Today&apos;s Brief — {dateLabel}
      </h2>
      <div className={`rounded-xl border ${bg} border p-4`}>
        {!brief ? (
          <p className={`text-sm ${muted}`}>Morning brief will be generated at 9 AM.</p>
        ) : (
          <>
            {healthStr && (
              <p className={`text-sm ${text} mb-2`}>Client health summary: {healthStr}</p>
            )}
            <div className={`text-sm ${muted} whitespace-pre-wrap`}>
              <AnimatePresence mode="wait">
                {expanded ? (
                  <motion.div
                    key="full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {summary}
                  </motion.div>
                ) : (
                  <motion.div
                    key="truncated"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {truncated}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="text-sm font-medium text-indigo-500 hover:text-indigo-400"
              >
                {expanded ? "Show less" : "Full ▶"}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
