"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  summary: string;
};

export function WeeklySummary({ summary }: Props) {
  const { isDark } = useTheme();
  const textCls = isDark ? "text-gray-300" : "text-gray-700";

  return (
    <div className="rounded-lg p-3 bg-gray-500/5 border border-gray-500/10">
      <p className={`text-sm leading-relaxed ${textCls}`}>
        <span className="font-medium text-gray-500 dark:text-gray-400">📈 Trend: </span>
        {summary}
      </p>
    </div>
  );
}
