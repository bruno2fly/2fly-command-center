"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useDailyPlanner } from "@/contexts/DailyPlannerContext";
import { EASE, T } from "@/lib/planner/animations";
import type { WorkMode } from "@/lib/planner/types";

const MODE_OPTIONS: { value: WorkMode; label: string }[] = [
  { value: "deep", label: "Deep" },
  { value: "admin", label: "Admin" },
  { value: "calls", label: "Calls" },
];

export function DailyPlannerHeader() {
  const { workMode, setWorkMode, startFocusLock, focusLockUntil, doneCount, totalCount } =
    useDailyPlanner();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  /* #7 — Track previous done count for tick animation */
  const prevDoneRef = useRef(doneCount);
  const [progressTick, setProgressTick] = useState(false);
  useEffect(() => {
    if (doneCount > prevDoneRef.current) {
      setProgressTick(true);
      const t = setTimeout(() => setProgressTick(false), 200);
      prevDoneRef.current = doneCount;
      return () => clearTimeout(t);
    }
    prevDoneRef.current = doneCount;
  }, [doneCount]);

  /* #7 — All done flash */
  const allDone = doneCount > 0 && doneCount === totalCount;

  /* #9 — Lock active state */
  const isLocked = focusLockUntil !== null && focusLockUntil > Date.now();

  return (
    <div className="flex items-center justify-between border-b border-[#1a1810] pb-4">
      {/* Left: instrument readout */}
      <div className="flex items-center gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#4a5060] block mb-0.5 font-medium">
            Date
          </span>
          <span
            className="text-[14px] tabular-nums text-emerald-400/90 font-semibold leading-none"
            suppressHydrationWarning
          >
            {today}
          </span>
        </div>
        <div className="w-px h-7 bg-[#1a1810]" />
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[#4a5060] block mb-1 font-medium">
            Progress
          </span>
          <div className="flex items-center gap-3">
            {/* #7 — Progress bar with segment fill animation */}
            <div className={`w-20 h-[5px] bg-[#1a1810] overflow-hidden rounded-sm relative ${allDone ? "ring-1 ring-emerald-400/30" : ""}`}>
              <motion.div
                className="h-full bg-emerald-400/70 rounded-sm"
                style={{ width: `${pct}%` }}
                /* #7 — Micro scale bounce on segment fill */
                animate={
                  progressTick
                    ? { scaleX: [1, 1.03, 1] }
                    : allDone
                    ? { backgroundColor: ["rgba(52,211,153,0.7)", "rgba(52,211,153,1)", "rgba(52,211,153,0.7)"] }
                    : {}
                }
                transition={{ duration: T.fast, ease: EASE }}
                layout
              />
              {/* #7 — All-done green flash */}
              {allDone && (
                <motion.div
                  className="absolute inset-0 bg-emerald-400/20 rounded-sm"
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: T.smooth, ease: EASE }}
                />
              )}
            </div>

            {/* #7 — Counter tick: scale up 1.05x on increment */}
            <motion.span
              key={doneCount}
              className="text-[13px] tabular-nums text-emerald-400/80 font-semibold"
              initial={progressTick ? { scale: 1.05 } : { scale: 1 }}
              animate={{ scale: 1 }}
              transition={{ duration: T.normal, ease: EASE }}
            >
              {doneCount}/{totalCount}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Right: MCP controls */}
      <div className="flex items-center gap-3">
        {/* Mode selector — #10 button hover scale */}
        <div className="flex border border-[#1a1810] bg-[#0a0a0e]">
          {MODE_OPTIONS.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setWorkMode(opt.value)}
              className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] transition-all duration-150 hover:scale-[1.03] active:scale-95 ${
                i > 0 ? "border-l border-[#1a1810]" : ""
              } ${
                workMode === opt.value
                  ? "bg-[#141210] text-emerald-400/90"
                  : "text-[#4a4030] hover:text-[#8a7e6d]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Plan button */}
        <button
          type="button"
          onClick={() => toast("Plan — coming soon")}
          className="px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400/60 border border-[#1a1810] bg-[#0a0a0e] hover:bg-[#141210] hover:text-emerald-400/90 hover:scale-[1.03] active:scale-95 transition-all duration-150"
        >
          Plan
        </button>

        {/* #9 — Focus lock: glow when active */}
        <button
          type="button"
          onClick={() => {
            startFocusLock(60);
            toast.success("Focus locked 60m");
          }}
          className={`px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider border bg-[#0a0a0e] hover:scale-[1.03] active:scale-95 transition-all duration-150 ${
            isLocked
              ? "text-cyan-400 border-cyan-400/30 shadow-[0_0_12px_rgba(34,211,238,0.15)]"
              : "text-amber-400/60 border-[#1a1810] hover:bg-[#141210] hover:text-amber-400/90"
          }`}
        >
          Lock 60m
        </button>
      </div>
    </div>
  );
}
