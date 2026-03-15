"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type ContentIdeaFilter = "all" | "feed" | "reels" | "stories" | "carousel";

const TABS: { id: ContentIdeaFilter; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "feed", label: "FEED" },
  { id: "reels", label: "REELS" },
  { id: "stories", label: "STORIES" },
  { id: "carousel", label: "CAROUSEL" },
];

type Props = {
  active: ContentIdeaFilter;
  onSelect: (tab: ContentIdeaFilter) => void;
};

export function ContentIdeaFilters({ active, onSelect }: Props) {
  const { isDark } = useTheme();
  const inactiveCls = isDark ? "text-gray-500 hover:text-gray-400" : "text-gray-500 hover:text-gray-700";
  const activeCls = "font-bold underline underline-offset-4 " + (isDark ? "text-white" : "text-gray-900");

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
            active === tab.id ? activeCls : inactiveCls
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
