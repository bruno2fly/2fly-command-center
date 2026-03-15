"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import type { ApiContentItem } from "@/lib/api";
import { parseContentNotes } from "./parseContentNotes";

const TYPE_EMOJI: Record<string, string> = {
  post: "📸",
  social_post: "📸",
  reel: "🎬",
  reel_script: "🎬",
  story: "📱",
  carousel: "🎠",
  video: "🎥",
  video_script: "🎥",
  ad_creative: "🎥",
};

function getTypeEmoji(contentType: string): string {
  return TYPE_EMOJI[(contentType || "post").toLowerCase()] ?? "📸";
}

type Props = {
  item: ApiContentItem;
  onSchedule: (item: ApiContentItem, date: string) => void;
  onSendToTeam: (item: ApiContentItem) => Promise<void>;
};

export function ApprovedContentCard({ item, onSchedule, onSendToTeam }: Props) {
  const { isDark } = useTheme();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");

  const type = (item.contentType || item.type || "post").toLowerCase();
  const emoji = getTypeEmoji(type);
  const approvedDate = item.updatedAt; // or we could add approvedAt if we had it
  const parsed = parseContentNotes(item.notes ?? undefined);
  const visualBrief = parsed.visualBrief ?? parsed.whyThisWorks ?? item.caption ?? "";

  const cardBg = isDark ? "bg-white/[0.02] border-white/5 hover:border-white/10" : "bg-gray-50 border-gray-200 hover:border-gray-300";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  const handleSendToTeam = async () => {
    if (sent || sending) return;
    setSending(true);
    try {
      await onSendToTeam(item);
      setSent(true);
      toast.success("Task created for design team");
    } catch {
      toast.error("Failed to create task");
    } finally {
      setSending(false);
    }
  };

  const handleSchedule = () => {
    if (!scheduleDate) return;
    onSchedule(item, scheduleDate);
    setShowDatePicker(false);
    setScheduleDate("");
  };

  const approvedLabel = approvedDate
    ? new Date(approvedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Approved";

  return (
    <div className={`rounded-xl border ${cardBg} p-4 transition-colors`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg" aria-hidden>{emoji}</span>
            <h3 className={`font-semibold ${textCls} truncate`}>{item.title}</h3>
          </div>
          <p className={`text-xs ${mutedCls} mt-0.5`}>Approved {approvedLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={sent ? undefined : handleSendToTeam}
            disabled={sending || sent}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              sent
                ? "bg-emerald-500/20 text-emerald-400 cursor-default"
                : "bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10"
            }`}
          >
            {sent ? "✅ Sent" : "📤 Send to Team"}
          </button>
          {!showDatePicker ? (
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10"
            >
              📅 Schedule
            </button>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className={`rounded-lg border px-3 py-2 text-sm ${isDark ? "bg-[#1a1818] border-white/10 text-white" : "bg-white border-gray-300 text-gray-900"}`}
              />
              <button
                type="button"
                onClick={handleSchedule}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Set
              </button>
              <button
                type="button"
                onClick={() => { setShowDatePicker(false); setScheduleDate(""); }}
                className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-300"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
