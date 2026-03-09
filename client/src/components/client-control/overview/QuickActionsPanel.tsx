"use client";

import { useTheme } from "@/contexts/ThemeContext";

const ACTIONS = [
  { id: "q1", label: "WhatsApp templates", icon: "💬" },
  { id: "q2", label: "Drive folder", icon: "📁" },
  { id: "q3", label: "Ad platform login", icon: "🔗" },
];

type Props = {
  onAction?: (id: string) => void;
};

export function QuickActionsPanel({ onAction }: Props) {
  const { isDark } = useTheme();

  const panelCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const btnCls = isDark
    ? "hover:bg-[#0c0c10] text-[#8a7e6d]"
    : "hover:bg-gray-50 text-gray-600";

  return (
    <section className={`rounded-xl border overflow-hidden ${panelCls}`}>
      <div
        className={`px-3 py-2.5 border-b ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-[#8a7e6d]" : "text-gray-600"
          }`}
        >
          Quick Actions
        </h2>
      </div>
      <div className="p-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAction?.(a.id)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm font-medium transition-colors ${btnCls}`}
          >
            <span>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>
    </section>
  );
}
