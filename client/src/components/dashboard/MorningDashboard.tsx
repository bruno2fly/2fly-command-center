"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface MorningData {
  greeting: string;
  date: string;
  time: string;
  stats: {
    totalClients: number;
    activeClients: number;
    redClients: number;
    yellowClients: number;
    pendingApprovals: number;
    openRequests: number;
    activeTasks: number;
    scheduledPosts: number;
    unreadUpdates: number;
    pendingActions: number;
    metaConnected: number;
    flowConnected: number;
  };
  needsAttention: Array<{ clientId: string; clientName: string; type: string; message: string; urgency: string }>;
  redClients: Array<{ id: string; name: string; healthStatus: string }>;
  yellowClients: Array<{ id: string; name: string; healthStatus: string }>;
  pendingApprovals: Array<{ clientId: string; clientName: string; id: string; title: string; status: string; media?: string[] }>;
  openRequests: Array<{ clientId: string; clientName: string; type: string; details: string; by: string; createdAt: any }>;
  productionPipeline: Array<{ clientId: string; clientName: string; title: string; status: string; designerId: string; deadline: string; priority: string }>;
  aiUpdates: Array<{ id: string; title: string; source: string; createdAt: string }>;
  pendingAgentActions: Array<{ id: string; type: string; description: string; clientId: string }>;
  clientHealth: Array<{ id: string; name: string; healthStatus: string; monthlyRetainer: number; flowConnected: boolean }>;
  team: Array<{ id: string; name: string; role: string }>;
}

const STATUS_EMOJI: Record<string, string> = {
  assigned: "📝", in_progress: "🔨", review: "👀", changes_requested: "🔄",
  copy_pending: "✏️", pending: "⏳", approved: "✅", ready_to_post: "🚀",
};
const PRIORITY_EMOJI: Record<string, string> = { urgent: "🔴", high: "🟠", medium: "🟡", low: "🟢" };
const HEALTH_EMOJI: Record<string, string> = { red: "🔴", critical: "🔴", yellow: "🟡", warning: "🟡", green: "🟢", healthy: "🟢" };

const anim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };

export function MorningDashboard() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<MorningData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/morning`);
      setData(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const bg = isDark ? "bg-[#08080c]" : "bg-gray-50";
  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const accentCls = isDark ? "text-emerald-400" : "text-emerald-600";

  if (loading) return (
    <div className={`min-h-screen ${bg} p-6`}>
      <div className="mx-auto max-w-5xl space-y-4">
        {[1,2,3,4].map(i => <div key={i} className="animate-pulse rounded-xl border border-[#1a1810] bg-[#0d0d0f] h-24" />)}
      </div>
    </div>
  );

  if (!data) return <div className={`min-h-screen ${bg} p-6 text-center ${subCls}`}>Failed to load</div>;

  const s = data.stats;
  const hasUrgent = s.redClients > 0 || s.pendingApprovals > 0 || s.openRequests > 0;

  return (
    <div className={`min-h-screen ${bg} p-4 sm:p-6`}>
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-5xl space-y-6">

        {/* Header */}
        <motion.div variants={anim} className={`rounded-2xl border p-6 ${cardCls}`}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${textCls}`}>{data.greeting} {data.greeting.includes('morning') ? '☀️' : data.greeting.includes('afternoon') ? '🌤️' : data.greeting.includes('evening') ? '🌅' : data.greeting.includes('night') ? '🌙' : '🦉'}</h1>
              <p className={`text-sm mt-1 ${subCls}`}>{data.date}</p>
            </div>
            <button onClick={() => { setLoading(true); fetchData(); }}
              className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-[#1a1810] text-[#8a7e6d] hover:text-[#c4b8a8]" : "bg-gray-100 text-gray-500"}`}>
              🔄 Refresh
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
            {[
              { label: "Clients", value: s.activeClients, emoji: "👥" },
              { label: "Pending Approvals", value: s.pendingApprovals, emoji: "⏳", alert: s.pendingApprovals > 0 },
              { label: "Open Requests", value: s.openRequests, emoji: "📩", alert: s.openRequests > 0 },
              { label: "In Production", value: s.activeTasks, emoji: "🎨" },
              { label: "Scheduled", value: s.scheduledPosts, emoji: "📅" },
              { label: "AI Updates", value: s.unreadUpdates, emoji: "🤖", alert: s.unreadUpdates > 0 },
            ].map(k => (
              <div key={k.label} className={`rounded-xl border px-3 py-2.5 ${cardCls} ${k.alert ? isDark ? "ring-1 ring-amber-500/30" : "ring-1 ring-amber-300" : ""}`}>
                <div className={`text-lg font-bold ${k.alert ? isDark ? "text-amber-400" : "text-amber-600" : textCls}`}>{k.emoji} {k.value}</div>
                <div className={`text-xs ${subCls}`}>{k.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 🔴 Red Clients */}
        {data.redClients.length > 0 && (
          <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls} ring-1 ${isDark ? "ring-red-500/30" : "ring-red-300"}`}>
            <h2 className={`text-sm font-semibold mb-3 ${isDark ? "text-red-400" : "text-red-600"}`}>🔴 Critical — {data.redClients.length} Client{data.redClients.length > 1 ? "s" : ""}</h2>
            <div className="space-y-2">
              {data.redClients.map(c => (
                <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-gray-50"}`}>
                  <span className={`text-sm font-medium ${textCls}`}>{c.name}</span>
                  <span className={`text-xs ${isDark ? "text-red-400" : "text-red-600"}`}>{c.healthStatus}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ⏳ Pending Approvals */}
        {data.pendingApprovals.length > 0 && (
          <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
            <h2 className={`text-sm font-semibold mb-3 ${textCls}`}>⏳ Pending Approvals ({data.pendingApprovals.length})</h2>
            <div className="space-y-2">
              {data.pendingApprovals.map(a => (
                <div key={a.id} onClick={() => router.push(`/clients/${a.clientId}`)}
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-gray-50"}`}>
                  {a.media?.[0] && <img src={a.media[0]} alt="" className="w-10 h-10 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${textCls}`}>{a.title}</div>
                    <div className={`text-xs ${subCls}`}>{a.clientName} · {a.status.replace(/_/g, ' ')}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                    {STATUS_EMOJI[a.status] || "⏳"} {a.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 📩 Open Client Requests */}
        {data.openRequests.length > 0 && (
          <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
            <h2 className={`text-sm font-semibold mb-3 ${textCls}`}>📩 Open Requests ({data.openRequests.length})</h2>
            <div className="space-y-2">
              {data.openRequests.map((r, i) => (
                <div key={i} onClick={() => router.push(`/clients/${r.clientId}`)}
                  className={`py-2 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-gray-50"}`}>
                  <div className={`text-sm ${textCls}`}><span className="font-medium">{r.clientName}</span> — {r.type}</div>
                  <div className={`text-xs mt-0.5 ${subCls}`}>{r.details} · By {r.by}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🎨 Production Pipeline */}
        {data.productionPipeline.length > 0 && (
          <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
            <h2 className={`text-sm font-semibold mb-3 ${textCls}`}>🎨 Production Pipeline ({data.productionPipeline.length})</h2>
            <div className="space-y-2">
              {data.productionPipeline.map((t, i) => (
                <div key={i} onClick={() => router.push(`/clients/${t.clientId}`)}
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-gray-50"}`}>
                  <span>{PRIORITY_EMOJI[t.priority] || "⚪"}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium truncate ${textCls}`}>{t.title}</div>
                    <div className={`text-xs ${subCls}`}>{t.clientName} · {t.designerId} · Due {t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-100 text-gray-600"}`}>
                    {STATUS_EMOJI[t.status] || "⚪"} {t.status.replace(/_/g, ' ')}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🤖 AI Updates */}
        {data.aiUpdates.length > 0 && (
          <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className={`text-sm font-semibold ${textCls}`}>🤖 Unread AI Updates ({data.aiUpdates.length})</h2>
              <button onClick={() => router.push('/ai-updates')}
                className={`text-xs ${accentCls} hover:underline`}>View all →</button>
            </div>
            <div className="space-y-2">
              {data.aiUpdates.slice(0, 5).map(u => (
                <div key={u.id} onClick={() => router.push('/ai-updates')}
                  className={`py-2 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-gray-50"}`}>
                  <div className={`text-sm ${textCls}`}>{u.title}</div>
                  <div className={`text-xs ${subCls}`}>{u.source} · {new Date(u.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 🟡 Yellow Clients */}
        {data.yellowClients.length > 0 && (
          <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
            <h2 className={`text-sm font-semibold mb-3 ${isDark ? "text-amber-400" : "text-amber-600"}`}>🟡 Needs Attention — {data.yellowClients.length} Client{data.yellowClients.length > 1 ? "s" : ""}</h2>
            <div className="flex flex-wrap gap-2">
              {data.yellowClients.map(c => (
                <button key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                  className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* 👥 All Clients Health */}
        <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
          <h2 className={`text-sm font-semibold mb-3 ${textCls}`}>👥 Client Health ({data.clientHealth.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {data.clientHealth.map(c => (
              <div key={c.id} onClick={() => router.push(`/clients/${c.id}`)}
                className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-gray-50"}`}>
                <div className="flex items-center gap-2">
                  <span>{HEALTH_EMOJI[c.healthStatus] || "⚪"}</span>
                  <span className={`text-sm ${textCls}`}>{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {c.flowConnected && <span className={`text-xs ${accentCls}`}>🔄</span>}
                  <span className={`text-xs ${subCls}`}>${c.monthlyRetainer}/mo</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
