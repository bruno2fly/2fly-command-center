"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { ApiBrief } from "@/lib/api";

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

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function firstHighlight(brief: ApiBrief): string {
  if (!brief.highlights) return brief.summary.slice(0, 80).replace(/\n/g, " ");
  try {
    const arr = JSON.parse(brief.highlights) as string[];
    return Array.isArray(arr) && arr[0] ? String(arr[0]) : brief.summary.slice(0, 80);
  } catch {
    return brief.summary.slice(0, 80).replace(/\n/g, " ");
  }
}

type Props = {
  brief: ApiBrief;
  onClick: () => void;
};

export function BriefRow({ brief, onClick }: Props) {
  const { isDark } = useTheme();
  const emoji = AGENT_EMOJI[brief.agentId] ?? "📄";
  const isNew = brief.status === "unread";

  const rowBg = isDark ? "hover:bg-[#141210]" : "hover:bg-gray-50";
  const borderCls = isDark ? "border-[#1a1810]" : "border-gray-100";

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-xl border-b ${borderCls} ${rowBg} transition-colors`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium truncate ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            {brief.title}
          </span>
          <span className={`text-[10px] shrink-0 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
            {formatTime(brief.createdAt)}
          </span>
          <span
            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              isNew
                ? "bg-blue-500/20 text-blue-400"
                : isDark
                  ? "bg-gray-700 text-gray-400"
                  : "bg-gray-200 text-gray-600"
            }`}
          >
            {isNew ? "NEW" : "Read"}
          </span>
        </div>
        <p className={`text-xs mt-0.5 truncate ${isDark ? "text-gray-500" : "text-gray-600"}`}>
          {firstHighlight(brief)}
        </p>
      </div>
    </motion.button>
  );
}
