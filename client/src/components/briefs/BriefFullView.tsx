"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { api, type ApiBrief } from "@/lib/api";
import { toast } from "sonner";

const AGENT_EMOJI: Record<string, string> = {
  "founder-boss": "🤖",
  "content-system": "📝",
  "meta-traffic": "🎯",
  "research-intel": "🔍",
  "inbox-triage": "📥",
  "project-manager": "📋",
  "approval-feedback": "✅",
  "client-memory": "🧠",
};

/** Simple markdown-like render: ## header, **bold**, newlines */
function renderSummary(summary: string, isDark: boolean) {
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const lines = summary.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={i} className={`text-sm font-semibold mt-4 mb-1 ${textCls}`}>
          {trimmed.slice(3)}
        </h3>
      );
    }
    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={i} className={`text-base font-semibold mt-4 mb-2 ${textCls}`}>
          {trimmed.slice(2)}
        </h2>
      );
    }
    return (
      <p key={i} className={`text-sm mb-2 ${textCls}`}>
        {trimmed}
      </p>
    );
  });
}

function parseHighlights(highlights: string | null): string[] {
  if (!highlights) return [];
  try {
    const arr = JSON.parse(highlights) as unknown;
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

function parseHealthSnapshot(snap: string | null): { green?: number; yellow?: number; red?: number } | null {
  if (!snap) return null;
  try {
    return JSON.parse(snap) as { green?: number; yellow?: number; red?: number };
  } catch {
    return null;
  }
}

type Props = {
  brief: ApiBrief;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
};

export function BriefFullView({ brief, onClose, onPrev, onNext, hasPrev, hasNext }: Props) {
  const { isDark } = useTheme();
  const emoji = AGENT_EMOJI[brief.agentId] ?? "📄";
  const highlights = parseHighlights(brief.highlights);
  const health = parseHealthSnapshot(brief.healthSnapshot);

  const handleMarkRead = () => {
    api.patchBrief(brief.id, { status: "read" }).then(() => toast.success("Marked as read")).catch(() => {});
    onClose();
  };

  const handleArchive = () => {
    api.patchBrief(brief.id, { status: "archived" }).then(() => toast.success("Archived")).catch(() => {});
    onClose();
  };

  const handleShareDiscord = () => {
    toast("Share to Discord — link copied (placeholder)");
  };

  const modalBg = isDark ? "bg-[#0f172a] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={`${modalBg} rounded-2xl border shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className={`shrink-0 px-6 py-4 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-2xl">{emoji}</span>
              <div>
                <h1 className={`text-lg font-semibold ${textCls}`}>{brief.agentName}</h1>
                <p className={`text-sm ${mutedCls}`}>{brief.title}</p>
                <p className={`text-xs mt-0.5 ${mutedCls}`}>
                  {new Date(brief.createdAt).toLocaleString()}
                </p>
              </div>
              <span
                className={`shrink-0 px-2 py-0.5 rounded-lg text-xs font-medium ${
                  brief.type === "morning" ? "bg-blue-500/20 text-blue-400" : "bg-gray-500/20 text-gray-400"
                }`}
              >
                {brief.type}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-lg ${isDark ? "hover:bg-white/10" : "hover:bg-gray-100"}`}
            >
              ×
            </button>
          </div>

          {highlights.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {highlights.map((h, i) => (
                <span
                  key={i}
                  className={`px-2.5 py-1 rounded-lg text-xs ${isDark ? "bg-[#1a1810] text-gray-400" : "bg-gray-100 text-gray-700"}`}
                >
                  {h}
                </span>
              ))}
            </div>
          )}

          {health && (health.green != null || health.yellow != null || health.red != null) && (
            <div className="flex items-center gap-3 mt-3">
              {health.green != null && (
                <span className="text-sm">
                  <span className="text-emerald-500">🟢</span> {health.green}
                </span>
              )}
              {health.yellow != null && (
                <span className="text-sm">
                  <span className="text-amber-500">🟡</span> {health.yellow}
                </span>
              )}
              {health.red != null && (
                <span className="text-sm">
                  <span className="text-red-500">🔴</span> {health.red}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 prose prose-invert max-w-none">
          <div className={isDark ? "text-[#c4b8a8]" : "text-gray-800"}>
            {renderSummary(brief.summary, isDark)}
          </div>
        </div>

        {/* Actions + Nav */}
        <div
          className={`shrink-0 px-6 py-4 border-t flex items-center justify-between gap-4 ${
            isDark ? "border-[#1a1810]" : "border-gray-100"
          }`}
        >
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleMarkRead}
              className="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white hover:bg-blue-600"
            >
              Mark as Read
            </button>
            <button
              type="button"
              onClick={handleArchive}
              className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-700"}`}
            >
              Archive
            </button>
            <button
              type="button"
              onClick={handleShareDiscord}
              className={`px-3 py-1.5 rounded-lg text-sm ${isDark ? "bg-gray-700 text-gray-200" : "bg-gray-200 text-gray-700"}`}
            >
              Share to Discord
            </button>
          </div>
          <div className="flex gap-1">
            {hasPrev && (
              <button
                type="button"
                onClick={onPrev}
                className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                ←
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={onNext}
                className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10"
              >
                →
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
