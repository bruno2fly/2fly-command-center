"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useDailyPlanner } from "@/contexts/DailyPlannerContext";
import { TaskCard } from "./TaskCard";
import { EASE, T, STAGGER } from "@/lib/planner/animations";

export function PlannerColumn() {
  const { tasksByBucket } = useDailyPlanner();
  const nextTasks = tasksByBucket("next");
  const laterTasks = tasksByBucket("later");

  return (
    <div className="flex flex-col min-h-0">
      {/* NEXT — Active route waypoints */}
      <div className="flex items-baseline justify-between mb-3 px-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/50">
          Sequence — Next
        </span>
        <span className="text-[11px] tabular-nums text-cyan-400/30 font-semibold">
          {nextTasks.length}<span className="text-[10px] text-[#4a5060] ml-1 font-medium normal-nums"> tasks</span>
        </span>
      </div>

      {/* #1 — ND power-on: task rows fade in with 50ms stagger */}
      <motion.div
        className="flex-1 overflow-y-auto"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: STAGGER.fast, delayChildren: 0.3 },
          },
        }}
      >
        <AnimatePresence mode="popLayout">
          {nextTasks.length === 0 ? (
            <p className="text-[12px] text-emerald-400/30 px-1 py-5 uppercase tracking-wider font-medium">
              Clear.
            </p>
          ) : (
            nextTasks.map((task, i) => (
              <TaskCard key={task.id} task={task} variant="sequence" index={i + 1} />
            ))
          )}
        </AnimatePresence>
      </motion.div>

      {/* LATER — Holding pattern */}
      {laterTasks.length > 0 && (
        <>
          <div className="border-t border-[#1a1810] mt-4 pt-4 flex items-baseline justify-between mb-3 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#4a5060]">
              Holding
            </span>
            <span className="text-[11px] tabular-nums text-[#3a3a40] font-medium">
              {laterTasks.length}<span className="text-[10px] text-[#3a3a40] ml-1 font-medium normal-nums"> tasks</span>
            </span>
          </div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: {
                transition: { staggerChildren: STAGGER.fast, delayChildren: 0.5 },
              },
            }}
          >
            <AnimatePresence mode="popLayout">
              {laterTasks.map((task, i) => (
                <TaskCard key={task.id} task={task} variant="compact" index={nextTasks.length + i + 1} />
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </div>
  );
}
