"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ClientAction {
  type: "urgent" | "action" | "info" | "win";
  category: string;
  title: string;
  detail: string;
  canAutoExecute: boolean;
  executePrompt?: string;
}

interface ClientBoard {
  id: string;
  name: string;
  health: string;
  status: string;
  retainer: number;
  actions: ClientAction[];
  wins: string[];
}

interface BoardData {
  summary: { total: number; red: number; yellow: number; green: number; totalActions: number; urgentActions: number };
  board: ClientBoard[];
}

const HEALTH_EMOJI: Record<string, string> = { red: "🔴", yellow: "🟡", green: "🟢", unknown: "⚪" };
const TYPE_STYLES: Record<string, { dark: string; light: string; icon: string }> = {
  urgent: { dark: "border-red-500/30 bg-red-500/5", light: "border-red-200 bg-red-50", icon: "🚨" },
  action: { dark: "border-amber-500/30 bg-amber-500/5", light: "border-amber-200 bg-amber-50", icon: "⚡" },
  info: { dark: "border-blue-500/30 bg-blue-500/5", light: "border-blue-200 bg-blue-50", icon: "ℹ️" },
  win: { dark: "border-emerald-500/30 bg-emerald-500/5", light: "border-emerald-200 bg-emerald-50", icon: "✅" },
};
const CAT_EMOJI: Record<string, string> = { ads: "📊", content: "📝", production: "🏭", strategy: "🎯", technical: "🔧", billing: "💰" };

export default function ActionBoardPage() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "red" | "yellow" | "green">("all");
  const [executing, setExecuting] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/action-board`);
      setData(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  const executeAction = async (clientId: string, clientName: string, action: ClientAction) => {
    if (!action.canAutoExecute || !action.executePrompt) return;
    setExecuting(`${clientId}-${action.title}`);
    try {
      await fetch(`${API}/api/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "founder-boss", message: action.executePrompt, clientId }),
      });
    } catch { /* */ }
    finally { setExecuting(null); }
  };

  const bg = isDark ? "bg-[#08080c]" : "bg-gray-50";
  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1a22]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  if (loading) return <div className={`min-h-screen ${bg} flex items-center justify-center ${subCls}`}>Loading Action Board...</div>;
  if (!data) return <div className={`min-h-screen ${bg} flex items-center justify-center ${subCls}`}>Failed to load</div>;

  const filtered = filter === "all" ? data.board : data.board.filter(c => c.health === filter);

  return (
    <div className={`min-h-screen ${bg} p-6`}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl font-bold ${textCls}`}>Client Action Board</h1>
            <p className={`text-sm mt-1 ${subCls}`}>Every client. What needs doing. Priority order.</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className={`text-sm px-3 py-1.5 rounded-lg ${isDark ? "bg-[#0f0f14] text-[#8a7e6d]" : "bg-white text-gray-500"} border ${isDark ? "border-[#1a1a22]" : "border-gray-200"}`}>
            ← Dashboard
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Total Clients", value: data.summary.total, color: "text-[#c4b8a8]" },
            { label: "🔴 Red", value: data.summary.red, color: "text-red-400" },
            { label: "🟡 Yellow", value: data.summary.yellow, color: "text-amber-400" },
            { label: "🟢 Green", value: data.summary.green, color: "text-emerald-400" },
            { label: "🚨 Urgent", value: data.summary.urgentActions, color: "text-red-400" },
          ].map(kpi => (
            <div key={kpi.label} className={`rounded-xl border p-4 ${cardCls}`}>
              <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className={`text-xs ${subCls}`}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["all", "red", "yellow", "green"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                filter === f
                  ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                  : isDark ? "text-[#5a5040]" : "text-gray-500"
              }`}>
              {f === "all" ? `All (${data.board.length})` : `${HEALTH_EMOJI[f]} ${f.charAt(0).toUpperCase() + f.slice(1)} (${data.board.filter(c => c.health === f).length})`}
            </button>
          ))}
        </div>

        {/* Client Cards */}
        <div className="space-y-4">
          {filtered.map(client => (
            <div key={client.id} className={`rounded-xl border ${cardCls} overflow-hidden`}>
              {/* Client Header */}
              <div className={`flex items-center justify-between p-4 border-b ${isDark ? "border-[#1a1a22]" : "border-gray-100"} cursor-pointer`}
                onClick={() => router.push(`/clients/${client.id}`)}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">{HEALTH_EMOJI[client.health] || "⚪"}</span>
                  <div>
                    <h3 className={`text-sm font-bold ${textCls}`}>{client.name}</h3>
                    <p className={`text-xs ${subCls}`}>
                      {client.retainer > 0 ? `$${client.retainer}/mo` : "No retainer"} · {client.actions.length} action{client.actions.length !== 1 ? "s" : ""}
                      {client.wins.length > 0 && ` · ${client.wins.length} win${client.wins.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {client.actions.filter(a => a.type === "urgent").length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-600"}`}>
                      {client.actions.filter(a => a.type === "urgent").length} urgent
                    </span>
                  )}
                  <svg className={`w-4 h-4 ${subCls}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Actions */}
              {client.actions.length > 0 && (
                <div className="p-3 space-y-2">
                  {client.actions.map((action, i) => {
                    const style = TYPE_STYLES[action.type] || TYPE_STYLES.info;
                    const execKey = `${client.id}-${action.title}`;
                    return (
                      <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${isDark ? style.dark : style.light}`}>
                        <span className="text-sm mt-0.5">{style.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? "bg-[#1a1a22] text-[#8a7e6d]" : "bg-gray-100 text-gray-500"}`}>
                              {CAT_EMOJI[action.category] || "📋"} {action.category}
                            </span>
                            <span className={`text-sm font-medium ${textCls}`}>{action.title}</span>
                          </div>
                          <p className={`text-xs mt-1 ${subCls}`}>{action.detail}</p>
                        </div>
                        {action.canAutoExecute && (
                          <button
                            onClick={(e) => { e.stopPropagation(); executeAction(client.id, client.name, action); }}
                            disabled={executing === execKey}
                            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg ${
                              executing === execKey
                                ? "bg-amber-500/20 text-amber-400 animate-pulse"
                                : isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            }`}
                          >
                            {executing === execKey ? "⏳" : "⚡ Execute"}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {/* Wins */}
                  {client.wins.map((win, i) => (
                    <div key={`win-${i}`} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${isDark ? "bg-emerald-500/5 border border-emerald-500/20" : "bg-emerald-50 border border-emerald-200"}`}>
                      <span className="text-sm">✅</span>
                      <span className={`text-sm ${isDark ? "text-emerald-400" : "text-emerald-700"}`}>{win}</span>
                    </div>
                  ))}
                </div>
              )}

              {client.actions.length === 0 && client.wins.length === 0 && (
                <div className={`p-3 text-center text-xs ${subCls}`}>No actions needed</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
