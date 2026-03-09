"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { NoteItem, IdeaItem, InsightItem } from "@/lib/client/mockClientControlData";

type Props = {
  notes: NoteItem[];
  ideas: IdeaItem[];
  insights: InsightItem[];
};

const IDEA_TAG_COLOR: Record<string, string> = {
  content: "bg-blue-100 text-blue-700",
  offer: "bg-emerald-100 text-emerald-700",
  ads: "bg-purple-100 text-purple-700",
  ops: "bg-amber-100 text-amber-700",
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
  const [activeTab, setActiveTab] = useState<"notes" | "ideas" | "insights">("notes");
  const [noteInput, setNoteInput] = useState("");
  const [ideaInput, setIdeaInput] = useState("");

  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4 flex flex-col">
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Brain</h2>
      <div className="flex gap-1 mb-3">
        {(["notes", "ideas", "insights"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize ${
              activeTab === tab ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500">
                Add
              </button>
            </div>
            <ul className="space-y-2 overflow-auto flex-1 min-h-0">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No notes yet. Capture thoughts quickly above.</p>
              ) : (
                notes.map((n) => (
                  <motion.li
                    key={n.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <p className="text-sm text-gray-900">{n.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(n.createdAt)} · {n.author}</p>
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
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500">
                Add
              </button>
            </div>
            <ul className="space-y-2 overflow-auto flex-1 min-h-0">
              {ideas.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">No ideas yet. Add content, offer, ads, or ops ideas above.</p>
              ) : (
                ideas.map((i) => (
                  <motion.li
                    key={i.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-2.5 rounded-lg bg-gray-50 border border-gray-100"
                  >
                    <p className="text-sm text-gray-900">{i.text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          IDEA_TAG_COLOR[i.tag] ?? "bg-gray-200 text-gray-600"
                        }`}
                      >
                        {i.tag}
                      </span>
                      <span className="text-xs text-gray-500">{formatTime(i.createdAt)}</span>
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
              <p className="text-sm text-gray-500 py-4">AI insights will appear here.</p>
            ) : (
              insights.map((ins, idx) => (
                <motion.li
                  key={ins.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex gap-2 p-2.5 rounded-lg bg-amber-50/50 border border-amber-100"
                >
                  <span className="text-amber-500 flex-shrink-0 mt-0.5">•</span>
                  <p className="text-sm text-gray-900">{ins.text}</p>
                </motion.li>
              ))
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
