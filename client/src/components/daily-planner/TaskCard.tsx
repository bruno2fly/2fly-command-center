"use client";

import { useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useDailyPlanner } from "@/contexts/DailyPlannerContext";
import type { Task, TaskBucket } from "@/lib/planner/types";
import { EASE, T } from "@/lib/planner/animations";

/* Cockpit status colors: green=active, amber=caution, dim=idle */
const STATUS_DOT: Record<string, string> = {
  open: "bg-[#4a5060]",
  in_progress: "bg-emerald-400",
  blocked: "bg-amber-400",
  done: "bg-emerald-400/40",
};

const STATUS_BORDER: Record<string, string> = {
  open: "border-l-[#2a2820]",
  in_progress: "border-l-emerald-400",
  blocked: "border-l-amber-400",
  done: "border-l-emerald-400/30",
};

type Props = {
  task: Task;
  variant?: "primary" | "sequence" | "compact";
  index?: number;
  showWhyNow?: boolean;
};

export function TaskCard({ task, variant = "sequence", index, showWhyNow = false }: Props) {
  const { moveTask, setStatus, timeBlocks, assignToBlock } = useDailyPlanner();
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  /* #2 — Green flash on completion */
  const [doneFlash, setDoneFlash] = useState(false);

  /* #4 — START button click feedback */
  const startBtnRef = useRef<HTMLButtonElement>(null);

  const handleStart = useCallback(() => {
    /* #4 — Scale click: 1 → 0.95 → 1 (100ms) */
    if (startBtnRef.current) {
      startBtnRef.current.style.transform = "scale(0.95)";
      setTimeout(() => {
        if (startBtnRef.current) startBtnRef.current.style.transform = "scale(1)";
      }, 100);
    }
    setStatus(task.id, "in_progress");
    toast.success(`Started: ${task.title}`);
  }, [task.id, task.title, setStatus]);

  const handleDone = useCallback(() => {
    /* #2 — Flash green border-left before exit */
    setDoneFlash(true);
    setTimeout(() => {
      setStatus(task.id, "done");
      toast.success(`Done: ${task.title}`);
    }, 150);
  }, [task.id, task.title, setStatus]);

  const handleBlocked = useCallback(() => {
    setStatus(task.id, "blocked");
    toast("Marked as blocked");
  }, [task.id, setStatus]);

  const handlePush = useCallback(() => {
    const next: TaskBucket =
      task.bucket === "now" ? "next" : task.bucket === "next" ? "later" : "later";
    moveTask(task.id, next);
    toast(`Pushed to ${next.toUpperCase()}`);
  }, [task.id, task.bucket, moveTask]);

  const handlePromote = useCallback(() => {
    const target: TaskBucket =
      task.bucket === "later" ? "next" : task.bucket === "next" ? "now" : "now";
    moveTask(task.id, target);
    toast(`Promoted to ${target.toUpperCase()}`);
  }, [task.id, task.bucket, moveTask]);

  const handleAssignBlock = useCallback(
    (blockId: string) => {
      assignToBlock(task.id, blockId);
      setShowBlockMenu(false);
      toast.success("Assigned to block");
    },
    [task.id, assignToBlock]
  );

  const isInProgress = task.status === "in_progress";
  const isDone = task.status === "done";

  /* ─── PRIMARY: PFD Instrument Display ─── */
  if (variant === "primary") {
    return (
      <motion.div
        layout
        /* #3 — New heading: slide in from below, fade */
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        /* #3 — Old heading: slide up and fade out */
        exit={{ opacity: 0, y: -16 }}
        transition={{
          duration: T.normal,
          ease: EASE,
          layout: { duration: T.normal, ease: EASE },
        }}
        className={`group relative border-l-[3px] ${STATUS_BORDER[task.status]} overflow-hidden`}
        style={{
          filter: isInProgress ? "brightness(1.05)" : "brightness(1)",
          transition: `filter ${T.fast * 1000}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          /* #4 — Active teal glow (2s infinite, subtle) */
          boxShadow: isInProgress
            ? "0 0 20px rgba(52,211,153,0.08)"
            : "none",
        }}
      >
        {/* #4 — Active state: subtle teal glow pulse on panel border */}
        {isInProgress && (
          <motion.div
            className="absolute inset-0 pointer-events-none border border-cyan-400/10 rounded-none"
            animate={{
              borderColor: ["rgba(34,211,238,0.06)", "rgba(34,211,238,0.12)", "rgba(34,211,238,0.06)"],
            }}
            transition={{ duration: T.glow, repeat: Infinity, ease: EASE }}
          />
        )}

        {/* Accent bar sweep — plays once on status change */}
        {isInProgress && (
          <motion.div
            key={`sweep-${task.id}-${task.status}`}
            className="absolute left-0 top-0 w-[3px] h-full pointer-events-none overflow-hidden"
          >
            <motion.div
              className="w-full h-8 bg-gradient-to-b from-transparent via-emerald-400/50 to-transparent"
              initial={{ y: "-100%" }}
              animate={{ y: "500%" }}
              transition={{ duration: 0.6, ease: EASE }}
            />
          </motion.div>
        )}

        <div className="pl-5 pr-4 py-5">
          {/* #3 — Title with brief glow on mount (text-shadow pulse) */}
          <motion.h3
            className="text-[23px] font-bold text-emerald-400 leading-tight tracking-tight"
            initial={{ textShadow: "0 0 12px rgba(52,211,153,0.4)" }}
            animate={{ textShadow: "0 0 0px rgba(52,211,153,0)" }}
            transition={{ duration: T.smooth, ease: EASE, delay: T.normal }}
          >
            {task.title}
          </motion.h3>

          {/* Data fields — instrument readout grid */}
          <div className="mt-5 grid grid-cols-3 gap-x-5 gap-y-4">
            <DataField label="Client" value={task.client} />
            <DataField label="Duration" value={`${task.durationMin}m`} mono />
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#4a5060] block mb-0.5 font-medium">
                Status
              </span>
              <div className="flex items-center gap-1.5">
                {/* #4 — Breathing pulse when in_progress */}
                {isInProgress ? (
                  <motion.div
                    className={`w-[6px] h-[6px] rounded-full ${STATUS_DOT[task.status]}`}
                    animate={{ opacity: [1, 0.6, 1] }}
                    transition={{ duration: T.glow, repeat: Infinity, ease: EASE }}
                  />
                ) : (
                  <div
                    className={`w-[6px] h-[6px] rounded-full ${STATUS_DOT[task.status]}`}
                    style={{ transition: `background-color ${T.fast * 1000}ms cubic-bezier(0.4, 0, 0.2, 1)` }}
                  />
                )}
                <span className="text-[13px] text-[#c8c0b0] tabular-nums leading-relaxed">
                  {task.status.replace("_", " ")}
                </span>
              </div>
            </div>
            {task.dueAt && <DataField label="Time" value={task.dueAt} mono />}
            <DataField label="Type" value={task.type} />
          </div>

          {/* Risk / why note — EICAS caution badge */}
          {(showWhyNow && task.whyNow) || task.blockers.length > 0 ? (
            <div className="mt-5 border-t border-[#1a1810] pt-3 space-y-1.5">
              {task.blockers.length > 0 && (
                <p className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md text-sm font-medium inline-block">
                  {task.blockers[0]}
                </p>
              )}
              {showWhyNow && task.whyNow && (
                <p className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md text-sm font-medium inline-block">
                  {task.whyNow}
                </p>
              )}
            </div>
          ) : null}

          {/* Actions — START always visible, secondary on hover */}
          <div className="flex items-center gap-4 mt-5 pt-3 border-t border-[#1a1810]">
            {!isInProgress && !isDone && (
              <button
                ref={startBtnRef}
                type="button"
                onClick={handleStart}
                className="border border-emerald-500/50 text-emerald-400 px-3 py-1 rounded text-xs font-medium uppercase tracking-wide hover:bg-emerald-500/10 hover:scale-[1.03] active:scale-95 transition-all duration-150"
              >
                Start
              </button>
            )}
            <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                type="button"
                onClick={handleDone}
                className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/30 hover:text-emerald-400 hover:scale-[1.03] active:scale-95 transition-all duration-150"
              >
                Done
              </button>
              <button
                type="button"
                onClick={handleBlocked}
                className="text-[11px] font-semibold uppercase tracking-wider text-amber-400/30 hover:text-amber-400 hover:scale-[1.03] active:scale-95 transition-all duration-150"
              >
                Block
              </button>
              <button
                type="button"
                onClick={handlePush}
                className="text-[11px] font-semibold uppercase tracking-wider text-[#3a3a40] hover:text-[#8a7e6d] hover:scale-[1.03] active:scale-95 transition-all duration-150"
              >
                Push
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  /* ─── SEQUENCE / COMPACT: ND Waypoint Row ─── */
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: isDone ? 0.4 : 1, y: 0 }}
      /* #2 — Waypoint passed: slide left + fade out */
      exit={{
        opacity: 0,
        x: -20,
        height: 0,
        marginTop: 0,
        marginBottom: 0,
        paddingTop: 0,
        paddingBottom: 0,
      }}
      transition={{
        duration: T.normal,
        ease: EASE,
        layout: { duration: T.normal, ease: EASE },
      }}
      className={`group flex items-center gap-3 border-l-2 ${
        doneFlash ? "border-l-emerald-400 bg-emerald-400/5" : "border-l-transparent hover:border-l-amber-500/50"
      } ${
        variant === "compact" ? "py-2 px-1" : "py-[11px] px-1"
      } hover:bg-white/5`}
      style={{
        transition: `background-color ${T.fast * 1000}ms cubic-bezier(0.4, 0, 0.2, 1), border-color ${T.fast * 1000}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      }}
      /* #10 — Row hover: micro-scale 1.01 */
      whileHover={{ scale: 1.01 }}
    >
      {/* Index — cyan waypoint number */}
      {index !== undefined && (
        <motion.span
          layout
          className="text-[16px] tabular-nums text-cyan-400/60 w-6 text-right shrink-0 font-bold leading-none"
          transition={{ duration: T.normal, ease: EASE }}
          /* #2 — Number re-count animation: brief scale on change */
          key={`idx-${task.id}-${index}`}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
        >
          {String(index).padStart(2, "0")}
        </motion.span>
      )}

      {/* Status dot */}
      <div
        className={`w-[5px] h-[5px] rounded-full shrink-0 ${STATUS_DOT[task.status]}`}
        style={{ transition: `background-color ${T.fast * 1000}ms cubic-bezier(0.4, 0, 0.2, 1)` }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2">
        <p
          className={`font-medium truncate leading-relaxed ${
            variant === "compact"
              ? "text-[12px] text-[#a09888]"
              : `text-[15px] ${isInProgress ? "text-gray-100" : "text-gray-100"}`
          }`}
          style={{ transition: `color ${T.fast * 1000}ms cubic-bezier(0.4, 0, 0.2, 1)` }}
        >
          {task.title}
        </p>
        {variant !== "compact" && (
          <span className="text-[11px] text-[#4a4030] truncate shrink-0">
            {task.client}
          </span>
        )}
      </div>

      {/* Right-aligned data */}
      <div className="flex items-center gap-3 shrink-0">
        {task.dueAt && variant !== "compact" && (
          <span className="text-[11px] text-[#4a5060] tabular-nums">{task.dueAt}</span>
        )}
        <span className="text-[11px] text-[#3a3a40] tabular-nums w-7 text-right font-medium">
          {task.durationMin}m
        </span>
      </div>

      {/* Hover actions — #10 button hover scale */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {!isInProgress && !isDone && (
          <button
            type="button"
            onClick={handleStart}
            className="p-1 text-[#3a3a40] hover:text-emerald-400 hover:scale-[1.03] active:scale-95 transition-all duration-100"
            title="Start"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><polygon points="5,3 13,8 5,13" /></svg>
          </button>
        )}
        <button
          type="button"
          onClick={handleDone}
          className="p-1 text-[#3a3a40] hover:text-emerald-400 hover:scale-[1.03] active:scale-95 transition-all duration-100"
          title="Done"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3,8 7,12 13,4" /></svg>
        </button>
        {task.bucket !== "now" && (
          <button
            type="button"
            onClick={handlePromote}
            className="p-1 text-[#3a3a40] hover:text-cyan-400 hover:scale-[1.03] active:scale-95 transition-all duration-100"
            title="Promote"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4,10 8,6 12,10" /></svg>
          </button>
        )}
        {task.bucket !== "later" && (
          <button
            type="button"
            onClick={handlePush}
            className="p-1 text-[#3a3a40] hover:text-[#6a6050] hover:scale-[1.03] active:scale-95 transition-all duration-100"
            title="Push"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4,6 8,10 12,6" /></svg>
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowBlockMenu(!showBlockMenu)}
            className="p-1 text-[#3a3a40] hover:text-[#6a6050] hover:scale-[1.03] active:scale-95 transition-all duration-100"
            title="Assign block"
          >
            <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6" /><polyline points="8,4 8,8 11,9" /></svg>
          </button>
          <AnimatePresence>
            {showBlockMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: T.click, ease: EASE }}
                className="absolute right-0 top-full mt-1 z-20 w-44 border border-[#1a1810] bg-[#0a0c10] py-1"
              >
                {timeBlocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleAssignBlock(b.id)}
                    className="w-full text-left px-3 py-1.5 text-[10px] text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c8c0b0] transition-colors"
                  >
                    {b.label} <span className="text-[#4a4030]">{b.minutes}m</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Data field helper ─── */
function DataField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-[#4a5060] block mb-0.5 font-medium">
        {label}
      </span>
      <span
        className={`text-[13px] text-[#c8c0b0] leading-relaxed ${
          mono ? "tabular-nums" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );
}
