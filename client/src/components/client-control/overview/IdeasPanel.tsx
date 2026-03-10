"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import type { IdeaItem } from "@/lib/client/mockClientControlData";

type Props = {
  ideas: IdeaItem[];
  defaultCollapsed?: boolean;
};

export function IdeasPanel({ ideas, defaultCollapsed = true }: Props) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const { isDark } = useTheme();

  const panelCls = isDark
    ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]"
    : "bg-gray-50/80 border-[rgba(226,232,240,1)]";
  const cardCls = isDark
    ? "bg-[#08080c] border-[#1a1810] hover:border-[#2a2018]"
    : "bg-white border-gray-100 hover:border-gray-200";
  const textCls = isDark ? "text-[#8a7e6d]" : "text-gray-600";
  const tagCls = isDark ? "bg-[#1a1810] text-[#5a5040]" : "bg-gray-100 text-gray-500";
  const headerCls = "text-xs font-semibold uppercase tracking-wider text-gray-500";
  const btnCls = isDark
    ? "text-[#5a5040] hover:text-[#94a3b8]"
    : "text-gray-500 hover:text-gray-700";

  return (
    <motion.section
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`rounded-2xl border backdrop-blur-[8px] overflow-hidden ${panelCls}`}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className={`w-full px-4 py-3 border-b border-inherit flex items-center justify-between gap-2 text-left ${btnCls} transition-colors`}
      >
        <h2 className={headerCls}>Ideas & Opportunities</h2>
        <span
          className={`shrink-0 transition-transform duration-200 ${collapsed ? "" : "rotate-180"}`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
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
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
