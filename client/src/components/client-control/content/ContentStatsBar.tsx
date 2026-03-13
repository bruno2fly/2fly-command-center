"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { ApiContentItem } from "@/lib/api";

function computeStreak(content: ApiContentItem[]): number {
  const published = content.filter(
    (c) => c.status === "published" && (c as { publishedDate?: string }).publishedDate
  );
  if (published.length === 0) return 0;
  const dates = new Set(
    published.map((c) => ((c as { publishedDate?: string }).publishedDate ?? "").slice(0, 10))
  );
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  const d = new Date();
  for (let i = 0; i < 31; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) count++;
    else if (key <= today) break;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

type Props = {
  content: ApiContentItem[];
};

export function ContentStatsBar({ content }: Props) {
  const { isDark } = useTheme();
  const total = content.length;
  const drafts = content.filter((c) => (c.status || "").toLowerCase() === "draft").length;
  const scheduled = content.filter((c) => (c.status || "").toLowerCase() === "scheduled").length;
  const published = content.filter((c) => (c.status || "").toLowerCase() === "published").length;
  const streak = computeStreak(content);

  const sepCls = isDark ? "text-gray-600" : "text-gray-400";
  const valueCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 border-b ${isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200"}`}>
      <span className={`text-sm font-medium ${valueCls}`}>
        <span className={isDark ? "text-gray-500" : "text-gray-500"}>📊 Total:</span> {total}
      </span>
      <span className={sepCls}>|</span>
      <span className={`text-sm ${valueCls}`}>
        <span className={isDark ? "text-gray-500" : "text-gray-500"}>📝 Drafts:</span> {drafts}
      </span>
      <span className={sepCls}>|</span>
      <span className={`text-sm ${valueCls}`}>
        <span className={isDark ? "text-gray-500" : "text-gray-500"}>📅 Scheduled:</span> {scheduled}
      </span>
      <span className={sepCls}>|</span>
      <span className={`text-sm ${valueCls}`}>
        <span className={isDark ? "text-gray-500" : "text-gray-500"}>✅ Published:</span> {published}
      </span>
      <span className={sepCls}>|</span>
      <span className={`text-sm ${valueCls}`}>
        <span className={isDark ? "text-gray-500" : "text-gray-500"}>🔥 Streak:</span> {streak} day{streak !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
