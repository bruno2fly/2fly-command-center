"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export type ContentIdeaSource = "ai" | "client" | "team" | "pinterest";

export type ContentIdeaItem = {
  id: string;
  clientId: string;
  title: string;
  description?: string;
  source: ContentIdeaSource;
  type?: string;
  createdAt: string;
};

const SOURCE_LABELS: Record<ContentIdeaSource, string> = {
  ai: "AI Generated",
  client: "Client Request",
  team: "Team Idea",
  pinterest: "Pinterest",
};

const SOURCE_CLS: Record<ContentIdeaSource, string> = {
  ai: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  client: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  team: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  pinterest: "bg-red-500/15 text-red-400 border-red-500/20",
};

const TYPE_FILTERS = ["all", "feed", "reels", "stories"] as const;

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

type Props = {
  clientId: string;
  ideas: ContentIdeaItem[];
  onIdeasChange: (next: ContentIdeaItem[]) => void;
};

export function ContentIdeasBank({ clientId, ideas, onIdeasChange }: Props) {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<(typeof TYPE_FILTERS)[number]>("all");

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  const filtered =
    filter === "all"
      ? ideas
      : ideas.filter((i) => (i.type ?? "feed").toLowerCase() === filter);

  const addIdea = () => {
    const newIdea: ContentIdeaItem = {
      id: `idea-${Date.now()}`,
      clientId,
      title: "New idea",
      source: "team",
      createdAt: new Date().toISOString(),
    };
    onIdeasChange([...ideas, newIdea]);
  };

  const removeIdea = (id: string) => {
    onIdeasChange(ideas.filter((i) => i.id !== id));
  };

  return (
    <div className={`rounded-2xl border ${cardBorder} ${cardBg} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${cardBorder}`}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Content Ideas Bank
        </h2>
        <div className="flex gap-1 mt-2">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-2 py-1 rounded text-[10px] font-medium capitalize ${
                filter === f
                  ? isDark
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-blue-100 text-blue-700"
                  : mutedCls
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="p-3 max-h-[320px] overflow-y-auto space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.map((idea) => (
            <motion.div
              key={idea.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`rounded-xl border ${cardBorder} p-3 ${isDark ? "bg-[rgba(15,23,42,0.6)]" : "bg-gray-50/80"}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-sm shrink-0">
                  {idea.type === "reels" ? "🎬" : idea.type === "stories" ? "📱" : "📸"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${textCls}`}>{idea.title}</p>
                  <span
                    className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] border ${SOURCE_CLS[idea.source]}`}
                  >
                    {SOURCE_LABELS[idea.source]}
                  </span>
                  {idea.description && (
                    <p className={`text-xs mt-1 line-clamp-2 ${mutedCls}`}>{idea.description}</p>
                  )}
                  <p className={`text-[10px] mt-1 ${mutedCls}`}>{timeAgo(idea.createdAt)}</p>
                </div>
              </div>
              <div className="flex gap-1 mt-2">
                <button
                  type="button"
                  className="text-[10px] font-medium text-blue-500 hover:underline"
                >
                  + Create
                </button>
                <button
                  type="button"
                  className="text-[10px] font-medium text-gray-500 hover:underline"
                >
                  🔗 Reference
                </button>
                <button
                  type="button"
                  onClick={() => removeIdea(idea.id)}
                  className="text-[10px] text-red-500 hover:underline ml-auto"
                >
                  Remove
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <button
          type="button"
          onClick={addIdea}
          className={`w-full rounded-xl border border-dashed ${cardBorder} py-2.5 text-xs font-medium ${mutedCls} hover:border-blue-500/50 hover:text-blue-500 transition-colors`}
        >
          + Add Idea
        </button>
      </div>
    </div>
  );
}
