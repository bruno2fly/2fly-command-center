"use client";

import { useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { useActions } from "@/contexts/ActionsContext";
const TAG_COLORS: Record<string, string> = {
  CASH_NOW: "bg-amber-100 text-amber-800",
  PREVENT_FIRE: "bg-red-100 text-red-800",
  STRATEGIC: "bg-blue-100 text-blue-800",
};

export function FocusModeView() {
  const { focusItems, momentum, markCompleteById, snooze } = useActions();

  const currentItem = focusItems[0] ?? null;
  const nextItem = focusItems[1] ?? null;
  const totalRemaining = focusItems.length;
  const completedToday = momentum.completedToday;

  const handleComplete = useCallback(() => {
    if (currentItem) {
      markCompleteById(currentItem.id);
      toast.success("✓ Done!");
    }
  }, [currentItem, markCompleteById]);

  const handleSnooze = useCallback(() => {
    if (currentItem) {
      snooze(currentItem.id, "tomorrow");
      toast.success("⏰ Snoozed until tomorrow");
    }
  }, [currentItem, snooze]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentItem) return;
      switch (e.key.toLowerCase()) {
        case "d":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleComplete();
          }
          break;
        case "s":
          if (!e.metaKey && !e.ctrlKey) {
            e.preventDefault();
            handleSnooze();
          }
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentItem, handleComplete, handleSnooze]);

  if (!currentItem) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <p className="text-2xl font-semibold text-gray-900">All caught up!</p>
          <p className="text-gray-500 mt-2">
            {completedToday} done today · No more priorities in queue
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <div className="text-center text-sm text-gray-500 mb-6">
          {completedToday} done today · {totalRemaining} remaining
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  TAG_COLORS[currentItem.tags[0] ?? "STRATEGIC"] ?? "bg-gray-100 text-gray-700"
                }`}
              >
                {currentItem.tags[0]?.replace("_", " ") ?? "Strategic"}
              </span>
              <span className="text-gray-500 text-sm">{currentItem.clientName}</span>
            </div>

            <h2 className="text-2xl font-semibold text-gray-900 mb-2">{currentItem.title}</h2>
            <p className="text-gray-600 mb-6">{currentItem.summary}</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleComplete}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
              >
                Done <kbd className="ml-2 text-xs opacity-70">D</kbd>
              </button>
              <button
                type="button"
                onClick={handleSnooze}
                className="px-4 py-3 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-gray-50"
              >
                Snooze <kbd className="ml-2 text-xs opacity-70">S</kbd>
              </button>
              <Link
                href={`/clients/${currentItem.clientId}`}
                className="px-4 py-3 rounded-lg border border-gray-200 font-medium text-gray-700 hover:bg-gray-50"
              >
                Open client
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>

        {nextItem && (
          <div className="mt-4 text-center text-gray-400 text-sm">
            Next: {nextItem.title} · {nextItem.clientName}
          </div>
        )}

        <div className="mt-8 text-center text-xs text-gray-400">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">D</kbd> Done ·{" "}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded">S</kbd> Snooze
        </div>
      </div>
    </div>
  );
}
