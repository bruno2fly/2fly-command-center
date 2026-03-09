"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDailyPlanner } from "@/contexts/DailyPlannerContext";
import { EASE, T } from "@/lib/planner/animations";

export function TimeBlocksPanel() {
  const { tasks, timeBlocks, getTask, removeFromBlock } = useDailyPlanner();

  const blockedTasks = useMemo(
    () => tasks.filter((t) => t.status === "blocked" && t.bucket !== "inbox"),
    [tasks]
  );
  const waitingTasks = useMemo(
    () => tasks.filter((t) => t.tags.includes("Waiting") && t.status !== "done"),
    [tasks]
  );
  const urgentTasks = useMemo(
    () => tasks.filter((t) => t.tags.includes("Urgent") && t.status !== "done" && t.bucket !== "now"),
    [tasks]
  );
  const withBlockers = useMemo(
    () => tasks.filter((t) => t.blockers.length > 0 && t.status !== "done"),
    [tasks]
  );

  const totalAlerts = blockedTasks.length + waitingTasks.length + urgentTasks.length + withBlockers.length;

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto">
        {/* EICAS-style caution messages — with subtle pulse */}
        <AnimatePresence mode="popLayout">
          {blockedTasks.length > 0 && (
            <EicasGroup key="caution" label="Caution" dotColor="bg-amber-400" textColor="text-amber-400/80" pulse>
              {blockedTasks.map((t) => (
                <EicasRow key={t.id} id={t.id} text={t.title} sub={t.client} textColor="text-amber-400/70" />
              ))}
            </EicasGroup>
          )}

          {waitingTasks.length > 0 && (
            <EicasGroup key="waiting" label="Waiting" dotColor="bg-amber-400/70" textColor="text-amber-400/60" pulse>
              {waitingTasks.map((t) => (
                <EicasRow key={t.id} id={t.id} text={t.title} sub={t.client} textColor="text-amber-400/50" />
              ))}
            </EicasGroup>
          )}

          {urgentTasks.length > 0 && (
            <EicasGroup key="warning" label="Warning" dotColor="bg-red-400" textColor="text-red-400/80" pulse>
              {urgentTasks.map((t) => (
                <EicasRow key={t.id} id={t.id} text={t.title} sub={t.client} textColor="text-red-400/70" />
              ))}
            </EicasGroup>
          )}

          {withBlockers.length > 0 && (
            <EicasGroup key="deps" label="Dependencies" dotColor="bg-[#4a5060]" textColor="text-[#8a8090]">
              {withBlockers.map((t) => (
                <EicasRow key={t.id} id={t.id} text={t.blockers[0]} sub={t.client} textColor="text-[#6a6570]" />
              ))}
            </EicasGroup>
          )}
        </AnimatePresence>

        {/* All clear */}
        {totalAlerts === 0 && (
          <motion.div
            className="flex items-center gap-2 px-1 py-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: T.normal, ease: EASE }}
          >
            <div className="w-[5px] h-[5px] rounded-full bg-emerald-400/60" />
            <p className="text-[11px] text-emerald-400/60 uppercase tracking-wider font-semibold">
              Normal
            </p>
          </motion.div>
        )}

        {/* Allocations — fuel management style */}
        <div className="border-t border-[#1a1810] mt-4 pt-4">
          <div className="flex items-baseline justify-between mb-3 px-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#3a3a40]">
              Allocations
            </span>
          </div>
          {timeBlocks.map((block) => {
            const assigned = block.assignedTaskIds.map((id) => getTask(id)).filter(Boolean);
            const usedMin = assigned.reduce((s, t) => s + (t?.durationMin ?? 0), 0);
            return (
              <div key={block.id} className="py-1.5 px-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-[#5a5040] leading-relaxed">{block.label}</span>
                  <span className="text-[11px] text-[#3a3a40] tabular-nums font-medium">
                    {usedMin}/{block.minutes}m
                  </span>
                </div>
                {assigned.map((t) => t && (
                  <div key={t.id} className="flex items-center justify-between group mt-0.5 pl-2">
                    <span className="text-[11px] text-[#4a4030] truncate">{t.title}</span>
                    <button
                      type="button"
                      onClick={() => removeFromBlock(t.id, block.id)}
                      className="text-[10px] text-[#3a3a40] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── EICAS Message Group — optional controlled pulse ─── */
function EicasGroup({
  label,
  dotColor,
  textColor,
  pulse,
  children,
}: {
  label: string;
  dotColor: string;
  textColor: string;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  const content = (
    <>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className={`w-[5px] h-[5px] rounded-full ${dotColor}`} />
        <span className={`text-[10px] uppercase tracking-[0.15em] font-bold ${textColor}`}>
          {label}
        </span>
      </div>
      <div className="pl-3 space-y-0.5">{children}</div>
    </>
  );

  if (pulse) {
    return (
      <motion.div
        className="mb-3.5 px-1"
        layout
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: [1, 0.98, 1] }}
        exit={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
        transition={{
          opacity: { duration: 0.5, repeat: Infinity, repeatDelay: 6.5, ease: EASE },
          y: { duration: T.normal, ease: EASE },
          height: { duration: T.normal, ease: EASE },
          layout: { duration: T.normal, ease: EASE },
        }}
      >
        {content}
      </motion.div>
    );
  }

  return (
    <motion.div
      className="mb-3.5 px-1"
      layout
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, height: 0, marginBottom: 0 }}
      transition={{ duration: T.normal, ease: EASE, layout: { duration: T.normal, ease: EASE } }}
    >
      {content}
    </motion.div>
  );
}

/* ─── #6 — EICAS Message Row: slide from right on entry, green flash + fade on exit ─── */
function EicasRow({
  id,
  text,
  sub,
  textColor,
}: {
  id: string;
  text: string;
  sub: string;
  textColor: string;
}) {
  return (
    <motion.div
      layout
      /* #6 — New items: slide in from right with amber flash */
      initial={{ opacity: 0, x: 20, backgroundColor: "rgba(251,191,36,0.08)" }}
      animate={{ opacity: 1, x: 0, backgroundColor: "rgba(251,191,36,0)" }}
      /* #6 — Resolving: green highlight then fade out */
      exit={{
        opacity: 0,
        x: -10,
        height: 0,
        backgroundColor: "rgba(52,211,153,0.08)",
        transition: { duration: T.normal, ease: EASE },
      }}
      transition={{
        duration: T.normal,
        ease: EASE,
        backgroundColor: { duration: T.smooth, ease: EASE },
        layout: { duration: T.normal, ease: EASE },
      }}
      className="flex items-baseline justify-between py-0.5"
    >
      <span className={`text-[11px] truncate flex-1 leading-relaxed font-medium ${textColor}`}>
        {text}
      </span>
      <span className="text-[11px] text-[#3a3a40] shrink-0 ml-2">{sub}</span>
    </motion.div>
  );
}
