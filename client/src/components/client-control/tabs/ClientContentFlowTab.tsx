"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Approval {
  id: string;
  contentId?: string;
  title?: string;
  caption?: string;
  status: string;
  media?: string[];
  type?: string;
}

interface Task {
  id: string;
  title: string;
  caption: string;
  status: string;
  priority: string;
  deadline: string;
  designerId: string;
  finalArt: string[];
  updatedAt: string;
}

interface ScheduledPost {
  id: string;
  caption: string;
  mediaUrl: string;
  platforms: string[];
  scheduledAt: string;
  status: string;
}

interface FlowData {
  connected: boolean;
  portalState?: {
    kpis: { scheduled: number; waitingApproval: number; missingAssets: number; frustration: number };
    approvals: Approval[];
    requests: Array<{ id: string; details?: string; type?: string; by?: string; status?: string; createdAt?: number }>;
  };
  tasks: Task[];
  scheduledPosts: ScheduledPost[];
}

const TASK_STATUS_ORDER = ["assigned", "in_progress", "review", "changes_requested", "approved", "ready_to_post"];
const APPROVAL_STATUS_ORDER = ["copy_pending", "pending", "copy_approved", "changes", "approved"];

const STATUS_CONFIG: Record<string, { emoji: string; label: string; darkBg: string; darkText: string; bg: string; text: string }> = {
  // Approvals
  copy_pending: { emoji: "✏️", label: "Copy Pending", darkBg: "bg-blue-500/20", darkText: "text-blue-400", bg: "bg-blue-100", text: "text-blue-700" },
  pending: { emoji: "⏳", label: "Pending", darkBg: "bg-amber-500/20", darkText: "text-amber-400", bg: "bg-amber-100", text: "text-amber-700" },
  copy_approved: { emoji: "✅", label: "Copy Approved", darkBg: "bg-teal-500/20", darkText: "text-teal-400", bg: "bg-teal-100", text: "text-teal-700" },
  changes: { emoji: "🔄", label: "Changes", darkBg: "bg-red-500/20", darkText: "text-red-400", bg: "bg-red-100", text: "text-red-700" },
  approved: { emoji: "✅", label: "Approved", darkBg: "bg-emerald-500/20", darkText: "text-emerald-400", bg: "bg-emerald-100", text: "text-emerald-700" },
  // Tasks
  assigned: { emoji: "📝", label: "Assigned", darkBg: "bg-gray-500/20", darkText: "text-gray-400", bg: "bg-gray-100", text: "text-gray-700" },
  in_progress: { emoji: "🔨", label: "In Progress", darkBg: "bg-blue-500/20", darkText: "text-blue-400", bg: "bg-blue-100", text: "text-blue-700" },
  review: { emoji: "👀", label: "Review", darkBg: "bg-purple-500/20", darkText: "text-purple-400", bg: "bg-purple-100", text: "text-purple-700" },
  changes_requested: { emoji: "🔄", label: "Changes Req.", darkBg: "bg-red-500/20", darkText: "text-red-400", bg: "bg-red-100", text: "text-red-700" },
  ready_to_post: { emoji: "🚀", label: "Ready", darkBg: "bg-emerald-500/20", darkText: "text-emerald-400", bg: "bg-emerald-100", text: "text-emerald-700" },
  // Posts
  scheduled: { emoji: "📅", label: "Scheduled", darkBg: "bg-indigo-500/20", darkText: "text-indigo-400", bg: "bg-indigo-100", text: "text-indigo-700" },
  published: { emoji: "✅", label: "Published", darkBg: "bg-green-500/20", darkText: "text-green-400", bg: "bg-green-100", text: "text-green-700" },
  failed: { emoji: "❌", label: "Failed", darkBg: "bg-red-500/20", darkText: "text-red-400", bg: "bg-red-100", text: "text-red-700" },
};

function Badge({ status, isDark }: { status: string; isDark: boolean }) {
  const c = STATUS_CONFIG[status] || { emoji: "⚪", label: status, darkBg: "bg-gray-500/20", darkText: "text-gray-400", bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? `${c.darkBg} ${c.darkText}` : `${c.bg} ${c.text}`}`}>
      {c.emoji} {c.label}
    </span>
  );
}

const PRIORITY_EMOJI: Record<string, string> = { urgent: "🔴", high: "🟠", medium: "🟡", low: "🟢" };

type Section = "pipeline" | "approvals" | "production" | "scheduled";

export function ClientContentFlowTab({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [data, setData] = useState<FlowData | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("pipeline");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/flow/data/${clientId}`);
      setData(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  if (loading) return <div className={`p-8 text-center ${subCls}`}>Loading content data...</div>;
  if (!data?.connected) return (
    <div className={`p-8 text-center ${subCls}`}>
      <div className="text-4xl mb-3">📝</div>
      <p className="text-sm">{data?.message || "Not connected to 2FLY Flow"}</p>
    </div>
  );

  const approvals = data.portalState?.approvals || [];
  const tasks = data.tasks || [];
  const posts = data.scheduledPosts || [];
  const kpis = data.portalState?.kpis || { scheduled: 0, waitingApproval: 0, missingAssets: 0, frustration: 0 };

  // Group approvals by status
  const approvalsByStatus = APPROVAL_STATUS_ORDER.map(s => ({
    status: s,
    items: approvals.filter(a => a.status === s),
  })).filter(g => g.items.length > 0);

  // Group tasks by status
  const tasksByStatus = TASK_STATUS_ORDER.map(s => ({
    status: s,
    items: tasks.filter(t => t.status === s),
  })).filter(g => g.items.length > 0);

  const sections: { id: Section; label: string; count: number }[] = [
    { id: "pipeline", label: "📊 Pipeline", count: approvals.length + tasks.length },
    { id: "approvals", label: "✅ Approvals", count: approvals.length },
    { id: "production", label: "🎨 Production", count: tasks.length },
    { id: "scheduled", label: "📅 Calendar", count: posts.length },
  ];

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* KPI Bar */}
      <div className={`grid grid-cols-4 gap-2 px-4 pt-3 pb-2`}>
        {[
          { label: "Scheduled", value: kpis.scheduled, emoji: "📅" },
          { label: "Waiting", value: kpis.waitingApproval, emoji: "⏳" },
          { label: "In Production", value: tasks.length, emoji: "🎨" },
          { label: "Total Content", value: approvals.length, emoji: "📝" },
        ].map((k) => (
          <div key={k.label} className={`rounded-lg border px-3 py-2 ${cardCls}`}>
            <div className={`text-lg font-bold ${textCls}`}>{k.emoji} {k.value}</div>
            <div className={`text-xs ${subCls}`}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Section Tabs */}
      <div className={`flex gap-1 px-4 py-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        {sections.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
              section === s.id
                ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                : isDark ? "text-[#5a5040] hover:text-[#8a7e6d]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {s.label} ({s.count})
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* PIPELINE — Kanban-style overview */}
        {section === "pipeline" && (
          <div className="space-y-6">
            {/* Approvals pipeline */}
            {approvalsByStatus.length > 0 && (
              <div>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subCls}`}>Content Approvals</h3>
                <div className="space-y-2">
                  {approvalsByStatus.map((group) => (
                    <div key={group.status}>
                      <div className={`text-xs font-medium mb-1.5 ${subCls}`}>
                        {STATUS_CONFIG[group.status]?.emoji} {STATUS_CONFIG[group.status]?.label || group.status} ({group.items.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                        {group.items.map((a) => (
                          <div key={a.id} className={`rounded-lg border p-3 ${cardCls}`}>
                            <div className={`text-sm font-medium truncate ${textCls}`}>{a.title || a.caption?.slice(0, 50) || "Untitled"}</div>
                            {a.caption && <div className={`text-xs mt-1 truncate ${subCls}`}>{a.caption.slice(0, 80)}</div>}
                            {a.media && a.media.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {a.media.slice(0, 3).map((url, i) => (
                                  <img key={i} src={url} alt="" className="w-12 h-12 rounded object-cover" />
                                ))}
                                {a.media.length > 3 && <span className={`text-xs self-center ${subCls}`}>+{a.media.length - 3}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks pipeline */}
            {tasksByStatus.length > 0 && (
              <div>
                <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subCls}`}>Design Production</h3>
                <div className="space-y-2">
                  {tasksByStatus.map((group) => (
                    <div key={group.status}>
                      <div className={`text-xs font-medium mb-1.5 ${subCls}`}>
                        {STATUS_CONFIG[group.status]?.emoji} {STATUS_CONFIG[group.status]?.label || group.status} ({group.items.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 ml-4">
                        {group.items.map((t) => (
                          <div key={t.id} className={`rounded-lg border p-3 ${cardCls}`}>
                            <div className="flex items-center gap-2">
                              <span>{PRIORITY_EMOJI[t.priority] || "⚪"}</span>
                              <span className={`text-sm font-medium truncate ${textCls}`}>{t.title}</span>
                            </div>
                            <div className={`text-xs mt-1 flex gap-3 ${subCls}`}>
                              <span>🎨 {t.designerId}</span>
                              <span>📅 {new Date(t.deadline).toLocaleDateString()}</span>
                            </div>
                            {t.finalArt && t.finalArt.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {t.finalArt.slice(0, 3).map((url, i) => (
                                  <img key={i} src={url} alt="" className="w-12 h-12 rounded object-cover" />
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* APPROVALS */}
        {section === "approvals" && (
          <div className="space-y-3">
            {approvals.length === 0 ? (
              <div className={`text-center py-8 ${subCls}`}>No content approvals</div>
            ) : approvals.map((a) => (
              <div key={a.id} className={`rounded-xl border p-4 ${cardCls}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${textCls}`}>{a.title || a.caption?.slice(0, 80) || "Untitled"}</div>
                    {a.caption && <div className={`text-xs mt-1 ${subCls}`}>{a.caption.slice(0, 200)}</div>}
                    {a.type && <div className={`text-xs mt-1 ${subCls}`}>Type: {a.type}</div>}
                  </div>
                  <Badge status={a.status} isDark={isDark} />
                </div>
                {a.media && a.media.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {a.media.slice(0, 5).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    ))}
                    {a.media.length > 5 && (
                      <div className={`w-20 h-20 rounded-lg flex items-center justify-center ${isDark ? "bg-[#1a1810] text-[#5a5040]" : "bg-gray-100 text-gray-500"}`}>
                        +{a.media.length - 5}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* PRODUCTION */}
        {section === "production" && (
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <div className={`text-center py-8 ${subCls}`}>No production tasks</div>
            ) : tasks.map((t) => (
              <div key={t.id} className={`rounded-xl border p-4 ${cardCls}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{PRIORITY_EMOJI[t.priority] || "⚪"}</span>
                      <span className={`text-sm font-medium ${textCls}`}>{t.title}</span>
                    </div>
                    {t.caption && <div className={`text-xs mt-1 ${subCls}`}>{t.caption.slice(0, 150)}</div>}
                    <div className={`text-xs mt-2 flex gap-4 ${subCls}`}>
                      <span>🎨 {t.designerId}</span>
                      <span>📅 Due: {new Date(t.deadline).toLocaleDateString()}</span>
                      <span>Updated: {new Date(t.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge status={t.status} isDark={isDark} />
                </div>
                {t.finalArt && t.finalArt.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {t.finalArt.slice(0, 4).map((url, i) => (
                      <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CALENDAR */}
        {section === "scheduled" && (
          <div className="space-y-3">
            {posts.length === 0 ? (
              <div className={`text-center py-8 ${subCls}`}>
                <div className="text-3xl mb-2">📅</div>
                <p className="text-sm">No scheduled posts</p>
              </div>
            ) : posts.map((p) => (
              <div key={p.id} className={`rounded-xl border p-4 ${cardCls}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm ${textCls}`}>{p.caption.slice(0, 150)}{p.caption.length > 150 ? "..." : ""}</div>
                    <div className={`text-xs mt-2 flex gap-4 ${subCls}`}>
                      <span>📅 {new Date(p.scheduledAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                      <span>📱 {p.platforms.join(", ")}</span>
                    </div>
                  </div>
                  <Badge status={p.status} isDark={isDark} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
