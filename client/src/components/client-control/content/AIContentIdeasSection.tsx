"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import type { ContentIdea, ContentIdeaType } from "./contentIdeaTypes";

const TABS: { id: "all" | ContentIdeaType; label: string }[] = [
  { id: "all", label: "ALL" },
  { id: "feed", label: "FEED" },
  { id: "reel", label: "REELS" },
  { id: "story", label: "STORIES" },
  { id: "carousel", label: "CAROUSEL" },
];

const TYPE_ICON: Record<ContentIdeaType, string> = {
  feed: "📸",
  reel: "🎬",
  story: "📱",
  carousel: "🎠",
};

const TYPE_BORDER: Record<ContentIdeaType, string> = {
  feed: "border-l-blue-500",
  reel: "border-l-purple-500",
  story: "border-l-pink-500",
  carousel: "border-l-teal-500",
};

const SOURCE_LABEL: Record<string, string> = {
  ai: "🤖 AI Generated",
  team: "👥 Team Idea",
  client: "👤 Client Request",
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}h ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

type Props = {
  ideas: ContentIdea[];
  onIdeasChange: (next: ContentIdea[]) => void;
  onSchedule?: (idea: ContentIdea) => void;
};

export function AIContentIdeasSection({ ideas, onIdeasChange, onSchedule }: Props) {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<"all" | ContentIdeaType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered =
    filter === "all" ? ideas : ideas.filter((i) => i.type === filter);

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-[rgba(226,232,240,1)]";
  const cardBgExpanded = isDark ? "bg-[rgba(30,41,59,0.8)]" : "bg-[rgba(248,250,252,1)]";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  const approve = (id: string) => {
    onIdeasChange(
      ideas.map((i) => (i.id === id ? { ...i, status: "approved" as const } : i))
    );
  };

  return (
    <div className={`rounded-2xl border ${cardBorder} ${cardBg} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${cardBorder}`}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          AI Content Ideas
        </h2>
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                filter === t.id
                  ? isDark
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-100 text-blue-700"
                  : mutedCls
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="p-4 space-y-2 max-h-[480px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filtered.map((idea, idx) => {
            const isExpanded = expandedId === idea.id;
            return (
              <motion.div
                key={idea.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`rounded-xl border ${cardBorder} overflow-hidden transition-all duration-200 cursor-pointer ${
                  isExpanded ? `border-l-[3px] ${TYPE_BORDER[idea.type]} ${cardBgExpanded}` : cardBg
                } hover:shadow-md hover:border-blue-500/20`}
                onClick={() => setExpandedId(isExpanded ? null : idea.id)}
              >
                {!isExpanded ? (
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${textCls}`}>
                        {TYPE_ICON[idea.type]} {idea.type === "feed" ? "Feed" : idea.type === "reel" ? "Reel" : idea.type.charAt(0).toUpperCase() + idea.type.slice(1)}{" "}
                        &quot;{idea.title}&quot;
                      </p>
                      <p className={`text-xs mt-0.5 ${mutedCls}`}>
                        {SOURCE_LABEL[idea.source] ?? idea.source} · {timeAgo(idea.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => approve(idea.id)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"} hover:opacity-90`}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 space-y-4 text-left">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`text-sm font-semibold ${textCls}`}>
                        {TYPE_ICON[idea.type]} {idea.type === "feed" ? "Feed Post" : idea.type.charAt(0).toUpperCase() + idea.type.slice(1)}
                      </span>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => approve(idea.id)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-100 text-gray-700"}`}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => onSchedule?.(idea)}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white"
                        >
                          Schedule
                        </button>
                      </div>
                    </div>
                    <p className={`text-sm font-medium ${textCls}`}>&quot;{idea.title}&quot;</p>
                    {idea.caption && (
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls} mb-1`}>📝 Caption</p>
                        <p className={`text-xs whitespace-pre-wrap ${textCls}`}>{idea.caption}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {idea.hook && (
                        <div>
                          <p className={`font-semibold uppercase tracking-wider ${mutedCls}`}>🎯 Hook</p>
                          <p className={textCls}>{idea.hook}</p>
                        </div>
                      )}
                      {idea.format && (
                        <div>
                          <p className={`font-semibold uppercase tracking-wider ${mutedCls}`}>📐 Format</p>
                          <p className={textCls}>{idea.format}</p>
                        </div>
                      )}
                      {idea.bestTime && (
                        <div>
                          <p className={`font-semibold uppercase tracking-wider ${mutedCls}`}>⏰ Best time</p>
                          <p className={textCls}>{idea.bestTime}</p>
                        </div>
                      )}
                      {idea.hashtags?.length > 0 && (
                        <div>
                          <p className={`font-semibold uppercase tracking-wider ${mutedCls}`}>🏷️ Hashtags</p>
                          <p className={textCls}>{idea.hashtags.join(" ")}</p>
                        </div>
                      )}
                    </div>
                    {idea.whyItWorks && (
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls} mb-1`}>💡 Why this works</p>
                        <p className={`text-xs ${textCls}`}>{idea.whyItWorks}</p>
                      </div>
                    )}
                    {idea.references?.length > 0 && (
                      <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls} mb-1`}>📌 Reference</p>
                        <div className="flex flex-wrap gap-2">
                          {idea.references.map((ref, i) => (
                            <a
                              key={i}
                              href={ref.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-blue-500 hover:underline"
                            >
                              {ref.title} →
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {filtered.length === 0 && (
          <p className={`py-8 text-center text-sm ${mutedCls}`}>No ideas in this filter. Add ideas or switch tab.</p>
        )}
      </div>
    </div>
  );
}
