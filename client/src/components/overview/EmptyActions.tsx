"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  clientName: string;
};

export function EmptyActions({ clientName }: Props) {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-emerald-500/10 border-emerald-500/20" : "bg-emerald-50 border-emerald-200";

  return (
    <div className={`rounded-2xl border ${bg} p-8 text-center`}>
      <p className="text-4xl mb-2" aria-hidden>
        🎉
      </p>
      <p className={`text-sm font-medium ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>
        All caught up!
      </p>
      <p className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
        No actions remaining for {clientName}
      </p>
    </div>
  );
}
