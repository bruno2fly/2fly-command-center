"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import type { ContentCalendarItem } from "@/lib/client/mockClientTabData";

const TYPE_COLORS: Record<string, string> = {
  post: "bg-blue-500/80",
  video: "bg-purple-500/80",
  story: "bg-pink-500/80",
  ad: "bg-amber-500/80",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "border-gray-400",
  scheduled: "border-emerald-500",
  review: "border-amber-500",
  published: "border-blue-500",
};

type Props = {
  clientId?: string;
  clientName?: string;
  items: ContentCalendarItem[];
};

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function formatDayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function ContentCalendar({ clientId, clientName, items }: Props) {
  const { isDark } = useTheme();
  const [view, setView] = useState<"week" | "month">("week");
  const [cursor, setCursor] = useState(new Date());

  const weekDays = useMemo(() => getWeekDays(cursor), [cursor]);

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ContentCalendarItem[]>();
    for (const item of items) {
      const key = item.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return map;
  }, [items]);

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <div className={`rounded-xl border overflow-hidden ${baseCls}`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(cursor);
              d.setDate(d.getDate() - 7);
              setCursor(d);
            }}
            className={`p-2 rounded ${isDark ? "hover:bg-[#141210]" : "hover:bg-gray-100"}`}
          >
            ←
          </button>
          <h2 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            {view === "week"
              ? `${weekDays[0]!.toLocaleDateString("en-US", { month: "short" })} ${weekDays[0]!.getDate()} – ${weekDays[6]!.getDate()}`
              : cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
          <button
            onClick={() => {
              const d = new Date(cursor);
              d.setDate(d.getDate() + 7);
              setCursor(d);
            }}
            className={`p-2 rounded ${isDark ? "hover:bg-[#141210]" : "hover:bg-gray-100"}`}
          >
            →
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setView("week")}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              view === "week" ? (isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700") : (isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-600")
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setView("month")}
            className={`px-3 py-1.5 rounded text-xs font-medium ${
              view === "month" ? (isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700") : (isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-600")
            }`}
          >
            Month
          </button>
        </div>
      </div>

      {view === "week" ? (
        <div className="grid grid-cols-7 min-h-[200px]">
          {weekDays.map((d) => {
            const key = formatDayKey(d);
            const dayItems = itemsByDate.get(key) ?? [];
            return (
              <div
                key={key}
                className={`border-r last:border-r-0 p-2 min-h-[120px] ${
                  isDark ? "border-[#1a1810]" : "border-gray-100"
                }`}
              >
                <p className={`text-xs font-medium mb-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </p>
                <p className={`text-sm font-medium mb-2 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                  {d.getDate()}
                </p>
                <div className="space-y-1">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className={`p-1.5 rounded text-xs border-l-2 ${
                        TYPE_COLORS[item.type] ?? "bg-gray-500/80"
                      } ${STATUS_COLORS[item.status] ?? ""} ${isDark ? "text-white" : "text-white"}`}
                    >
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-[10px] opacity-90">{item.type} · {item.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`p-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          Month view (compact grid) — coming soon. Use Week view for now.
        </div>
      )}
    </div>
  );
}
