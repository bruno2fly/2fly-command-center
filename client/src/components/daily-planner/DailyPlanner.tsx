"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDailyPlanner } from "@/contexts/DailyPlannerContext";
import { useTheme } from "@/contexts/ThemeContext";
import { DailyPlannerHeader } from "./DailyPlannerHeader";
import { TaskCard } from "./TaskCard";
import { PlannerColumn } from "./PlannerColumn";
import { TimeBlocksPanel } from "./TimeBlocksPanel";
import { InboxTray } from "./InboxTray";
import { EASE, T, STAGGER, useCountUp, usePrefersReducedMotion } from "@/lib/planner/animations";

export function DailyPlanner() {
  const { isDark } = useTheme();
  const { tasks, tasksByBucket, focusLockUntil, doneCount, totalCount } = useDailyPlanner();
  const reducedMotion = usePrefersReducedMotion();

  const nowTasks = tasksByBucket("now");
  const primaryTask = nowTasks[0] ?? null;
  const secondaryNow = nowTasks.slice(1);

  const totalDeep = useMemo(() => tasks.filter((t) => t.type === "deep" && t.bucket !== "inbox" && t.status !== "done").reduce((s, t) => s + t.durationMin, 0), [tasks]);
  const totalAdmin = useMemo(() => tasks.filter((t) => t.type === "admin" && t.bucket !== "inbox" && t.status !== "done").reduce((s, t) => s + t.durationMin, 0), [tasks]);
  const totalCalls = useMemo(() => tasks.filter((t) => t.type === "call" && t.bucket !== "inbox" && t.status !== "done").reduce((s, t) => s + t.durationMin, 0), [tasks]);
  const maxCap = 480;
  const totalUsed = totalDeep + totalAdmin + totalCalls;

  const hasActiveFocus = useMemo(
    () => tasks.some((t) => t.status === "in_progress" && t.bucket === "now"),
    [tasks]
  );

  /* #1 — Panel power-on: stagger mount */
  const [gaugeReady, setGaugeReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGaugeReady(true), 800);
    return () => clearTimeout(t);
  }, []);

  /* #9 — Lock 60m: detect active lock */
  const isLocked = focusLockUntil !== null && focusLockUntil > Date.now();

  /* #7 — All done flash */
  const allDone = doneCount > 0 && doneCount === totalCount;

  const skipAnim = reducedMotion;

  return (
    <div
      className="flex flex-col h-full relative z-10"
      style={COCKPIT_CSS_VARS}
    >
      {/* #9 — Lock teal border sweep (one revolution, 600ms) */}
      {isLocked && !skipAnim && <LockBorderSweep />}

      <div className="flex-1 overflow-auto px-5 py-4 sm:px-7 sm:py-5">
        <DailyPlannerHeader isDark={isDark} />

        {/* #1 — Panel power-on stagger sequence (~1.5s) */}
        <motion.div
          className="mt-5 flex flex-col lg:flex-row gap-4 min-h-0"
          initial={skipAnim ? "visible" : "hidden"}
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: STAGGER.panel, delayChildren: 0.1 },
            },
          }}
        >
          {/* LEFT: PFD — Primary Flight Display */}
          <motion.div
            className="lg:w-[30%] min-w-0 shrink-0"
            variants={{
              hidden: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
              visible: {
                opacity: 1,
                clipPath: "inset(0 0% 0 0)",
                transition: { duration: T.panel, ease: EASE },
              },
            }}
          >
            <InstrumentPanel label="PFD" sublabel="Primary Objective" color="emerald" isDark={isDark}>
              <div className="p-4">
                <AnimatePresence mode="popLayout">
                  {primaryTask ? (
                    <TaskCard key={primaryTask.id} task={primaryTask} variant="primary" showWhyNow isDark={isDark} />
                  ) : (
                    <div className={`border-l-[3px] pl-5 py-6 ${isDark ? "border-l-[#1a1810]" : "border-l-gray-200"}`}>
                      <p className="text-[12px] text-emerald-400/30 uppercase tracking-wider font-medium">
                        No active objective
                      </p>
                    </div>
                  )}
                </AnimatePresence>

                {secondaryNow.length > 0 && (
                  <div className={`mt-3 border-t pt-3 ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
                    <AnimatePresence mode="popLayout">
                      {secondaryNow.map((task, i) => (
                        <TaskCard key={task.id} task={task} variant="sequence" index={i + 2} showWhyNow isDark={isDark} />
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </InstrumentPanel>
          </motion.div>

          {/* CENTER: ND — Navigation Display */}
          <motion.div
            className="lg:w-[44%] min-w-0 shrink-0"
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: T.smooth, ease: EASE, delay: STAGGER.panel },
              },
            }}
            style={{
              opacity: hasActiveFocus ? 0.7 : undefined,
              transition: `opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            <InstrumentPanel label="ND" sublabel="Flight Sequence" color="cyan" isDark={isDark}>
              <div className="p-4">
                <PlannerColumn />
              </div>
            </InstrumentPanel>
          </motion.div>

          {/* RIGHT: EICAS — System Status */}
          <motion.div
            className="lg:w-[26%] min-w-0 shrink-0"
            variants={{
              hidden: { opacity: 0, y: 8 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: T.smooth, ease: EASE, delay: STAGGER.panel * 2 },
              },
            }}
            style={{
              opacity: hasActiveFocus ? 0.7 : undefined,
              transition: `opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            <InstrumentPanel label="EICAS" sublabel="System Status" color="amber" isDark={isDark}>
              <div className="p-4">
                <TimeBlocksPanel />
              </div>
            </InstrumentPanel>
          </motion.div>
        </motion.div>
      </div>

      {/* #5 — Engine Instruments: Arc Gauges with spool-up animation */}
      <motion.div
        className={`shrink-0 border-t px-5 sm:px-7 py-5 ${isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-200 bg-gray-100"}`}
        initial={skipAnim ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: hasActiveFocus ? 0.9 : 1, y: 0 }}
        transition={{ duration: T.smooth, ease: EASE, delay: 0.6 }}
      >
        <div className="flex items-center justify-center gap-10 lg:gap-14">
          <ArcGauge label="Deep Work" value={totalDeep} max={maxCap} color="#22d3ee" ready={gaugeReady} delay={0} />
          <ArcGauge label="Admin" value={totalAdmin} max={maxCap} color="#fbbf24" ready={gaugeReady} delay={STAGGER.gauge} />
          <ArcGauge label="Calls" value={totalCalls} max={maxCap} color="#34d399" ready={gaugeReady} delay={STAGGER.gauge * 2} />

          <div className={`w-px h-16 mx-2 ${isDark ? "bg-[#1a1810]" : "bg-gray-200"}`} />

          <TotalLoadReadout value={totalUsed} max={maxCap} ready={gaugeReady} allDone={allDone} />
        </div>
      </motion.div>

      {/* Datalink Inbox */}
      <div className="shrink-0">
        <InboxTray isDark={isDark} />
      </div>
    </div>
  );
}

/* ─── Cockpit CSS Variables (applied to root) ─── */
const COCKPIT_CSS_VARS: React.CSSProperties = {
  // @ts-expect-error CSS custom properties
  "--cockpit-green": "#34d399",
  "--cockpit-amber": "#fbbf24",
  "--cockpit-cyan": "#22d3ee",
  "--cockpit-red": "#f87171",
  "--cockpit-white": "#e0d8c8",
};

/* ─── Instrument Panel Bezel ─── */
function InstrumentPanel({
  label,
  sublabel,
  color,
  isDark = true,
  children,
}: {
  label: string;
  sublabel: string;
  color: "emerald" | "cyan" | "amber";
  isDark?: boolean;
  children: React.ReactNode;
}) {
  const colorMap = {
    emerald: "text-emerald-400/60",
    cyan: "text-cyan-400/60",
    amber: "text-amber-400/60",
  };

  return (
    <div
      className={`border h-full flex flex-col transition-[filter] duration-150 ${
        isDark ? "border-[#1a1810] bg-[#0a0c10]" : "border-gray-200 bg-white"
      }`}
      style={{
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.02), 0 0 24px rgba(0,0,0,0.5)",
      }}
      /* #10 — Panel hover: brightness +5% */
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.filter = "brightness(1.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.filter = "brightness(1)";
      }}
    >
      {/* Nameplate */}
      <div className={`flex items-center gap-2 px-4 py-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        <span className={`text-[10px] font-bold uppercase tracking-[0.25em] ${colorMap[color]}`}>
          {label}
        </span>
        <span className={`text-[9px] uppercase tracking-[0.15em] font-medium flex-1 ${isDark ? "text-[#3a3a40]" : "text-gray-500"}`}>
          {sublabel}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
    </div>
  );
}

/* ─── Arc Gauge — Engine N1/N2 style with spool-up ─── */
function ArcGauge({
  label,
  value,
  max,
  color,
  ready,
  delay = 0,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  ready: boolean;
  delay?: number;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const r = 30;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;

  /* #5 — Spool from 0 on mount, then tween on changes */
  const [spooled, setSpooled] = useState(false);
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => setSpooled(true), delay * 1000);
    return () => clearTimeout(t);
  }, [ready, delay]);

  const displayPct = spooled ? pct : 0;
  const offset = arcLen - (displayPct / 100) * arcLen;

  /* Animated number */
  const animatedNum = useCountUp(displayPct, T.gauge, spooled || !ready);

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: T.smooth, ease: EASE, delay: 0.6 + delay }}
    >
      <div className="relative w-[76px] h-[76px]">
        <svg
          viewBox="0 0 76 76"
          className="w-full h-full"
          style={{ transform: "rotate(135deg)" }}
        >
          {/* Track */}
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke="#1a1810"
            strokeWidth="5"
            strokeDasharray={`${arcLen} ${circ}`}
            strokeLinecap="round"
          />
          {/* Fill — smooth ease-out spool */}
          <circle
            cx="38"
            cy="38"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeDasharray={`${arcLen} ${circ}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            opacity={0.85}
            style={{
              transition: `stroke-dashoffset ${T.gauge}s cubic-bezier(0, 0, 0.2, 1)`,
            }}
          />
        </svg>
        {/* Center readout — animated counter */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-[17px] font-bold tabular-nums leading-none"
            style={{
              color,
              transition: `color 300ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            {animatedNum}
          </span>
          <span className="text-[8px] text-[#4a5060] mt-px font-medium">%</span>
        </div>
      </div>
      <span className="text-[9px] uppercase tracking-[0.15em] text-[#4a5060] font-medium mt-1">
        {label}
      </span>
      <span className="text-[11px] tabular-nums text-[#6a6050]">
        {value}m
      </span>
    </motion.div>
  );
}

/* ─── Total Load Readout with count-up ─── */
function TotalLoadReadout({
  value,
  max,
  ready,
  allDone,
}: {
  value: number;
  max: number;
  ready: boolean;
  allDone: boolean;
}) {
  const pct = Math.round((value / max) * 100);
  const animatedPct = useCountUp(pct, T.gauge, ready);

  return (
    <div className="text-center">
      <span className="text-[9px] uppercase tracking-[0.2em] text-[#4a5060] block mb-1 font-medium">
        Total Load
      </span>
      <motion.span
        key={pct}
        initial={{ scale: 1.05, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: T.normal, ease: EASE }}
        className={`text-[22px] font-bold tabular-nums leading-none inline-block ${
          allDone ? "text-emerald-400" : "text-[#e0d8c8]"
        }`}
        style={{ transition: `color ${T.smooth}s cubic-bezier(0.4, 0, 0.2, 1)` }}
      >
        {animatedPct}
        <span className="text-[12px] text-[#5a5040] font-medium">%</span>
      </motion.span>
      <span className="text-[11px] tabular-nums text-[#4a5060] block mt-0.5">
        {value}m / {max}m
      </span>
    </div>
  );
}

/* ─── #9 — Lock Border Sweep (one revolution, 600ms) ─── */
function LockBorderSweep() {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none z-50"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
    >
      <div
        className="absolute inset-0 rounded-none"
        style={{
          background: "conic-gradient(from 0deg, transparent 0%, rgba(34,211,238,0.15) 25%, transparent 50%)",
          animation: "lockSweep 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
        }}
      />
      <style>{`
        @keyframes lockSweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
}
