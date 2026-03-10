"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

function AnimatedNumber({ value, duration = 400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(eased * value));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);
  return <>{display}</>;
}

export type ContentKPIs = {
  scheduledThisWeek: number;
  inProduction: number;
  publishedMTD: number;
  contentScore: number;
  postingStreak: number;
};

type Props = {
  kpis: ContentKPIs;
};

export function ContentKPIStrip({ kpis }: Props) {
  const { isDark } = useTheme();

  const cardCls =
    "flex flex-col gap-1 min-w-0 flex-1 rounded-2xl border backdrop-blur-[8px] p-3 transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-500/20";
  const bgCls = isDark ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]" : "bg-white border-[rgba(226,232,240,1)]";
  const labelCls = "text-[10px] font-semibold uppercase tracking-wider text-gray-500";
  const valueCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";

  const metrics = [
    { label: "Scheduled", value: kpis.scheduledThisWeek, sub: "this week" },
    { label: "In Production", value: kpis.inProduction, sub: "items" },
    { label: "Published (MTD)", value: kpis.publishedMTD, sub: "posts" },
    { label: "Content Score", value: kpis.contentScore, sub: "of target", suffix: "%" },
    { label: "Posting Streak", value: kpis.postingStreak, sub: "days" },
  ];

  return (
    <div className="flex flex-wrap gap-3 p-4 overflow-x-auto">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * 0.05 }}
          className={`${cardCls} ${bgCls} min-w-[100px]`}
        >
          <p className={labelCls}>{m.label}</p>
          <p className={`text-lg font-bold tabular-nums ${valueCls}`}>
            <AnimatedNumber value={m.value} />
            {m.suffix ?? ""}
          </p>
          <p className="text-[10px] text-gray-500">{m.sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
