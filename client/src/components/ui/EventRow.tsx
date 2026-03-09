"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

export type EventSignal = "operational" | "routine";

type Props = {
  icon: string;
  typeLabel: string;
  clientName: string;
  message: string;
  timestamp: string;
  clientId: string;
  signal?: EventSignal;
};

export function EventRow({
  icon,
  typeLabel,
  clientName,
  message,
  timestamp,
  clientId,
  signal = "routine",
}: Props) {
  const { isDark } = useTheme();

  const isOperational = signal === "operational";

  const rowCls = isDark
    ? "hover:bg-[#0c0c10]"
    : "hover:bg-gray-50/50";

  const clientCls = isOperational
    ? isDark
      ? "font-semibold text-emerald-400"
      : "font-semibold text-blue-600"
    : isDark
      ? "font-medium text-[#c4b8a8]"
      : "font-medium text-gray-900";

  const messageCls = isDark ? "text-[#8a7e6d]" : "text-gray-600";
  const metaCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const linkCls = isDark
    ? "text-emerald-400 hover:text-emerald-300"
    : "text-blue-600 hover:text-blue-700";

  return (
    <div
      className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${rowCls} ${
        isOperational ? (isDark ? "bg-red-500/5" : "bg-amber-50/50") : ""
      }`}
    >
      <span
        className={`text-sm shrink-0 ${isOperational ? "opacity-100" : "opacity-80"}`}
        aria-hidden
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider ${metaCls}`}>
            {timestamp}
          </span>
          <span className={`text-[10px] ${metaCls}`}>·</span>
          <span className={`text-[10px] font-medium ${metaCls}`}>{typeLabel}</span>
          <span className={`text-[10px] ${metaCls}`}>·</span>
          <span className={`text-xs ${clientCls}`}>{clientName}</span>
        </div>
        <p className={`text-sm mt-0.5 truncate ${messageCls}`}>{message}</p>
      </div>
      <Link
        href={`/clients/${clientId}`}
        className={`shrink-0 text-xs font-medium ${linkCls}`}
        aria-label={`Go to ${clientName}`}
      >
        →
      </Link>
    </div>
  );
}
