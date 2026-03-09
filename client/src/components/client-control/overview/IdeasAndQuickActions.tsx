"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { CommandSection } from "@/components/ui/CommandSection";
import type { IdeaItem } from "@/lib/client/mockClientControlData";

const QUICK_ACTIONS = [
  { id: "q1", label: "WhatsApp templates", icon: "💬", color: "text-emerald-500" },
  { id: "q2", label: "Specific Google Drive Folder", icon: "📁", color: "text-amber-500" },
  { id: "q3", label: "Ad Platform Login", icon: "🔗", color: "text-blue-500" },
];

type Props = {
  ideas: IdeaItem[];
};

export function IdeasAndQuickActions({ ideas }: Props) {
  const { isDark } = useTheme();

  const ideaCardCls = isDark
    ? "p-2.5 rounded-lg bg-[#0c0c10] border border-[#1a1810] hover:border-[#2a2018]"
    : "p-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:border-gray-200";
  const ideaTextCls = isDark ? "text-xs text-[#8a7e6d] line-clamp-2" : "text-xs text-gray-600 line-clamp-2";
  const ideaTagCls = isDark
    ? "inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] bg-[#1a1810] text-[#5a5040] capitalize"
    : "inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] bg-gray-200 text-gray-500 capitalize";
  const quickActionCls = isDark
    ? "w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#0c0c10] text-left text-sm text-[#8a7e6d] transition-colors"
    : "w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 text-left text-sm text-gray-600 transition-colors";

  return (
    <CommandSection title="Ideas & Quick Actions" accent="neutral">
      <div className="p-4 space-y-4">
        <div>
          <p className={`text-[10px] uppercase tracking-wider mb-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
            Brainstorm & opportunities
          </p>
          <ul className="space-y-2">
            {ideas.length > 0 ? (
              ideas.slice(0, 4).map((idea) => (
                <li key={idea.id} className={ideaCardCls}>
                  <p className={ideaTextCls}>{idea.text}</p>
                  <span className={ideaTagCls}>{idea.tag}</span>
                </li>
              ))
            ) : (
              <li className={`text-xs py-3 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No ideas yet</li>
            )}
          </ul>
        </div>
        <div>
          <p className={`text-[10px] uppercase tracking-wider mb-2 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
            Quick Actions
          </p>
          <ul className="space-y-0.5">
            {QUICK_ACTIONS.map((q) => (
              <li key={q.id}>
                <button type="button" className={quickActionCls}>
                  <span className={q.color}>{q.icon}</span>
                  {q.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CommandSection>
  );
}
