"use client";

import { useState } from "react";
import { ClientPlanTab } from "./ClientPlanTab";
import { ClientAdsTab } from "./ClientAdsTab";
import { ClientContentTab } from "./ClientContentTab";
import { ClientSocialMediaTab } from "./ClientSocialMediaTab";
import { useTheme } from "@/contexts/ThemeContext";

const SECTIONS = [
  { id: "plan", label: "Client Plan", component: ClientPlanTab },
  { id: "ads", label: "Ads", component: ClientAdsTab },
  { id: "content", label: "Content", component: ClientContentTab },
  { id: "social", label: "Social Media", component: ClientSocialMediaTab },
] as const;

type Props = {
  clientId: string;
};

export function ClientStrategyTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [expanded, setExpanded] = useState<Set<string>>(new Set(["plan"]));

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className={`flex-1 overflow-auto p-6 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      <div className="max-w-4xl mx-auto space-y-4">
        {SECTIONS.map(({ id, label, component: Component }) => (
          <div
            key={id}
            className={`rounded-xl border overflow-hidden ${
              isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"
            }`}
          >
            <button
              onClick={() => toggle(id)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left ${
                isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"
              }`}
            >
              <h2 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                {label}
              </h2>
              <svg
                className={`w-5 h-5 transition-transform ${expanded.has(id) ? "rotate-180" : ""} ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded.has(id) && (
              <div className={`border-t p-4 ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                <Component clientId={clientId} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
