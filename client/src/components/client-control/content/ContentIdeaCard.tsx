"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { ApiContentItem } from "@/lib/api";
import { parseContentNotes } from "./parseContentNotes";
import type { ContentIdeaFilter } from "./ContentIdeaFilters";

const TYPE_TO_BADGE: Record<string, string> = {
  social_post: "📸 Feed Post",
  post: "📸 Feed Post",
  reel_script: "🎬 Reel",
  reel: "🎬 Reel",
  story: "📱 Story",
  carousel: "🎠 Carousel",
  video_script: "🎥 Video",
  video: "🎥 Video",
  ad_creative: "🎥 Video",
};

const TYPE_TO_BORDER: Record<string, string> = {
  post: "border-l-blue-500",
  social_post: "border-l-blue-500",
  reel: "border-l-purple-500",
  reel_script: "border-l-purple-500",
  story: "border-l-pink-500",
  carousel: "border-l-amber-500",
  video: "border-l-indigo-500",
  video_script: "border-l-indigo-500",
  ad_creative: "border-l-indigo-500",
};

function getContentTypeBadge(contentType: string): string {
  const t = (contentType || "post").toLowerCase();
  return TYPE_TO_BADGE[t] ?? TYPE_TO_BADGE.post;
}

function getBorderClass(contentType: string): string {
  const t = (contentType || "post").toLowerCase();
  return TYPE_TO_BORDER[t] ?? "border-l-blue-500";
}

function scoreColor(score: number): string {
  if (score >= 9) return "text-emerald-400 bg-emerald-500/20 border-emerald-500/40";
  if (score >= 7) return "text-amber-400 bg-amber-500/20 border-amber-500/40";
  if (score >= 5) return "text-orange-400 bg-orange-500/20 border-orange-500/40";
  return "text-red-400 bg-red-500/20 border-red-500/40";
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffHours = Math.floor((now.getTime() - d.getTime()) / 3600000);
  if (diffHours < 1) return "just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const days = Math.floor(diffHours / 24);
  return `${days}d ago`;
}

type Props = {
  item: ApiContentItem;
  onApprove: (id: string) => void;
  onEdit: (item: ApiContentItem) => void;
  onReject: (id: string) => void;
};

// Check if notes text looks like structured fields (from parseContentNotes)
function isStructuredNotes(text: string): boolean {
  return /^(Hook:|Format:|CTA:|Caption:|Goal:|Why:|Score:|Best\s*time:|Hashtag)/im.test(text);
}

export function ContentIdeaCard({ item, onApprove, onEdit, onReject }: Props) {
  const { isDark } = useTheme();
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const type = (item.contentType || item.type || "post").toLowerCase();
  const parsed = parseContentNotes(item.notes ?? undefined);
  const hook = parsed.hook || "";
  const caption = parsed.caption || item.caption || (item.notes ?? "").slice(0, 300);
  const format = parsed.format ?? "—";
  const bestTime = parsed.bestTime ?? "—";
  const hashtags = parsed.hashtags ?? "—";
  const whyThisWorks = parsed.whyThisWorks ?? "";
  const score = parsed.score;
  const isAgent = (item.source || "manual").toLowerCase() === "agent";

  // Show full notes when they exist, differ from caption, and aren't structured
  const rawNotes = item.notes ?? "";
  const showFullNotes = rawNotes.length > 0 && rawNotes !== caption && !isStructuredNotes(rawNotes);
  const displayText = showFullNotes ? rawNotes : caption;
  const needsTruncation = displayText.length > 200;

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)] border-white/5 hover:border-white/10" : "bg-white border-gray-200 hover:border-gray-300";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  const handleApprove = () => {
    onApprove(item.id);
  };

  const handleRejectConfirm = () => {
    setRemoving(true);
    onReject(item.id);
    setRejectConfirm(false);
  };

  return (
    <AnimatePresence>
      {!removing && (
        <motion.div
          layout
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`rounded-xl border ${cardBg} ${getBorderClass(type)} border-l-4 transition-colors ${isDark ? "shadow-lg" : "shadow"}`}
        >
          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${isDark ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-700"}`}>
                    {getContentTypeBadge(type)}
                  </span>
                </div>
                <h3 className={`text-lg font-semibold ${textCls} mb-1`}>{item.title}</h3>
                {hook && (
                  <p className={`text-sm ${mutedCls} mb-2`}>
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Hook:</span> {hook}
                  </p>
                )}
                {displayText && (
                  <div className={`text-sm ${mutedCls} mb-2`}>
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>
                      {showFullNotes ? "Notes:" : "Caption:"}
                    </span>{" "}
                    <span className="whitespace-pre-wrap break-words">
                      {needsTruncation && !expanded
                        ? displayText.slice(0, 200) + "…"
                        : displayText}
                    </span>
                    {needsTruncation && (
                      <button
                        type="button"
                        onClick={() => setExpanded(!expanded)}
                        className="ml-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        {expanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span>Format: {format}</span>
                  <span>Best time: {bestTime}</span>
                  {hashtags !== "—" && <span>Hashtags: {hashtags}</span>}
                </div>
                {whyThisWorks && (
                  <p className={`text-xs ${mutedCls} mt-2`}>
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Why this works:</span> {whyThisWorks}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
                >
                  ✅ Approve
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:bg-white/15 transition-colors border border-white/10"
                >
                  ✏️ Edit
                </button>
                {!rejectConfirm ? (
                  <button
                    type="button"
                    onClick={() => setRejectConfirm(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
                  >
                    ❌ Reject
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Reject?</span>
                    <button
                      type="button"
                      onClick={handleRejectConfirm}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 border border-red-500/50 hover:bg-red-500/10"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectConfirm(false)}
                      className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-300"
                    >
                      No
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
              <span className={`text-xs ${mutedCls}`}>
                {isAgent ? "🤖 AI Generated" : "👤 Manual"} · {timeAgo(item.createdAt)}
              </span>
              {score != null && (
                <span className={`text-xs px-2 py-0.5 rounded border ${scoreColor(score)}`}>
                  Score: {score}/10
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
