"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface FlowApproval {
  id: string;
  contentId?: string;
  title?: string;
  caption?: string;
  status: string;
  media?: string[];
  type?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface FlowRequest {
  id: string;
  details?: string;
  type?: string;
  by?: string;
  status?: string;
  link?: string;
  images?: string[];
  createdAt?: number | string;
  doneAt?: number | string;
}

interface FlowTask {
  id: string;
  clientId: string;
  title: string;
  caption: string;
  status: string;
  priority: string;
  deadline: string;
  designerId: string;
  finalArt: string[];
  createdAt: string;
  updatedAt: string;
}

interface FlowActivity {
  when: number;
  text: string;
}

interface FlowData {
  connected: boolean;
  message?: string;
  portalState?: {
    client: { id: string; name: string };
    kpis: { scheduled: number; waitingApproval: number; missingAssets: number; frustration: number };
    approvals: FlowApproval[];
    requests: FlowRequest[];
    activity: FlowActivity[];
  };
  tasks: FlowTask[];
  scheduledPosts: Array<{
    id: string;
    caption: string;
    mediaUrl: string;
    platforms: string[];
    scheduledAt: string;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
  approved: { bg: "bg-emerald-100", text: "text-emerald-700", darkBg: "bg-emerald-500/20", darkText: "text-emerald-400" },
  pending: { bg: "bg-amber-100", text: "text-amber-700", darkBg: "bg-amber-500/20", darkText: "text-amber-400" },
  copy_pending: { bg: "bg-blue-100", text: "text-blue-700", darkBg: "bg-blue-500/20", darkText: "text-blue-400" },
  copy_approved: { bg: "bg-teal-100", text: "text-teal-700", darkBg: "bg-teal-500/20", darkText: "text-teal-400" },
  changes: { bg: "bg-red-100", text: "text-red-700", darkBg: "bg-red-500/20", darkText: "text-red-400" },
  changes_requested: { bg: "bg-red-100", text: "text-red-700", darkBg: "bg-red-500/20", darkText: "text-red-400" },
  assigned: { bg: "bg-gray-100", text: "text-gray-700", darkBg: "bg-gray-500/20", darkText: "text-gray-400" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-700", darkBg: "bg-blue-500/20", darkText: "text-blue-400" },
  review: { bg: "bg-purple-100", text: "text-purple-700", darkBg: "bg-purple-500/20", darkText: "text-purple-400" },
  ready_to_post: { bg: "bg-emerald-100", text: "text-emerald-700", darkBg: "bg-emerald-500/20", darkText: "text-emerald-400" },
  open: { bg: "bg-blue-100", text: "text-blue-700", darkBg: "bg-blue-500/20", darkText: "text-blue-400" },
  done: { bg: "bg-gray-100", text: "text-gray-600", darkBg: "bg-gray-500/20", darkText: "text-gray-400" },
  scheduled: { bg: "bg-indigo-100", text: "text-indigo-700", darkBg: "bg-indigo-500/20", darkText: "text-indigo-400" },
  published: { bg: "bg-green-100", text: "text-green-700", darkBg: "bg-green-500/20", darkText: "text-green-400" },
};

function StatusBadge({ status, isDark }: { status: string; isDark: boolean }) {
  const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
      isDark ? `${colors.darkBg} ${colors.darkText}` : `${colors.bg} ${colors.text}`
    }`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

const PRIORITY_EMOJI: Record<string, string> = {
  urgent: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "🟢",
};

export function ClientFlowTab({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"overview" | "approvals" | "tasks" | "requests">("overview");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/flow/data/${clientId}`);
      const d = await res.json();
      setData(d);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subTextCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  if (loading) return <div className={`p-8 text-center ${subTextCls}`}>Loading 2FLY Flow data...</div>;

  if (!data?.connected) {
    return (
      <div className={`p-8 text-center ${subTextCls}`}>
        <div className="text-4xl mb-3">🔗</div>
        <p className="text-sm">{data?.message || "Not connected to 2FLY Flow"}</p>
        <p className="text-xs mt-2">Map this client to a Flow client in Settings.</p>
      </div>
    );
  }

  if (error) return <div className="p-8 text-center text-red-400">{error}</div>;

  const ps = data.portalState;
  const kpis = ps?.kpis || { scheduled: 0, waitingApproval: 0, missingAssets: 0, frustration: 0 };
  const approvals = ps?.approvals || [];
  const requests = ps?.requests || [];
  const activity = ps?.activity || [];
  const tasks = data.tasks || [];
  const posts = data.scheduledPosts || [];

  const openRequests = requests.filter(r => r.status !== "done");
  const doneRequests = requests.filter(r => r.status === "done");

  const sections = [
    { id: "overview" as const, label: "Overview", emoji: "📊" },
    { id: "approvals" as const, label: `Approvals (${approvals.length})`, emoji: "✅" },
    { id: "tasks" as const, label: `Production (${tasks.length})`, emoji: "🎨" },
    { id: "requests" as const, label: `Open Requests (${openRequests.length})`, emoji: "📩" },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Section tabs */}
      <div className={`flex gap-1 px-4 pt-3 pb-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              activeSection === s.id
                ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                : isDark ? "text-[#5a5040] hover:text-[#8a7e6d]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.emoji} {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Scheduled", value: kpis.scheduled, emoji: "📅", color: "indigo" },
                { label: "Waiting Approval", value: kpis.waitingApproval, emoji: "⏳", color: "amber" },
                { label: "Missing Assets", value: kpis.missingAssets, emoji: "📎", color: "red" },
                { label: "Frustration", value: kpis.frustration, emoji: kpis.frustration > 0 ? "😤" : "😊", color: kpis.frustration > 0 ? "red" : "emerald" },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-xl border p-4 ${cardCls}`}>
                  <div className="text-2xl mb-1">{kpi.emoji}</div>
                  <div className={`text-2xl font-bold ${textCls}`}>{kpi.value}</div>
                  <div className={`text-xs ${subTextCls}`}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`rounded-xl border p-4 ${cardCls}`}>
                <div className={`text-lg font-bold ${textCls}`}>{approvals.length}</div>
                <div className={`text-xs ${subTextCls}`}>Total Approvals</div>
              </div>
              <div className={`rounded-xl border p-4 ${cardCls}`}>
                <div className={`text-lg font-bold ${textCls}`}>{tasks.length}</div>
                <div className={`text-xs ${subTextCls}`}>Production Tasks</div>
              </div>
              <div className={`rounded-xl border p-4 ${cardCls}`}>
                <div className={`text-lg font-bold ${textCls}`}>{requests.length}</div>
                <div className={`text-xs ${subTextCls}`}>Client Requests</div>
              </div>
            </div>

            {/* Scheduled Posts */}
            {posts.length > 0 && (
              <div className={`rounded-xl border p-4 ${cardCls}`}>
                <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>📅 Scheduled Posts</h3>
                <div className="space-y-2">
                  {posts.map((p) => (
                    <div key={p.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                      <div>
                        <div className={`text-sm ${textCls}`}>{p.caption.slice(0, 80)}{p.caption.length > 80 ? "..." : ""}</div>
                        <div className={`text-xs ${subTextCls}`}>{p.platforms.join(", ")} · {new Date(p.scheduledAt).toLocaleDateString()}</div>
                      </div>
                      <StatusBadge status={p.status} isDark={isDark} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Open Requests Preview */}
            {openRequests.length > 0 && (
              <div className={`rounded-xl border p-4 ${cardCls}`}>
                <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>📩 Open Requests</h3>
                <div className="space-y-2">
                  {openRequests.slice(0, 5).map((r) => (
                    <div key={r.id} className={`flex items-start justify-between py-2 border-b last:border-0 ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                      <div>
                        <div className={`text-sm font-medium ${textCls}`}>{r.type || "Request"}</div>
                        <div className={`text-xs ${subTextCls}`}>{r.details?.slice(0, 100) || ""}</div>
                        <div className={`text-xs mt-1 ${subTextCls}`}>By {r.by || "Client"} · {r.createdAt ? new Date(typeof r.createdAt === "number" ? r.createdAt : r.createdAt).toLocaleDateString() : ""}</div>
                      </div>
                      <StatusBadge status={r.status || "open"} isDark={isDark} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* APPROVALS */}
        {activeSection === "approvals" && (
          <div className="space-y-3">
            {approvals.length === 0 ? (
              <div className={`text-center py-8 ${subTextCls}`}>No approvals</div>
            ) : (
              approvals.map((a) => (
                <div key={a.id} className={`rounded-xl border p-4 ${cardCls}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${textCls}`}>{a.title || a.caption?.slice(0, 60) || "Untitled"}</div>
                      {a.caption && (
                        <div className={`text-xs mt-1 ${subTextCls}`}>{a.caption.slice(0, 150)}{a.caption.length > 150 ? "..." : ""}</div>
                      )}
                      {a.type && <div className={`text-xs mt-1 ${subTextCls}`}>Type: {a.type}</div>}
                    </div>
                    <StatusBadge status={a.status} isDark={isDark} />
                  </div>
                  {a.media && a.media.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {a.media.slice(0, 4).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                      ))}
                      {a.media.length > 4 && (
                        <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-sm font-medium ${isDark ? "bg-[#1a1810] text-[#5a5040]" : "bg-gray-100 text-gray-500"}`}>
                          +{a.media.length - 4}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* PRODUCTION TASKS */}
        {activeSection === "tasks" && (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className={`text-center py-8 ${subTextCls}`}>No production tasks</div>
            ) : (
              tasks.map((t) => (
                <div key={t.id} className={`rounded-xl border p-4 ${cardCls}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span>{PRIORITY_EMOJI[t.priority] || "⚪"}</span>
                        <span className={`text-sm font-medium ${textCls}`}>{t.title}</span>
                      </div>
                      {t.caption && <div className={`text-xs mt-1 ${subTextCls}`}>{t.caption.slice(0, 120)}</div>}
                      <div className={`text-xs mt-2 flex gap-3 ${subTextCls}`}>
                        <span>📅 {new Date(t.deadline).toLocaleDateString()}</span>
                        <span>🎨 {t.designerId}</span>
                      </div>
                    </div>
                    <StatusBadge status={t.status} isDark={isDark} />
                  </div>
                  {t.finalArt && t.finalArt.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {t.finalArt.slice(0, 3).map((url, i) => (
                        <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* REQUESTS */}
        {activeSection === "requests" && (
          <div className="space-y-3">
            {openRequests.length === 0 && doneRequests.length === 0 ? (
              <div className={`text-center py-8 ${subTextCls}`}>No client requests</div>
            ) : (
              <>
                {openRequests.map((r) => (
                  <div key={r.id} className={`rounded-xl border p-4 ${cardCls}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className={`text-sm font-medium ${textCls}`}>{r.type || "Request"}</div>
                        <div className={`text-sm mt-1 ${textCls}`}>{r.details || "No details"}</div>
                        {r.link && <a href={r.link} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1 block">🔗 {r.link.slice(0, 60)}...</a>}
                        <div className={`text-xs mt-2 ${subTextCls}`}>
                          By {r.by || "Client"} · {r.createdAt ? new Date(typeof r.createdAt === "number" ? r.createdAt : r.createdAt).toLocaleDateString() : ""}
                        </div>
                      </div>
                      <StatusBadge status="open" isDark={isDark} />
                    </div>
                    {r.images && r.images.length > 0 && (
                      <div className={`text-xs mt-2 ${subTextCls}`}>📎 {r.images.length} attachment(s)</div>
                    )}
                  </div>
                ))}
                {doneRequests.length > 0 && (
                  <details className="mt-4">
                    <summary className={`text-xs cursor-pointer ${subTextCls}`}>Completed requests ({doneRequests.length})</summary>
                    <div className="space-y-3 mt-3">
                      {doneRequests.map((r) => (
                        <div key={r.id} className={`rounded-xl border p-4 opacity-60 ${cardCls}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${textCls}`}>{r.type || "Request"}</div>
                              <div className={`text-sm mt-1 ${textCls}`}>{r.details || "No details"}</div>
                              <div className={`text-xs mt-2 ${subTextCls}`}>
                                By {r.by || "Client"} · {r.createdAt ? new Date(typeof r.createdAt === "number" ? r.createdAt : r.createdAt).toLocaleDateString() : ""}
                              </div>
                            </div>
                            <StatusBadge status="done" isDark={isDark} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </>
            )}
          </div>
        )}


      </div>
    </div>
  );
}
