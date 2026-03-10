"use client";

import { useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

export type ContentItemForCalendar = {
  id: string;
  title: string;
  type?: string;
  status: string;
  scheduledDate?: string | null;
};

const TYPE_CHIP_CLS: Record<string, string> = {
  post: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  reel: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  story: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  carousel: "bg-teal-500/15 text-teal-400 border-teal-500/20",
  blog: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  video: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  ad_creative: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

const STATUS_ICON: Record<string, string> = {
  draft: "✏️",
  in_review: "👁️",
  review: "👁️",
  approved: "✅",
  scheduled: "📅",
  published: "🟢",
  archived: "📦",
};

function getWeekDays(cursor: Date): Date[] {
  const start = new Date(cursor);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function isToday(d: Date) {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}

type Props = {
  content: ContentItemForCalendar[];
  weekStart: Date;
  onWeekChange: (delta: number) => void;
  onItemClick?: (item: ContentItemForCalendar) => void;
};

export function ContentCalendarCommand({
  content,
  weekStart,
  onWeekChange,
  onItemClick,
}: Props) {
  const { isDark } = useTheme();
  const [view, setView] = useState<"week" | "month">("week");

  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentItemForCalendar[]>();
    for (const item of content) {
      const dateStr = item.scheduledDate ? item.scheduledDate.slice(0, 10) : null;
      if (!dateStr) continue;
      if (!map.has(dateStr)) map.set(dateStr, []);
      map.get(dateStr)!.push(item);
    }
    return map;
  }, [content]);

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <div className={`rounded-2xl border ${cardBorder} ${cardBg} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${cardBorder} flex items-center justify-between flex-wrap gap-2`}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onWeekChange(-1)}
            className={`p-2 rounded-lg ${isDark ? "hover:bg-[#1e293b]" : "hover:bg-gray-100"}`}
          >
            ←
          </button>
          <h2 className={`text-sm font-semibold ${textCls}`}>
            {weekDays[0]?.toLocaleDateString("en-US", { month: "short" })} {weekDays[0]?.getDate()} – {weekDays[6]?.getDate()}
          </h2>
          <button
            type="button"
            onClick={() => onWeekChange(1)}
            className={`p-2 rounded-lg ${isDark ? "hover:bg-[#1e293b]" : "hover:bg-gray-100"}`}
          >
            →
          </button>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              view === "week" ? (isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700") : mutedCls
            }`}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
              view === "month" ? (isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700") : mutedCls
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {view === "week" ? (
        <div className="grid grid-cols-7 min-h-[220px]">
          {weekDays.map((d) => {
            const key = formatDayKey(d);
            const dayItems = itemsByDate.get(key) ?? [];
            const today = isToday(d);
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className={`border-r last:border-r-0 p-2 min-h-[200px] flex flex-col ${
                  today ? "border-l-2 border-l-blue-500 bg-blue-500/5" : ""
                } ${cardBorder}`}
              >
                <p className={`text-xs font-medium mb-1 ${mutedCls}`}>
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-sm font-semibold mb-2 ${textCls}`}>{d.getDate()}</p>
                <div className="space-y-1.5 flex-1">
                  {dayItems.map((item, idx) => {
                    const type = (item.type ?? "post").toLowerCase();
                    const chipCls = TYPE_CHIP_CLS[type] ?? TYPE_CHIP_CLS.post;
                    const icon = STATUS_ICON[item.status] ?? "✏️";
                    return (
                      <motion.button
                        key={item.id}
                        type="button"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => onItemClick?.(item)}
                        className={`w-full text-left p-2 rounded-lg border text-xs truncate ${chipCls} cursor-grab hover:shadow-md transition-all`}
                      >
                        <span className="mr-1">{icon}</span>
                        {item.title}
                      </motion.button>
                    );
                  })}
                </div>
                {dayItems.length === 0 && (
                  <button
                    type="button"
                    className={`mt-auto rounded-lg border border-dashed ${cardBorder} py-2 text-[10px] ${mutedCls} hover:border-blue-500/50`}
                  >
                    +
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="p-4">
          <p className={mutedCls}>Month grid: use Week view for now, or implement month grid.</p>
        </div>
      )}
    </div>
  );
}
