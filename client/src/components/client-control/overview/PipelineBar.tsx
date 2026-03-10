"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

const STAGES = [
  { id: "requests", label: "Requests" },
  { id: "in_progress", label: "In Progress" },
  { id: "waiting_client", label: "Waiting" },
  { id: "review", label: "Review" },
  { id: "delivered", label: "Delivered" },
] as const;

type Counts = Record<string, number>;

function AnimatedCount({ value, duration = 400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let rafId: number;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(eased * value));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);

  return <>{display}</>;
}

type Props = {
  counts: Counts;
};

export function PipelineBar({ counts }: Props) {
  const { isDark } = useTheme();

  const maxCount = Math.max(...STAGES.map((s) => counts[s.id] ?? 0), 1);

  const stripCls = isDark
    ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]"
    : "bg-white border-[rgba(226,232,240,1)]";
  const stageBorderCls = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-gray-500";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`rounded-2xl border backdrop-blur-[8px] overflow-hidden ${stripCls}`}
    >
      <div
        className={`px-4 py-3 border-b ${stageBorderCls}`}
      >
        <h2 className={labelCls}>📊 Pipeline</h2>
      </div>
      <div className="flex">
        {STAGES.map(({ id, label }) => {
          const count = counts[id] ?? 0;
          const isActive = count > 0 && count === maxCount;

          return (
            <motion.div
              key={id}
              className={`flex-1 min-w-0 px-3 py-3 text-center border-r last:border-r-0 ${stageBorderCls} transition-all duration-200 ${
                isActive ? (isDark ? "bg-blue-500/5" : "bg-blue-50/80") : ""
              }`}
              animate={
                count > 0
                  ? {
                      boxShadow: isActive
                        ? isDark
                          ? "0 0 20px rgba(59, 130, 246, 0.15)"
                          : "0 0 20px rgba(59, 130, 246, 0.08)"
                        : "none",
                    }
                  : undefined}
            >
              <p className={labelCls}>{label}</p>
              <motion.p
                className={`mt-1 text-base font-bold tabular-nums ${
                  count > 0
                    ? isDark
                      ? "text-emerald-400"
                      : "text-emerald-600"
                    : isDark
                      ? "text-[#5a5040]"
                      : "text-gray-400"
                }`}
                key={count}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <AnimatedCount value={count} duration={400} />
              </motion.p>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
