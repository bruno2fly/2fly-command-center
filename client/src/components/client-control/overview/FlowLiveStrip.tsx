"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "";

interface FlowPortal {
  connected: boolean;
  kpis?: { scheduled: number; waitingApproval: number; missingAssets: number; frustration: number };
  approvals?: Array<{ id: string; status: string; title?: string; caption?: string; media?: string[] }>;
  requests?: Array<{ id: string; type?: string; details?: string; by?: string; status?: string }>;
}

interface FlowTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline: string;
  designerId: string;
}

interface FlowData {
  connected: boolean;
  portalState?: FlowPortal;
  tasks?: FlowTask[];
  scheduledPosts?: Array<{ id: string; caption: string; scheduledAt: string; status: string; platforms: string[] }>;
}

const STATUS_EMOJI: Record<string, string> = {
  assigned: "📝",
  in_progress: "🔨",
  review: "👀",
  approved: "✅",
  changes_requested: "🔄",
  ready_to_post: "🚀",
};

export function FlowLiveStrip({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/flow/data/${clientId}`);
      const d = await res.json();
      setData(d);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return null;
  if (!data?.connected) return null;

  const ps = data.portalState;
  const kpis = ps?.kpis || { scheduled: 0, waitingApproval: 0, missingAssets: 0, frustration: 0 };
  const approvals = ps?.approvals || [];
  const requests = ps?.requests || [];
  const tasks = data.tasks || [];
  const posts = data.scheduledPosts || [];
  const openRequests = requests.filter(r => r.status !== "done");
  const pendingApprovals = approvals.filter(a => a.status === "pending" || a.status === "copy_pending");
  const inReview = tasks.filter(t => t.status === "review");
  const inProgress = tasks.filter(t => t.status === "in_progress" || t.status === "assigned");

  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subTextCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const accentCls = isDark ? "text-emerald-400" : "text-emerald-600";

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          🔄 2FLY Flow — Live
        </h2>
        <span className={`text-xs ${accentCls}`}>● Connected</span>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "Scheduled", value: kpis.scheduled, emoji: "📅", alert: false },
          { label: "Waiting Approval", value: kpis.waitingApproval, emoji: "⏳", alert: kpis.waitingApproval > 0 },
          { label: "Missing Assets", value: kpis.missingAssets, emoji: "📎", alert: kpis.missingAssets > 0 },
          { label: "Open Requests", value: openRequests.length, emoji: "📩", alert: openRequests.length > 0 },
        ].map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border p-3 ${cardCls} ${kpi.alert && kpi.value > 0 ? isDark ? "ring-1 ring-amber-500/30" : "ring-1 ring-amber-300" : ""}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{kpi.emoji}</span>
              <div>
                <div className={`text-lg font-bold ${kpi.alert && kpi.value > 0 ? isDark ? "text-amber-400" : "text-amber-600" : textCls}`}>{kpi.value}</div>
                <div className={`text-xs ${subTextCls}`}>{kpi.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Items — things that need attention */}
      {(pendingApprovals.length > 0 || inReview.length > 0 || openRequests.length > 0) && (
        <div className={`rounded-xl border p-4 ${cardCls}`}>
          <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>⚡ Needs Attention</h3>
          <div className="space-y-2">
            {pendingApprovals.map((a) => (
              <div key={a.id} className={`flex items-center gap-2 py-1 ${textCls}`}>
                <span className="text-xs">⏳</span>
                <span className="text-sm flex-1">{a.title || a.caption?.slice(0, 60) || "Approval pending"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"}`}>
                  {a.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
            {inReview.map((t) => (
              <div key={t.id} className={`flex items-center gap-2 py-1 ${textCls}`}>
                <span className="text-xs">👀</span>
                <span className="text-sm flex-1">{t.title} — ready for review</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"}`}>review</span>
              </div>
            ))}
            {openRequests.slice(0, 3).map((r) => (
              <div key={r.id} className={`flex items-center gap-2 py-1 ${textCls}`}>
                <span className="text-xs">📩</span>
                <span className="text-sm flex-1">{r.details?.slice(0, 60) || r.type || "Client request"}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700"}`}>open</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Production Pipeline */}
      {tasks.length > 0 && (
        <div className={`rounded-xl border p-4 ${cardCls}`}>
          <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>🎨 Production Pipeline</h3>
          <div className="space-y-1.5">
            {tasks.slice(0, 6).map((t) => (
              <div key={t.id} className={`flex items-center gap-2 py-1 ${textCls}`}>
                <span className="text-xs">{STATUS_EMOJI[t.status] || "⚪"}</span>
                <span className="text-sm flex-1 truncate">{t.title}</span>
                <span className={`text-xs ${subTextCls}`}>{t.designerId}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-100 text-gray-600"}`}>
                  {t.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scheduled Posts */}
      {posts.length > 0 && (
        <div className={`rounded-xl border p-4 ${cardCls}`}>
          <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>📅 Upcoming Posts</h3>
          <div className="space-y-1.5">
            {posts.slice(0, 5).map((p) => (
              <div key={p.id} className={`flex items-center gap-2 py-1 ${textCls}`}>
                <span className="text-xs">📌</span>
                <span className="text-sm flex-1 truncate">{p.caption.slice(0, 60)}</span>
                <span className={`text-xs ${subTextCls}`}>{p.platforms.join(", ")}</span>
                <span className={`text-xs ${subTextCls}`}>{new Date(p.scheduledAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
