"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import type { NoteItem, IdeaItem, InsightItem } from "@/lib/client/mockClientControlData";

type Props = {
  notes: NoteItem[];
  ideas: IdeaItem[];
  insights: InsightItem[];
};

const IDEA_TAG: { light: Record<string, string>; dark: Record<string, string> } = {
  light: { content: "bg-blue-100 text-blue-700", offer: "bg-emerald-100 text-emerald-700", ads: "bg-purple-100 text-purple-700", ops: "bg-amber-100 text-amber-700" },
  dark: { content: "bg-blue-500/20 text-blue-400", offer: "bg-emerald-500/20 text-emerald-400", ads: "bg-purple-500/20 text-purple-400", ops: "bg-amber-500/20 text-amber-400" },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function ClientBrainPanel({ notes, ideas, insights }: Props) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<"notes" | "ideas" | "insights">("notes");
  const [noteInput, setNoteInput] = useState("");
  const [ideaInput, setIdeaInput] = useState("");
  const ideaTag = isDark ? IDEA_TAG.dark : IDEA_TAG.light;

  return (
    <div className={`rounded-lg border p-4 flex flex-col ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-100 bg-white"}`}>
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>Brain</h2>
      <div className="flex gap-1 mb-3">
        {(["notes", "ideas", "insights"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
              activeTab === tab
                ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                : isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810] hover:text-[#c4b8a8]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === "notes" && (
          <>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Quick note..."
                className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8] placeholder-[#5a5040]" : "border-gray-200"
                }`}
              />
              <button className={`px-3 py-2 text-sm font-medium rounded-lg ${isDark ? "bg-emerald-600/80 text-white hover:bg-emerald-500/80" : "bg-blue-600 text-white hover:bg-blue-500"}`}>
                Add
              </button>
            </div>
            <ul className="space-y-2 overflow-auto flex-1 min-h-0">
              {notes.length === 0 ? (
                <p className={`text-sm py-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No notes yet. Capture thoughts quickly above.</p>
              ) : (
                notes.map((n) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-2.5 rounded-lg border ${isDark ? "bg-[#0c0c10] border-[#1a1810]" : "bg-gray-50 border-gray-100"}`}
                  >
                    <p className={`text-sm ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{n.text}</p>
                    <p className={`text-xs mt-1 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{formatTime(n.createdAt)} · {n.author}</p>
                  </motion.li>
                ))
              )}
            </ul>
          </>
        )}

        {activeTab === "ideas" && (
          <>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={ideaInput}
                onChange={(e) => setIdeaInput(e.target.value)}
                placeholder="Capture idea..."
                className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDark ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8] placeholder-[#5a5040]" : "border-gray-200"
                }`}
              />
              <button className={`px-3 py-2 text-sm font-medium rounded-lg ${isDark ? "bg-emerald-600/80 text-white hover:bg-emerald-500/80" : "bg-blue-600 text-white hover:bg-blue-500"}`}>
                Add
              </button>
            </div>
            <ul className="space-y-2 overflow-auto flex-1 min-h-0">
              {ideas.length === 0 ? (
                <p className={`text-sm py-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No ideas yet. Add content, offer, ads, or ops ideas above.</p>
              ) : (
                ideas.map((i) => (
                  <motion.li
                    key={i.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`p-2.5 rounded-lg border ${isDark ? "bg-[#0c0c10] border-[#1a1810]" : "bg-gray-50 border-gray-100"}`}
                  >
                    <p className={`text-sm ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{i.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${ideaTag[i.tag] ?? (isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-200 text-gray-600")}`}>
                        {i.tag}
                      </span>
                      <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{formatTime(i.createdAt)}</span>
                    </div>
                  </motion.li>
                ))
              )}
            </ul>
          </>
        )}

        {activeTab === "insights" && (
          <ul className="space-y-2 overflow-auto flex-1 min-h-0">
            {insights.length === 0 ? (
              <p className={`text-sm py-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>AI insights will appear here.</p>
            ) : (
              insights.map((ins, idx) => (
                <motion.li
                  key={ins.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`flex gap-2 p-2.5 rounded-lg border ${isDark ? "bg-amber-500/10 border-amber-500/20" : "bg-amber-50/50 border-amber-100"}`}
                >
                  <span className={`flex-shrink-0 mt-0.5 ${isDark ? "text-amber-400" : "text-amber-500"}`}>•</span>
                  <p className={`text-sm ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{ins.text}</p>
                </motion.li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
