"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";

type AiUpdate = {
  id: string;
  title: string;
  summary: string;
  impact: string | null;
  action: string | null;
  source: string | null;
  category: string;
  relevance: string;
  deepResearch: string | null;
  deepStatus: string;
  strategyPlan: string | null;
  strategyStatus: string;
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);

  const fetchUpdates = useCallback(() => {
    fetch(`${API}/api/ai-updates`)
      .then((r) => r.json())
      .then((data) => {
        setUpdates(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchUpdates(); }, [fetchUpdates]);

  // Poll for loading items
  useEffect(() => {
    const hasLoading = updates.some((u) => u.deepStatus === "loading" || u.strategyStatus === "loading");
    if (!hasLoading) return;
    const interval = setInterval(fetchUpdates, 3000);
    return () => clearInterval(interval);
  }, [updates, fetchUpdates]);

  const handleGoDeep = async (id: string) => {
    await fetch(`${API}/api/ai-updates/${id}/go-deep`, { method: "POST" });
    setUpdates((prev) => prev.map((u) => u.id === id ? { ...u, deepStatus: "loading" } : u));
  };

  const handleStrategize = async (id: string) => {
    await fetch(`${API}/api/ai-updates/${id}/strategize`, { method: "POST" });
    setUpdates((prev) => prev.map((u) => u.id === id ? { ...u, strategyStatus: "loading" } : u));
  };

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

  const btnCls = (variant: "primary" | "secondary" | "success") => {
    const base = "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors";
    if (variant === "primary")
      return `${base} ${isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`;
    if (variant === "success")
      return `${base} ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`;
    return `${base} ${isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`;
  };

  const loadingDots = (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );

  // Strategy detail view
  if (strategyId) {
    const item = updates.find((u) => u.id === strategyId);
    if (!item) { setStrategyId(null); return null; }
    return (
      <div className={`min-h-screen ${pageBg}`}>
        <div className="w-full px-6 py-8">
          <button onClick={() => setStrategyId(null)} className={`mb-4 text-sm ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}>
            ← Back to AI Updates
          </button>
          <h1 className={`text-2xl font-bold mb-2 ${titleCls}`}>🎯 Strategy Plan</h1>
          <h2 className={`text-lg mb-6 ${subtleCls}`}>{item.title}</h2>

          {item.strategyStatus === "loading" && (
            <div className={`${cardCls} text-center py-12`}>
              <div className={`text-lg mb-2 ${titleCls}`}>Generating strategy plan {loadingDots}</div>
              <div className={`text-sm ${subtleCls}`}>Revenue Operator is analyzing this opportunity...</div>
            </div>
          )}

          {item.strategyStatus === "done" && item.strategyPlan && (
            <div className={cardCls}>
              <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
                <ReactMarkdown>{item.strategyPlan}</ReactMarkdown>
              </div>
            </div>
          )}

          {item.strategyStatus === "none" && (
            <div className={`${cardCls} text-center py-12`}>
              <div className={`text-sm mb-4 ${subtleCls}`}>No strategy plan yet.</div>
              <button onClick={() => handleStrategize(item.id)} className={btnCls("secondary")}>
                🎯 Generate Strategy Plan
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderUpdate = (u: AiUpdate) => {
    const isExpanded = expandedId === u.id;

    return (
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
          <div className={`text-sm mb-2 ${isDark ? "text-amber-400" : "text-amber-600"}`}>
            ⚡ {u.action}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
          {u.source && (
            <a href={u.source} target="_blank" rel="noopener noreferrer" className={`text-xs ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}>
              🔗 Source
            </a>
          )}

          {/* Go Deep / Open Research */}
          {u.deepStatus === "none" && (
            <button onClick={() => handleGoDeep(u.id)} className={btnCls("primary")}>
              🔍 Go Deep
            </button>
          )}
          {u.deepStatus === "loading" && (
            <span className={`text-xs ${isDark ? "text-blue-400" : "text-blue-600"}`}>
              🔍 Researching {loadingDots}
            </span>
          )}
          {u.deepStatus === "done" && (
            <button onClick={() => setExpandedId(isExpanded ? null : u.id)} className={btnCls("primary")}>
              {isExpanded ? "📖 Close Research" : "📖 Open Full Research"}
            </button>
          )}

          {/* Act on This / Open Strategy */}
          {u.category === "relevant" && (
            <>
              {u.strategyStatus === "none" && (
                <button onClick={() => handleStrategize(u.id)} className={btnCls("secondary")}>
                  🎯 Act on This
                </button>
              )}
              {u.strategyStatus === "loading" && (
                <span className={`text-xs ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                  🎯 Planning {loadingDots}
                </span>
              )}
              {u.strategyStatus === "done" && (
                <button onClick={() => setStrategyId(u.id)} className={btnCls("success")}>
                  🎯 Open Strategy Plan
                </button>
              )}
            </>
          )}
        </div>

        {/* Expanded deep research */}
        {isExpanded && u.deepResearch && (
          <div className={`mt-4 pt-4 border-t ${isDark ? "border-white/5" : "border-gray-100"}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
              📖 Deep Research
            </h4>
            <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
              <ReactMarkdown>{u.deepResearch}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="w-full px-6 py-8">
        <h1 className={`text-2xl font-bold mb-6 ${titleCls}`}>AI Updates</h1>

        {loading && <div className={`text-sm ${subtleCls}`}>Loading...</div>}

        {!loading && updates.length === 0 && (
          <div className={cardCls}>
            <div className={`text-sm ${subtleCls} text-center py-8`}>
              No updates yet. Research Intel agent will bring updates here automatically.
            </div>
          </div>
        )}

        {relevant.length > 0 && (
          <div className="mb-8">
            <h2 className={`${sectionTitleCls} mb-4`}>⭐ Relevant for 2FLY</h2>
            <div className="space-y-3">{relevant.map(renderUpdate)}</div>
          </div>
        )}

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
