"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import type { AdsAlertEnhanced } from "@/lib/client/mockAdsData";

type Props = {
  alerts: AdsAlertEnhanced[];
  onDismiss?: (id: string) => void;
  onAction?: (id: string, label: string) => void;
};

const SEVERITY_ICONS: Record<string, string> = {
  urgent: "🔥",
  insight: "💡",
  warning: "⚠️",
  positive: "✅",
};

const SEVERITY_BORDER: Record<string, string> = {
  urgent: "border-l-red-500",
  insight: "border-l-amber-500",
  warning: "border-l-amber-400",
  positive: "border-l-emerald-500",
};

export function AlertsInsights({ alerts, onDismiss, onAction }: Props) {
  const { isDark } = useTheme();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const visible = alerts.filter((a) => !dismissed.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissed((s) => new Set(s).add(id));
    onDismiss?.(id);
  };

  const cardCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-800";

  return (
    <section className={`rounded-xl border overflow-hidden ${cardCls}`}>
      <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
          Alerts & Insights
        </h2>
      </div>
      <div className={`divide-y ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
        {visible.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No alerts</p>
          </div>
        ) : (
          visible.map((a) => (
            <div
              key={a.id}
              className={`flex items-start gap-3 px-4 py-3 border-l-4 ${SEVERITY_BORDER[a.severity]} ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50/50"}`}
            >
              <span className="text-lg shrink-0">{SEVERITY_ICONS[a.severity] ?? "•"}</span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${textCls}`}>{a.message}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {a.aiGenerated && (
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>
                      AI Generated
                    </span>
                  )}
                  {a.actionLabel && (
                    <button
                      onClick={() => onAction?.(a.id, a.actionLabel!)}
                      className={`px-2 py-1 rounded text-xs font-medium ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                    >
                      {a.actionLabel}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss(a.id)}
                className={`shrink-0 p-1 rounded hover:bg-black/10 ${isDark ? "text-[#5a5040] hover:text-[#8a7e6d]" : "text-gray-400 hover:text-gray-600"}`}
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
