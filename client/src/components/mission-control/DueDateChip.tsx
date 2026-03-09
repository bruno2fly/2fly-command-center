"use client";

import { useTheme } from "@/contexts/ThemeContext";

function getVariant(daysUntil: number): "overdue" | "today" | "soon" | "ok" {
  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "today";
  if (daysUntil <= 2) return "soon";
  return "ok";
}

type Props = {
  dueAt: string | null;
  compact?: boolean;
};

export function DueDateChip({ dueAt, compact }: Props) {
  const { isDark } = useTheme();

  if (!dueAt) {
    return (
      <span
        className={`text-xs font-medium px-2 py-0.5 rounded ${
          isDark ? "text-[#5a5040] bg-[#141210]" : "text-gray-500 bg-gray-100"
        }`}
      >
        —
      </span>
    );
  }

  const date = new Date(dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffMs = date.getTime() - today.getTime();
  const daysUntil = Math.ceil(diffMs / 86400000);

  const variant = getVariant(daysUntil);

  const label =
    daysUntil === 0
      ? "Today"
      : daysUntil === 1
        ? "Tomorrow"
        : daysUntil < 0
          ? `${Math.abs(daysUntil)}d overdue`
          : `${daysUntil}d`;

  const variantStyles = {
    overdue: isDark
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : "bg-red-100 text-red-700 border-red-200",
    today: isDark
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
      : "bg-amber-100 text-amber-700 border-amber-200",
    soon: isDark
      ? "bg-amber-500/10 text-amber-400/90 border-amber-500/20"
      : "bg-amber-50 text-amber-600 border-amber-100",
    ok: isDark
      ? "bg-[#141210] text-[#8a7e6d] border-[#1a1810]"
      : "bg-gray-100 text-gray-600 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${variantStyles[variant]}`}
      title={new Date(dueAt).toLocaleDateString()}
    >
      {compact ? label : `Due ${label}`}
    </span>
  );
}
