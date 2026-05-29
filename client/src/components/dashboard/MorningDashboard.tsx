"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "";

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

const HEALTH_DOT: Record<string, string> = {
  red: "bg-red-500", critical: "bg-red-500",
  yellow: "bg-amber-400", warning: "bg-amber-400",
  green: "bg-emerald-400", healthy: "bg-emerald-400",
};

const anim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const stagger = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export function MorningDashboard() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [data, setData] = useState<MorningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [brief, setBrief] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/morning`);
      setData(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  const fetchBrief = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/briefs?type=morning&limit=1`);
      if (!res.ok) throw new Error();
      const json = await res.json();
      const briefs = Array.isArray(json) ? json : json.briefs ?? [];
      setBrief(briefs[0]?.content ?? briefs[0]?.text ?? null);
    } catch {
      try {
        const res = await fetch(`${API}/api/dashboard/brief`);
        if (!res.ok) throw new Error();
        const json = await res.json();
        setBrief(json.content ?? json.text ?? null);
      } catch { /* no brief */ }
    }
  }, []);

  useEffect(() => { fetchData(); fetchBrief(); }, [fetchData, fetchBrief]);

  const bg = isDark ? "bg-[#08080c]" : "bg-gray-50";
  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const dividerCls = isDark ? "border-[#1a1810]" : "border-gray-100";

  if (loading) return (
    <div className={`min-h-screen ${bg} p-6`}>
      <div className="mx-auto max-w-4xl space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="animate-pulse rounded-xl border border-[#1a1810] bg-[#0d0d0f] h-24" />
        ))}
      </div>
    </div>
  );

  if (!data) return <div className={`min-h-screen ${bg} p-6 text-center ${subCls}`}>Failed to load</div>;

  const s = data.stats;
  const totalMRR = data.clientHealth.reduce((sum, c) => sum + (c.monthlyRetainer || 0), 0);

  return (
    <div className={`min-h-screen ${bg} p-4 sm:p-6`}>
      <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto max-w-4xl space-y-5">

        {/* Header */}
        <motion.div variants={anim} className={`rounded-2xl border p-6 ${cardCls}`}>
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className={`text-2xl font-bold ${textCls}`}>{data.greeting}, Bruno</h1>
              <p className={`text-sm mt-1 ${subCls}`}>{data.date}</p>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData(); fetchBrief(); }}
              className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "bg-[#1a1810] text-[#8a7e6d] hover:text-[#c4b8a8]" : "bg-gray-100 text-gray-500 hover:text-gray-700"}`}
            >
              Refresh
            </button>
          </div>

          {/* Quick Stats — 3 numbers only */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`rounded-xl border px-4 py-3 ${isDark ? "bg-[#0d0d0f] border-red-500/20" : "bg-red-50 border-red-200"}`}>
              <div className={`text-2xl font-bold ${s.redClients > 0 ? isDark ? "text-red-400" : "text-red-600" : textCls}`}>
                {s.redClients}
              </div>
              <div className={`text-xs mt-0.5 ${subCls}`}>Critical Clients</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-gray-50 border-gray-200"} ${s.pendingApprovals > 0 ? isDark ? "ring-1 ring-amber-500/30" : "ring-1 ring-amber-200" : ""}`}>
              <div className={`text-2xl font-bold ${s.pendingApprovals > 0 ? isDark ? "text-amber-400" : "text-amber-600" : textCls}`}>
                {s.pendingApprovals}
              </div>
              <div className={`text-xs mt-0.5 ${subCls}`}>Pending Approvals</div>
            </div>
            <div className={`rounded-xl border px-4 py-3 ${isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-gray-50 border-gray-200"}`}>
              <div className={`text-2xl font-bold ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                ${totalMRR.toLocaleString()}
              </div>
              <div className={`text-xs mt-0.5 ${subCls}`}>Total MRR</div>
            </div>
          </div>
        </motion.div>

        {/* Critical Clients — RED only */}
        {data.redClients.length > 0 && (
          <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls} ring-1 ${isDark ? "ring-red-500/25" : "ring-red-200"}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-red-400" : "text-red-600"}`}>
              Critical — {data.redClients.length} client{data.redClients.length > 1 ? "s" : ""}
            </h2>
            <div className="space-y-1">
              {data.redClients.map(c => (
                <div
                  key={c.id}
                  onClick={() => router.push(`/clients/${c.id}`)}
                  className={`flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-red-50"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                    <span className={`text-sm font-medium ${textCls}`}>{c.name}</span>
                  </div>
                  <span className={`text-xs ${isDark ? "text-red-400/70" : "text-red-500"}`}>{c.healthStatus}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Boss Daily Brief */}
        <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subCls}`}>Daily Brief</h2>
          {brief ? (
            <p className={`text-sm leading-relaxed ${textCls}`}>{brief}</p>
          ) : (
            <p className={`text-sm ${subCls}`}>Brief will appear here after 9am.</p>
          )}
        </motion.div>

        {/* Client Health Grid */}
        <motion.div variants={anim} className={`rounded-2xl border p-5 ${cardCls}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subCls}`}>
            Client Health — {data.clientHealth.length} clients
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
            {data.clientHealth.map((c, i) => (
              <div
                key={c.id}
                onClick={() => router.push(`/clients/${c.id}`)}
                className={`flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-[#1a1810]" : "hover:bg-gray-50"}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${HEALTH_DOT[c.healthStatus] ?? "bg-gray-400"}`} />
                  <span className={`text-sm ${textCls}`}>{c.name}</span>
                </div>
                <span className={`text-xs tabular-nums ${subCls}`}>
                  ${c.monthlyRetainer?.toLocaleString() ?? 0}/mo
                </span>
              </div>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
