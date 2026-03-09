"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useDailyPlanner } from "@/contexts/DailyPlannerContext";
import { EASE, T } from "@/lib/planner/animations";

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: "WA",
  discord: "DC",
  email: "EM",
  manual: "MN",
};

export function InboxTray({ isDark = true }: { isDark?: boolean }) {
  const { tasksByBucket, promoteToInbox } = useDailyPlanner();
  const [open, setOpen] = useState(false);
  const inboxItems = tasksByBucket("inbox");

  /* #8 — Track count changes for pulse animation */
  const prevCountRef = useRef(inboxItems.length);
  const [countPulse, setCountPulse] = useState(false);
  const [scanActive, setScanActive] = useState(false);

  useEffect(() => {
    if (inboxItems.length > prevCountRef.current) {
      setCountPulse(true);
      setScanActive(true);
      const t1 = setTimeout(() => setCountPulse(false), 200);
      const t2 = setTimeout(() => setScanActive(false), 400);
      prevCountRef.current = inboxItems.length;
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    prevCountRef.current = inboxItems.length;
  }, [inboxItems.length]);

  return (
    <div className={`border-t relative overflow-hidden ${isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-200 bg-gray-100"}`}>
      {/* #8 — Scan line sweep on new message */}
      {scanActive && (
        <motion.div
          className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent pointer-events-none z-10"
          initial={{ x: 0 }}
          animate={{ x: "100vw" }}
          transition={{ duration: T.scan, ease: EASE }}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-5 sm:px-7 py-2.5 transition-colors duration-150 ${isDark ? "hover:bg-[#0e0d0a]" : "hover:bg-gray-200"}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/40">
            Datalink
          </span>
          <span className={`text-[9px] uppercase tracking-[0.15em] font-medium ${isDark ? "text-[#3a3a40]" : "text-gray-500"}`}>
            Incoming
          </span>
          {inboxItems.length > 0 && (
            /* #8 — Count pulse: scale 1→1.2→1 on increment */
            <motion.span
              key={inboxItems.length}
              className="text-[11px] tabular-nums text-cyan-400/50 font-semibold"
              initial={countPulse ? { scale: 1.2 } : { scale: 1 }}
              animate={{ scale: 1 }}
              transition={{ duration: T.normal, ease: EASE }}
            >
              {inboxItems.length}
            </motion.span>
          )}
        </div>
        <motion.svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={isDark ? "text-[#3a3a40]" : "text-gray-500"}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: T.fast, ease: EASE }}
        >
          <polyline points="4,10 8,6 12,10" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: T.fast, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-7 pb-3">
              {inboxItems.length === 0 ? (
                <p className="text-[11px] text-emerald-400/30 py-3 uppercase tracking-wider font-medium">
                  Empty
                </p>
              ) : (
                <AnimatePresence mode="popLayout">
                  {inboxItems.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20, height: 0 }}
                      transition={{ duration: T.normal, ease: EASE }}
                      className={`flex items-center gap-3 py-2 group px-1 -mx-1 transition-colors duration-150 ${isDark ? "hover:bg-[#0e0d0a]" : "hover:bg-gray-200"}`}
                    >
                      <span className="text-[10px] uppercase tracking-wider text-amber-400/40 font-semibold w-5 shrink-0">
                        {SOURCE_LABEL[task.source] ?? "—"}
                      </span>
                      <p className={`text-[12px] truncate flex-1 min-w-0 leading-relaxed ${isDark ? "text-[#a09888]" : "text-gray-600"}`}>
                        {task.title}
                      </p>
                      <span className={`text-[11px] shrink-0 ${isDark ? "text-[#3a3a40]" : "text-gray-500"}`}>{task.client}</span>
                      <button
                        type="button"
                        onClick={() => {
                          promoteToInbox(task.id);
                          toast.success(`Converted: ${task.title}`);
                        }}
                        className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-emerald-400/30 hover:text-emerald-400 hover:scale-[1.03] active:scale-95 opacity-0 group-hover:opacity-100 transition-all duration-150"
                      >
                        Convert
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
