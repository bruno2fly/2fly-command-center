"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export type ReelIdeaCard = {
  id: string;
  title: string;
  description: string;
  tag: "Trending" | "High Engagement" | "Authentic" | "Educational";
  refLink?: { title: string; url: string };
};

type Props = {
  items: ReelIdeaCard[];
  onAddNew?: () => void;
  onItemClick?: (item: ReelIdeaCard) => void;
};

export function ReelIdeasRow({ items, onAddNew, onItemClick }: Props) {
  const { isDark } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const cardBg = isDark
    ? "from-purple-900/40 to-blue-900/40 border-slate-600/50"
    : "from-purple-100 to-blue-100 border-purple-200";

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        🎬 Reel Ideas
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: "thin" }}>
        {items.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="snap-start shrink-0 w-[180px] flex flex-col"
          >
            <button
              type="button"
              onClick={() => {
                onItemClick?.(item);
                setExpandedId((id) => (id === item.id ? null : item.id));
              }}
              className={`aspect-[9/16] max-h-[240px] rounded-2xl border bg-gradient-to-b ${cardBg} p-3 flex flex-col text-left hover:shadow-lg hover:scale-[1.02] transition-all duration-200`}
            >
              <span className="text-2xl mb-2">🎬</span>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                {item.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 flex-1">
                {item.description}
              </p>
              <span className="text-[10px] font-medium text-purple-600 dark:text-purple-400 mt-2">
                {item.tag}
              </span>
              {item.refLink && (
                <a
                  href={item.refLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-blue-500 hover:underline mt-1 truncate"
                >
                  📌 {item.refLink.title}
                </a>
              )}
            </button>
          </motion.div>
        ))}
        {onAddNew && (
          <button
            type="button"
            onClick={onAddNew}
            className={`snap-start shrink-0 w-[180px] aspect-[9/16] max-h-[240px] rounded-2xl border-2 border-dashed ${isDark ? "border-slate-600 text-slate-400 hover:border-blue-500 hover:text-blue-400" : "border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600"} flex flex-col items-center justify-center gap-2 transition-colors`}
          >
            <span className="text-3xl">+</span>
            <span className="text-sm font-medium">New Reel Idea</span>
          </button>
        )}
      </div>
      <AnimatePresence>
        {expandedId && items.find((i) => i.id === expandedId) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {/* Expanded content could show full script/hook/caption — placeholder */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
