"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { IdeaItem } from "@/lib/client/mockClientControlData";

type Props = {
  ideas: IdeaItem[];
};

export function IdeasPanel({ ideas }: Props) {
  const { isDark } = useTheme();

  const panelCls = isDark ? "bg-[#0a0a0e]/40 border-[#1a1810]" : "bg-gray-50 border-gray-200";
  const cardCls = isDark
    ? "bg-[#08080c] border-[#1a1810] hover:border-[#2a2018]"
    : "bg-white border-gray-100 hover:border-gray-200";
  const textCls = isDark ? "text-[#8a7e6d]" : "text-gray-600";
  const tagCls = isDark ? "bg-[#1a1810] text-[#5a5040]" : "bg-gray-100 text-gray-500";

  return (
    <section className={`rounded-xl border overflow-hidden ${panelCls}`}>
      <div
        className={`px-3 py-2.5 border-b ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-[#5a5040]" : "text-gray-500"
          }`}
        >
          Ideas & Opportunities
        </h2>
      </div>
      <div className="p-3 space-y-2">
        {ideas.length > 0 ? (
          ideas.slice(0, 4).map((idea) => (
            <div
              key={idea.id}
              className={`p-2.5 rounded-lg border transition-colors ${cardCls}`}
            >
              <p className={`text-xs line-clamp-2 ${textCls}`}>{idea.text}</p>
              <span className={`inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] capitalize ${tagCls}`}>
                {idea.tag}
              </span>
            </div>
          ))
        ) : (
          <p className={`text-xs py-4 ${textCls}`}>No ideas yet</p>
        )}
      </div>
    </section>
  );
}
