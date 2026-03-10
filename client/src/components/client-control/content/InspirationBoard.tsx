"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export type InspirationItem = {
  id: string;
  title: string;
  url: string;
};

type Props = {
  items: InspirationItem[];
  onItemsChange: (next: InspirationItem[]) => void;
};

function generateId() {
  return `insp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function InspirationBoard({ items, onItemsChange }: Props) {
  const { isDark } = useTheme();

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  const addPlaceholder = () => {
    onItemsChange([
      ...items,
      { id: generateId(), title: "New reference", url: "https://" },
    ]);
  };

  const remove = (id: string) => {
    onItemsChange(items.filter((i) => i.id !== id));
  };

  return (
    <div className={`rounded-2xl border ${cardBorder} ${cardBg} overflow-hidden`}>
      <div className={`px-4 py-3 border-b ${cardBorder}`}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          📌 Inspiration
        </h2>
      </div>
      <div className="p-3 max-h-[320px] overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`relative rounded-xl border ${cardBorder} overflow-hidden ${isDark ? "bg-[rgba(15,23,42,0.6)]" : "bg-gray-50/80"} hover:shadow-md transition-all cursor-pointer group`}
              >
                <div className="aspect-[4/3] flex items-center justify-center bg-gray-500/10 text-2xl text-gray-400 group-hover:bg-gray-500/20">
                  🖼️
                </div>
                <div className="p-2">
                  <p className={`text-xs font-medium truncate ${textCls}`}>{item.title}</p>
                  <p className={`text-[10px] truncate ${mutedCls}`}>
                    {item.url.replace(/^https?:\/\//, "").slice(0, 30)}…
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    remove(item.id);
                  }}
                  className="absolute top-1 right-1 w-5 h-5 rounded bg-red-500/20 text-red-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </motion.a>
            ))}
          </AnimatePresence>
        </div>
        <button
          type="button"
          onClick={addPlaceholder}
          className={`mt-2 w-full rounded-xl border border-dashed ${cardBorder} py-2.5 text-xs font-medium ${mutedCls} hover:border-blue-500/50 hover:text-blue-500 transition-colors`}
        >
          + Add inspiration
        </button>
      </div>
    </div>
  );
}
