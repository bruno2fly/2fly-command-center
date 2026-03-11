"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  statusFilter: string;
  typeFilter: string;
  sourceFilter: string;
  onStatusChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onSourceChange: (v: string) => void;
};

export function TaskFilters({
  statusFilter,
  typeFilter,
  sourceFilter,
  onStatusChange,
  onTypeChange,
  onSourceChange,
}: Props) {
  const { isDark } = useTheme();
  const btnCls = (active: boolean) =>
    active
      ? isDark
        ? "bg-blue-500/20 text-blue-400"
        : "bg-blue-100 text-blue-700"
      : isDark
        ? "text-gray-500 hover:text-gray-300"
        : "text-gray-600 hover:text-gray-800";

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        Status
      </span>
      {["", "pending", "in_progress", "completed"].map((s) => (
        <button
          key={s || "all"}
          type="button"
          onClick={() => onStatusChange(s)}
          className={`px-2.5 py-1 rounded-lg text-xs ${btnCls(statusFilter === s)}`}
        >
          {s || "All"}
        </button>
      ))}
      <span className={`text-[10px] font-semibold uppercase tracking-wider ml-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        Type
      </span>
      {["", "task", "content", "ads", "support"].map((t) => (
        <button
          key={t || "all"}
          type="button"
          onClick={() => onTypeChange(t)}
          className={`px-2.5 py-1 rounded-lg text-xs ${btnCls(typeFilter === t)}`}
        >
          {t || "All"}
        </button>
      ))}
      <span className={`text-[10px] font-semibold uppercase tracking-wider ml-2 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
        Source
      </span>
      {["", "agent", "manual"].map((src) => (
        <button
          key={src || "all"}
          type="button"
          onClick={() => onSourceChange(src)}
          className={`px-2.5 py-1 rounded-lg text-xs ${btnCls(sourceFilter === src)}`}
        >
          {src || "All"}
        </button>
      ))}
    </div>
  );
}
