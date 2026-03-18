"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type AiUpdate = {
  id: string;
  title: string;
  summary: string;
  impact: string | null;
  action: string | null;
  source: string | null;
  category: string;
  relevance: string;
  createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AiUpdatesPage() {
  const { isDark } = useTheme();
  const [updates, setUpdates] = useState<AiUpdate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/ai-updates`)
      .then((r) => r.json())
      .then((data) => {
        setUpdates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const relevant = updates.filter((u) => u.category === "relevant");
  const general = updates.filter((u) => u.category !== "relevant");

  const cardCls = isDark
    ? "bg-[#0a0a0e] border border-white/5 rounded-xl p-4"
    : "bg-white border border-gray-200 rounded-xl p-4";
  const titleCls = isDark ? "text-gray-100" : "text-gray-900";
  const subtleCls = isDark ? "text-gray-400" : "text-gray-500";
  const pageBg = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const sectionTitleCls = `text-sm font-semibold uppercase tracking-wider ${subtleCls}`;

  const relevanceBadge = (r: string) => {
    if (r === "high")
      return isDark
        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
        : "bg-emerald-50 text-emerald-600 border border-emerald-200";
    if (r === "low")
      return isDark
        ? "bg-gray-500/10 text-gray-500 border border-gray-500/20"
        : "bg-gray-100 text-gray-500 border border-gray-200";
    return isDark
      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
      : "bg-blue-50 text-blue-600 border border-blue-200";
  };

  const renderUpdate = (u: AiUpdate) => (
    <div key={u.id} className={cardCls}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className={`text-sm font-semibold ${titleCls}`}>{u.title}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${relevanceBadge(u.relevance)}`}>
            {u.relevance}
          </span>
          <span className={`text-xs ${subtleCls}`}>{timeAgo(u.createdAt)}</span>
        </div>
      </div>
      <p className={`text-sm ${subtleCls} mb-2`}>{u.summary}</p>
      {u.impact && (
        <div className={`text-sm mb-1 ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
          💡 {u.impact}
        </div>
      )}
      {u.action && (
        <div className={`text-sm mb-1 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
          ⚡ {u.action}
        </div>
      )}
      {u.source && (
        <a
          href={u.source}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-xs ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}
        >
          🔗 Source
        </a>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className={`text-2xl font-bold mb-6 ${titleCls}`}>AI Updates</h1>

        {loading && <div className={`text-sm ${subtleCls}`}>Loading...</div>}

        {!loading && updates.length === 0 && (
          <div className={cardCls}>
            <div className={`text-sm ${subtleCls} text-center py-8`}>
              No updates yet. Research Intel agent will bring updates here automatically.
            </div>
          </div>
        )}

        {/* RELEVANT FOR 2FLY — TOP */}
        {relevant.length > 0 && (
          <div className="mb-8">
            <h2 className={`${sectionTitleCls} mb-4`}>⭐ Relevant for 2FLY</h2>
            <div className="space-y-3">{relevant.map(renderUpdate)}</div>
          </div>
        )}

        {/* ALL UPDATES */}
        {general.length > 0 && (
          <div>
            <h2 className={`${sectionTitleCls} mb-4`}>📡 Updates</h2>
            <div className="space-y-3">{general.map(renderUpdate)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
