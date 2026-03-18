"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";

/* ─── Types ─── */
type Status = "inbox" | "for_2fly" | "archived" | "deleted";
type Relevance = "high" | "medium" | "low";
type Tab = "inbox" | "for_2fly" | "archived";

type AiUpdate = {
  id: string;
  title: string;
  summary: string;
  impact: string | null;
  action: string | null;
  source: string | null;
  category: string;
  relevance: Relevance;
  status: Status;
  deepResearch: string | null;
  deepStatus: string;
  strategyPlan: string | null;
  strategyStatus: string;
  createdAt: string;
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/* ─── Helpers ─── */
function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function cleanAgentOutput(text: string): string {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("# ") || line.startsWith("## ") || line === "---") {
      return lines.slice(i).join("\n").trim();
    }
  }
  return text.trim();
}

/* ─── Main Page ─── */
export default function AiUpdatesPage() {
  const { isDark } = useTheme();
  const [updates, setUpdates] = useState<AiUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("inbox");
  const [relevanceFilter, setRelevanceFilter] = useState<Relevance | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [strategyId, setStrategyId] = useState<string | null>(null);

  /* ─── Fetch ─── */
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

  /* ─── Actions ─── */
  const changeStatus = async (id: string, newStatus: Status) => {
    // Optimistic update — remove from current view immediately
    setUpdates((prev) => prev.map((u) => u.id === id ? { ...u, status: newStatus } : u));
    try {
      await fetch(`${API}/api/ai-updates/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      fetchUpdates(); // revert on error
    }
  };

  const handleGoDeep = async (id: string) => {
    await fetch(`${API}/api/ai-updates/${id}/go-deep`, { method: "POST" });
    setUpdates((prev) => prev.map((u) => u.id === id ? { ...u, deepStatus: "loading" } : u));
  };

  const handleStrategize = async (id: string) => {
    await fetch(`${API}/api/ai-updates/${id}/strategize`, { method: "POST" });
    setUpdates((prev) => prev.map((u) => u.id === id ? { ...u, strategyStatus: "loading" } : u));
  };

  const handleDelete = async (id: string) => {
    setUpdates((prev) => prev.filter((u) => u.id !== id));
    try {
      await fetch(`${API}/api/ai-updates/${id}`, { method: "DELETE" });
    } catch {
      fetchUpdates();
    }
  };

  /* ─── Filtered Data ─── */
  const filtered = updates.filter((u) => {
    if (u.status !== activeTab) return false;
    if (activeTab === "inbox" && relevanceFilter !== "all" && u.relevance !== relevanceFilter) return false;
    return true;
  });

  const counts = {
    inbox: updates.filter((u) => u.status === "inbox").length,
    for_2fly: updates.filter((u) => u.status === "for_2fly").length,
    archived: updates.filter((u) => u.status === "archived").length,
  };

  /* ─── Styles ─── */
  const cardCls = isDark
    ? "bg-[#0a0a0e] border border-white/5 rounded-xl p-4"
    : "bg-white border border-gray-200 rounded-xl p-4 shadow-sm";
  const titleCls = isDark ? "text-gray-100" : "text-gray-900";
  const subtleCls = isDark ? "text-gray-400" : "text-gray-500";
  const pageBg = isDark ? "bg-[#06060a]" : "bg-gray-50";

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

  const btnCls = (variant: "primary" | "secondary" | "success" | "danger" | "ghost") => {
    const base = "px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer";
    if (variant === "primary")
      return `${base} ${isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`;
    if (variant === "success")
      return `${base} ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"}`;
    if (variant === "secondary")
      return `${base} ${isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-50 text-amber-600 hover:bg-amber-100"}`;
    if (variant === "danger")
      return `${base} ${isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100"}`;
    return `${base} ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`;
  };

  const tabCls = (tab: Tab) => {
    const isActive = activeTab === tab;
    const base = "px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer";
    if (isActive) {
      return `${base} ${isDark ? "bg-white/10 text-white" : "bg-white text-gray-900 shadow-sm"}`;
    }
    return `${base} ${isDark ? "text-gray-500 hover:text-gray-300 hover:bg-white/5" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"}`;
  };

  const pillCls = (active: boolean) => {
    const base = "px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer";
    if (active) {
      return `${base} ${isDark ? "bg-white/10 text-white" : "bg-gray-900 text-white"}`;
    }
    return `${base} ${isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`;
  };

  const loadingDots = (
    <span className="inline-flex gap-1">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  );

  /* ─── Strategy Detail View ─── */
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
                <ReactMarkdown>{cleanAgentOutput(item.strategyPlan)}</ReactMarkdown>
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

  /* ─── Card Component ─── */
  const renderCard = (u: AiUpdate) => {
    const isExpanded = expandedId === u.id;

    return (
      <div key={u.id} className={`${cardCls} group`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className={`text-sm font-semibold ${titleCls}`}>{u.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${relevanceBadge(u.relevance)}`}>
              {u.relevance}
            </span>
            <span className={`text-xs ${subtleCls}`}>{timeAgo(u.createdAt)}</span>
          </div>
        </div>

        {/* Summary */}
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

        {/* Actions — vary by tab */}
        <div className={`flex items-center gap-2 mt-3 pt-3 border-t ${isDark ? "border-white/5" : "border-gray-100"} flex-wrap`}>
          {u.source && (
            <a href={u.source} target="_blank" rel="noopener noreferrer" className={`text-xs ${isDark ? "text-blue-400 hover:text-blue-300" : "text-blue-600 hover:text-blue-500"}`}>
              🔗 Source
            </a>
          )}

          {/* ─── INBOX actions ─── */}
          {activeTab === "inbox" && (
            <>
              <button onClick={() => changeStatus(u.id, "for_2fly")} className={btnCls("success")}>
                ⭐ Send to AI for 2Fly
              </button>
              <button onClick={() => changeStatus(u.id, "archived")} className={btnCls("ghost")}>
                📦 Archive
              </button>
              <button onClick={() => handleDelete(u.id)} className={btnCls("danger")}>
                ✕ Delete
              </button>
            </>
          )}

          {/* ─── FOR_2FLY actions ─── */}
          {activeTab === "for_2fly" && (
            <>
              {/* Go Deep */}
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
                  {isExpanded ? "📖 Close Research" : "📖 Open Research"}
                </button>
              )}

              {/* Strategy */}
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

              <button onClick={() => changeStatus(u.id, "archived")} className={btnCls("ghost")}>
                📦 Archive
              </button>
            </>
          )}

          {/* ─── ARCHIVED actions ─── */}
          {activeTab === "archived" && (
            <>
              <button onClick={() => changeStatus(u.id, "for_2fly")} className={btnCls("success")}>
                ⭐ Restore to AI for 2Fly
              </button>
              <button onClick={() => handleDelete(u.id)} className={btnCls("danger")}>
                ✕ Delete
              </button>
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
              <ReactMarkdown>{cleanAgentOutput(u.deepResearch)}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ─── Page Layout ─── */
  return (
    <div className={`min-h-screen ${pageBg}`}>
      <div className="w-full px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-2xl font-bold ${titleCls}`}>AI Updates</h1>
        </div>

        {/* Tabs */}
        <div className={`inline-flex gap-1 p-1 rounded-xl mb-6 ${isDark ? "bg-white/5" : "bg-gray-100"}`}>
          <button onClick={() => { setActiveTab("inbox"); setRelevanceFilter("all"); }} className={tabCls("inbox")}>
            📥 AI Updates {counts.inbox > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-600"}`}>{counts.inbox}</span>}
          </button>
          <button onClick={() => setActiveTab("for_2fly")} className={tabCls("for_2fly")}>
            ⭐ AI for 2Fly {counts.for_2fly > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-600"}`}>{counts.for_2fly}</span>}
          </button>
          <button onClick={() => setActiveTab("archived")} className={tabCls("archived")}>
            📦 Archive {counts.archived > 0 && <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-gray-500/20 text-gray-500" : "bg-gray-200 text-gray-500"}`}>{counts.archived}</span>}
          </button>
        </div>

        {/* Relevance sub-filter (inbox only) */}
        {activeTab === "inbox" && (
          <div className="flex gap-1 mb-4">
            {(["all", "high", "medium", "low"] as const).map((r) => (
              <button key={r} onClick={() => setRelevanceFilter(r)} className={pillCls(relevanceFilter === r)}>
                {r === "all" ? "All" : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && <div className={`text-sm ${subtleCls}`}>Loading...</div>}

        {/* Empty States */}
        {!loading && filtered.length === 0 && (
          <div className={`${cardCls} text-center py-12`}>
            <div className="text-3xl mb-3">
              {activeTab === "inbox" ? "📥" : activeTab === "for_2fly" ? "⭐" : "📦"}
            </div>
            <div className={`text-sm ${subtleCls}`}>
              {activeTab === "inbox" && "Inbox clear. New updates from Research Intel will appear here."}
              {activeTab === "for_2fly" && "No items yet. Send relevant updates here from the inbox."}
              {activeTab === "archived" && "Nothing archived yet."}
            </div>
          </div>
        )}

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map(renderCard)}
        </div>
      </div>
    </div>
  );
}
