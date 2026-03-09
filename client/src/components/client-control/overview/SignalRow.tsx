"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type SignalSeverity = "urgent" | "approval" | "info" | "success";

type Props = {
  id: string;
  message: string;
  timestamp: string;
  severity?: SignalSeverity;
};

export function SignalRow({ message, timestamp, severity = "info" }: Props) {
  const { isDark } = useTheme();

  const dotCls =
    severity === "urgent"
      ? "bg-red-500"
      : severity === "approval"
        ? "bg-amber-500"
        : severity === "success"
          ? "bg-emerald-500"
          : "bg-blue-500";

  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-700";
  const metaCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <div className={`flex items-start gap-2 px-4 py-2 ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50/50"}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${dotCls}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm truncate ${textCls}`}>{message}</p>
        <p className={`text-[10px] mt-0.5 ${metaCls}`}>{timestamp}</p>
      </div>
    </div>
  );
}
