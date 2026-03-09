"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { MOCK_TASKS } from "@/lib/founderData";

const WORK_TYPE: Record<string, string> = {
  STRATEGIC: "admin",
  CASH_NOW: "admin",
  PREVENT_FIRE: "deep",
};

const DURATION_EST: Record<string, number> = {
  "Send report": 30,
  "Chase invoice": 15,
  "Approve creatives": 20,
  "Call client": 25,
  "Produce content": 90,
  "Schedule call": 15,
};

export function TodaySequence() {
  const { isDark } = useTheme();
  const [focusLock, setFocusLock] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const todayTasks = MOCK_TASKS.filter((t) => t.isToday || t.isOverdue)
    .sort((a, b) => (a.isOverdue ? -1 : 0) - (b.isOverdue ? -1 : 0));

  const totalMin = todayTasks.reduce((s, t) => s + (DURATION_EST[t.title] ?? 30), 0);
  const maxCap = 480;

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  if (focusLock) {
    const task = todayTasks[activeIndex];
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80">
        <div className={`max-w-lg w-full mx-4 p-8 rounded-xl ${baseCls}`}>
          <h2 className={`text-lg font-bold mb-2 ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
            Focus: {task?.title ?? "—"}
          </h2>
          <p className={`text-sm mb-6 ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>
            {task?.clientName} · {DURATION_EST[task?.title ?? ""] ?? 30}m
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setFocusLock(false);
                if (activeIndex < todayTasks.length - 1) setActiveIndex((i) => i + 1);
              }}
              className={`px-6 py-3 rounded-lg font-medium ${
                isDark ? "bg-emerald-600/80 text-white" : "bg-blue-600 text-white"
              }`}
            >
              Complete & Next
            </button>
            <button
              onClick={() => setFocusLock(false)}
              className={`px-6 py-3 rounded-lg font-medium ${
                isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-700"
              }`}
            >
              Exit
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className={`rounded-xl border overflow-hidden ${baseCls}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
          📋 Today&apos;s Sequence
        </h2>
        <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          {totalMin}m / {maxCap}m
        </span>
      </div>
      <div className="h-1.5 bg-gray-100">
        <div
          className="h-full bg-emerald-500 rounded-r"
          style={{ width: `${Math.min(100, (totalMin / maxCap) * 100)}%` }}
        />
      </div>
      <div className="p-4 space-y-2">
        {todayTasks.length === 0 ? (
          <p className={`text-sm py-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Nothing scheduled</p>
        ) : (
          todayTasks.map((t, i) => (
            <div
              key={t.id}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                isDark ? "bg-[#0c0c10] border border-[#1a1810]" : "bg-gray-50 border border-gray-100"
              }`}
            >
              <span className={`w-8 h-8 flex items-center justify-center rounded text-sm font-bold ${
                isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-200 text-gray-600"
              }`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                  {t.title} · {t.clientName}
                </p>
                <p className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                  {DURATION_EST[t.title] ?? 30}m {WORK_TYPE[t.priority] ?? "admin"}
                </p>
              </div>
              <Link href={`/clients/${t.clientId}`} className={`text-xs font-medium ${isDark ? "text-emerald-400" : "text-blue-600"}`}>
                →
              </Link>
            </div>
          ))
        )}
        {todayTasks.length > 0 && (
          <button
            onClick={() => setFocusLock(true)}
            className={`w-full mt-4 py-3 rounded-lg font-medium ${
              isDark ? "bg-emerald-600/80 text-white hover:bg-emerald-500/80" : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            START
          </button>
        )}
      </div>
    </section>
  );
}
