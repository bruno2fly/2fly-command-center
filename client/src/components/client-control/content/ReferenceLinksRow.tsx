"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { ReferenceLink } from "./contentIdeaTypes";

const SOURCE_ICON: Record<string, string> = {
  pinterest: "🖼️",
  instagram: "📱",
  tiktok: "🎵",
  other: "🔗",
};

type Props = {
  items: ReferenceLink[];
  onItemsChange: (next: ReferenceLink[]) => void;
  onAdd?: () => void;
};

export function ReferenceLinksRow({ items, onItemsChange, onAdd }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        📌 References & Inspiration
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
        {items.map((item, i) => (
          <motion.a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`shrink-0 min-w-[140px] rounded-xl border p-3 ${cardBg} hover:shadow-md hover:border-blue-500/20 transition-all`}
          >
            <span className="text-lg">{SOURCE_ICON[item.source] ?? "🔗"}</span>
            <p className={`text-sm font-medium truncate mt-1 ${textCls}`}>{item.title}</p>
            <p className={`text-[10px] truncate ${mutedCls}`}>
              {item.source === "pinterest" ? "pinterest.com/..." : item.source === "instagram" ? "instagram.com/..." : item.source === "tiktok" ? "tiktok.com/..." : "link"}
            </p>
          </motion.a>
        ))}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className={`shrink-0 min-w-[100px] rounded-xl border-2 border-dashed ${isDark ? "border-slate-600 text-slate-400 hover:border-blue-500" : "border-gray-300 text-gray-500 hover:border-blue-500"} flex items-center justify-center gap-1 transition-colors`}
          >
            <span className="text-xl">+</span>
            <span className="text-sm">Add</span>
          </button>
        )}
      </div>
    </div>
  );
}
