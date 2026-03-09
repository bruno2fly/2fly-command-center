"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useActions } from "@/contexts/ActionsContext";
import type { PriorityItem, PriorityTag } from "@/lib/founder/mockFounderData";

const TAG_STYLES: Record<PriorityTag, { bg: string; label: string }> = {
  CASH_NOW: { bg: "bg-amber-500", label: "Cash" },
  PREVENT_FIRE: { bg: "bg-red-500", label: "Fire" },
  STRATEGIC: { bg: "bg-blue-500", label: "Strategic" },
};

type Props = {
  item: PriorityItem | null;
};

export function NowCard({ item }: Props) {
  const { markCompleteById, snooze } = useActions();

  const handleDo = useCallback(() => {
    if (!item) return;
    markCompleteById(item.id);
    toast.success("Done! Moving to next.");
  }, [item, markCompleteById]);

  const handleSnooze = useCallback(() => {
    if (!item) return;
    snooze(item.id, "1h");
    toast("Snoozed for 1 hour");
  }, [item, snooze]);

  if (!item) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 p-8 text-center">
        <p className="text-xl font-semibold text-emerald-800">All clear.</p>
        <p className="text-sm text-emerald-600 mt-1">Nothing urgent right now.</p>
      </div>
    );
  }

  const tag = item.tags[0] ?? "STRATEGIC";
  const style = TAG_STYLES[tag];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={item.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden"
      >
        {/* Tag bar */}
        <div className={`${style.bg} h-1`} />

        <div className="p-6">
          {/* Label */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Now</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full text-white ${style.bg}`}>
              {style.label}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 leading-tight">
            {item.title}
            <span className="text-gray-400 font-normal"> — {item.clientName}</span>
          </h2>

          {/* Reason */}
          {item.summary && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-1">{item.summary}</p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 mt-5">
            <button
              type="button"
              onClick={handleDo}
              className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Do it
            </button>
            <button
              type="button"
              onClick={handleSnooze}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Snooze
            </button>
            <button
              type="button"
              onClick={() => toast("Delegate — coming soon")}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Delegate
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
