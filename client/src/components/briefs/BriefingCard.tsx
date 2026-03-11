"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { api, type ApiBrief } from "@/lib/api";
import { BriefRow } from "./BriefRow";

type Props = {
  onOpenBrief: (brief: ApiBrief) => void;
  pulseOnce?: boolean;
};

export function BriefingCard({ onOpenBrief, pulseOnce }: Props) {
  const { isDark } = useTheme();
  const [briefs, setBriefs] = useState<ApiBrief[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getBriefsToday()
      .then((r) => setBriefs(r.briefs ?? []))
      .catch(() => setBriefs([]))
      .finally(() => setLoading(false));
  }, []);

  const unreadCount = briefs.filter((b) => b.status === "unread").length;
  const cardBg = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <motion.section
      className={`rounded-2xl border overflow-hidden ${cardBg}`}
      animate={pulseOnce ? { scale: [1, 1.01, 1] } : {}}
      transition={{ duration: 0.4 }}
    >
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <div className="flex items-center gap-2">
          <h2 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            📋 Today&apos;s Briefings
          </h2>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full bg-blue-500 text-white text-xs font-medium">
              {unreadCount}
            </span>
          )}
        </div>
      </div>

      <div className={`max-h-[320px] overflow-y-auto ${isDark ? "divide-[#1a1810]" : "divide-gray-100"} divide-y`}>
        {loading ? (
          <div className={`px-4 py-6 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Loading…
          </div>
        ) : briefs.length === 0 ? (
          <div className={`px-4 py-6 text-center text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            No briefings yet — agents report at 9 AM, 10 AM, 11 AM
          </div>
        ) : (
          briefs.map((brief) => (
            <BriefRow key={brief.id} brief={brief} onClick={() => onOpenBrief(brief)} />
          ))
        )}
      </div>
    </motion.section>
  );
}
