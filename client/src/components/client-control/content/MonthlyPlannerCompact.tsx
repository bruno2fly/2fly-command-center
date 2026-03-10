"use client";

import { useState, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

export type ScheduledItem = {
  id: string;
  title?: string;
  type?: string;
  scheduledDate: string;
};

const TYPE_EMOJI: Record<string, string> = {
  feed: "📸",
  post: "📸",
  reel: "🎬",
  reels: "🎬",
  story: "📱",
  stories: "📱",
  carousel: "🎠",
};

function getEmoji(type?: string): string {
  if (!type) return "📄";
  const t = (type || "").toLowerCase();
  return TYPE_EMOJI[t] ?? "📄";
}

type Props = {
  items: ScheduledItem[];
  onDayClick?: (date: Date, dayItems: ScheduledItem[]) => void;
};

export function MonthlyPlannerCompact({ items, onDayClick }: Props) {
  const { isDark } = useTheme();
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const days = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstDay = first.getDay(); // 0=Sun, 1=Mon, ...
    const daysBefore = (firstDay - 1 + 7) % 7; // Monday = first column
    const start = new Date(year, month, 1 - daysBefore);
    const result: { date: Date; isCurrentMonth: boolean; dayItems: ScheduledItem[] }[] = [];
    const d = new Date(start);
    for (let i = 0; i < 42; i++) {
      const dateKey = d.toISOString().slice(0, 10);
      const dayItems = items.filter((i) => i.scheduledDate?.slice(0, 10) === dateKey);
      result.push({
        date: new Date(d),
        isCurrentMonth: d.getMonth() === month,
        dayItems,
      });
      d.setDate(d.getDate() + 1);
    }
    return result;
  }, [year, month, items]);

  const monthLabel = viewDate.toLocaleString("default", { month: "long", year: "numeric" });
  const todayKey = new Date().toISOString().slice(0, 10);

  const cellBg = isDark ? "bg-[rgba(30,41,59,0.3)]" : "bg-gray-50/80";
  const cellBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-400";

  return (
    <div className={`rounded-2xl border ${cellBorder} ${cellBg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          📅 {monthLabel}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400"
          >
            →
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((wd) => (
          <div key={wd} className={`text-[10px] font-medium py-1 ${mutedCls}`}>
            {wd}
          </div>
        ))}
        {days.map((cell, i) => {
          const dateKey = cell.date.toISOString().slice(0, 10);
          const isToday = dateKey === todayKey;
          return (
            <motion.button
              key={i}
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: (i % 7) * 0.02 }}
              onClick={() => onDayClick?.(cell.date, cell.dayItems)}
              className={`min-h-[36px] rounded-lg p-1 flex flex-col items-center justify-start gap-0.5 ${
                !cell.isCurrentMonth ? mutedCls + " opacity-60" : ""
              } ${isToday ? "ring-1 ring-blue-500/50 bg-blue-500/10" : ""} hover:bg-black/5 dark:hover:bg-white/5`}
            >
              <span className="text-xs font-medium">{cell.date.getDate()}</span>
              <div className="flex flex-wrap gap-0.5 justify-center">
                {cell.dayItems.slice(0, 3).map((item) => (
                  <span key={item.id} className="text-[10px]" title={item.title}>
                    {getEmoji(item.type)}
                  </span>
                ))}
                {cell.dayItems.length > 3 && (
                  <span className="text-[10px] text-gray-500">+{cell.dayItems.length - 3}</span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
