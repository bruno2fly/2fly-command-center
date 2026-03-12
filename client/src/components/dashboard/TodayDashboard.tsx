"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { api, type DashboardTodayResponse } from "@/lib/api";
import { DashboardHeader } from "./DashboardHeader";
import { CriticalSection } from "./CriticalSection";
import { AttentionSection } from "./AttentionSection";
import { AgentsHandlingSection } from "./AgentsHandlingSection";
import { YourTasksSection } from "./YourTasksSection";
import { RecentActivityFeed } from "./RecentActivityFeed";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export function TodayDashboard() {
  const { isDark } = useTheme();
  const [data, setData] = useState<DashboardTodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchToday = useCallback(async () => {
    try {
      setError(null);
      const res = await api.getDashboardToday();
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const bg = isDark ? "bg-[#08080c]" : "bg-gray-50";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} p-6`}>
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse rounded-xl border border-[#2a2520] bg-[#0d0d0f] h-24 mb-6" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse rounded-xl border border-[#2a2520] bg-[#0d0d0f] h-20" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`min-h-screen ${bg} p-6`}>
        <div className="mx-auto max-w-4xl text-center py-12">
          <p className={isDark ? "text-red-400" : "text-red-600"}>{error || "No data"}</p>
          <button
            type="button"
            onClick={() => { setLoading(true); fetchToday(); }}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} p-4 sm:p-6`}>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="mx-auto max-w-4xl space-y-8"
      >
        <motion.div variants={item}>
          <DashboardHeader data={data} />
        </motion.div>

        <motion.div variants={item}>
          <CriticalSection items={data.critical} />
        </motion.div>

        <motion.div variants={item}>
          <AttentionSection items={data.attention} />
        </motion.div>

        <motion.div variants={item}>
          <AgentsHandlingSection items={data.agentsHandling} />
        </motion.div>

        <motion.div variants={item}>
          <YourTasksSection items={data.yourTasks} onComplete={fetchToday} />
        </motion.div>

        <motion.div variants={item}>
          <RecentActivityFeed items={data.recentActivity} />
        </motion.div>
      </motion.div>
    </div>
  );
}
