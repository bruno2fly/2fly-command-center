"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type RequestItem = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  slaBreach: boolean;
};

type FlowMetrics = {
  client_requests: {
    by_status: Record<string, number>;
    active_count: number;
    this_week: number;
    sla_breaches: number;
    recent: RequestItem[];
  };
  content: Record<string, number>;
  delivery: {
    posts_planned_this_week: number;
    posts_delivered_this_week: number;
    overdue_items: number;
    avg_completion_hours: number;
    gap_reasons: string[];
  };
  bottlenecks: { type: string; message: string }[];
  owner_load: Record<string, { active: number; overloaded: boolean }>;
  requests_quality: {
    open: number;
    completed: number;
    turned_into_deliverables: number;
  };
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  acknowledged: "bg-sky-500",
  in_progress: "bg-amber-500",
  review: "bg-purple-500",
  completed: "bg-emerald-500",
  closed: "bg-gray-500",
};

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "text-red-400 font-bold",
  high: "text-amber-400 font-medium",
  normal: "",
  low: "text-gray-500",
};

export function TwoFlyFlowSection({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [data, setData] = useState<FlowMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/clients/${clientId}/2flyflow`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(e.message));
  }, [clientId]);

  if (error) return <div className="text-red-400 text-sm p-4">2FlyFlow: {error}</div>;
  if (!data) return <div className="text-gray-500 text-sm p-4">Loading 2FlyFlow...</div>;

  const cardCls = isDark
    ? "bg-[#0a0a0e] border border-white/5 rounded-xl p-4"
    : "bg-white border border-gray-200 rounded-xl p-4";
  const titleCls = isDark ? "text-gray-100" : "text-gray-900";
  const subtleCls = isDark ? "text-gray-400" : "text-gray-500";
  const alertCls = isDark
    ? "bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm"
    : "bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-sm";
  const warnCls = isDark
    ? "bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-amber-400 text-sm"
    : "bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-600 text-sm";
  const metricCls = isDark
    ? "bg-white/5 rounded-lg px-3 py-2 text-center"
    : "bg-gray-50 rounded-lg px-3 py-2 text-center";
  const sectionTitleCls = `text-sm font-semibold uppercase tracking-wider ${subtleCls}`;

  const deliveryWarning = data.delivery.posts_delivered_this_week < data.delivery.posts_planned_this_week;
  const ownerEntries = Object.entries(data.owner_load || {}).sort((a, b) => b[1].active - a[1].active);

  const requestStatuses = [
    { key: "new", label: "New" },
    { key: "acknowledged", label: "Acknowledged" },
    { key: "in_progress", label: "In Progress" },
    { key: "review", label: "Review" },
    { key: "completed", label: "Completed" },
    { key: "closed", label: "Closed" },
  ];

  const contentStatuses = [
    { key: "pending_approval", label: "Pending Approval", color: "bg-amber-500" },
    { key: "approved", label: "Approved", color: "bg-emerald-500" },
    { key: "scheduled", label: "Scheduled", color: "bg-purple-500" },
    { key: "posted", label: "Posted", color: "bg-cyan-500" },
  ];

  const cr = data.client_requests;

  return (
    <div className="space-y-6">
      {/* BOTTLENECKS — TOP */}
      {data.bottlenecks.length > 0 && (
        <div className={cardCls}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
            ⚡ Bottlenecks
          </h4>
          <div className="space-y-2">
            {data.bottlenecks.map((b, i) => (
              <div key={i} className={b.type === "overload" ? alertCls : warnCls}>
                {b.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────── SECTION 1: CLIENT REQUESTS ─────────── */}
      <div>
        <h3 className={`${sectionTitleCls} mb-4`}>📩 Client Requests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Request Status Overview */}
          <div className={cardCls}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
              Status Overview
            </h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className={metricCls}>
                <div className={`text-lg font-bold ${titleCls}`}>{cr.active_count}</div>
                <div className={`text-xs ${subtleCls}`}>Active</div>
              </div>
              <div className={metricCls}>
                <div className={`text-lg font-bold ${titleCls}`}>{cr.this_week}</div>
                <div className={`text-xs ${subtleCls}`}>This Week</div>
              </div>
              <div className={metricCls}>
                <div className={`text-lg font-bold ${cr.sla_breaches > 0 ? "text-red-400" : titleCls}`}>
                  {cr.sla_breaches}
                </div>
                <div className={`text-xs ${subtleCls}`}>SLA Breach</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {requestStatuses.map((s) => {
                const count = cr.by_status[s.key] || 0;
                if (count === 0) return null;
                return (
                  <div
                    key={s.key}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                      isDark ? "bg-white/5" : "bg-gray-50"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[s.key]}`} />
                    <span className={subtleCls}>{s.label}</span>
                    <span className={`font-bold ${titleCls}`}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Requests */}
          <div className={cardCls}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
              Recent Requests
            </h4>
            {cr.recent.length === 0 ? (
              <div className={`text-sm ${subtleCls}`}>No requests</div>
            ) : (
              <div className="space-y-2">
                {cr.recent.map((r) => (
                  <div
                    key={r.id}
                    className={`flex items-start justify-between gap-2 text-sm ${
                      isDark ? "border-b border-white/5 pb-2" : "border-b border-gray-100 pb-2"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`truncate ${titleCls} ${PRIORITY_STYLE[r.priority] || ""}`}>
                        {r.slaBreach && "🔴 "}{r.title}
                      </div>
                      <div className={`text-xs ${subtleCls}`}>
                        {r.type} · {r.assignedTo || "unassigned"}
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 shrink-0`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[r.status]}`} />
                      <span className={`text-xs ${subtleCls}`}>{r.status.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────── SECTION 2: CONTENT PRODUCTION ─────────── */}
      <div>
        <h3 className={`${sectionTitleCls} mb-4`}>🎨 Content Production</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Content Pipeline */}
          <div className={cardCls}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
              Pipeline
            </h4>
            <div className="flex flex-wrap gap-2">
              {contentStatuses.map((s) => (
                <div
                  key={s.key}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    isDark ? "bg-white/5" : "bg-gray-50"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className={subtleCls}>{s.label}</span>
                  <span className={`font-bold ${titleCls}`}>
                    {data.content[s.key] || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery Health */}
          <div className={cardCls}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
              Delivery Health
            </h4>
            <div className="space-y-2">
              <div className={`flex justify-between text-sm ${deliveryWarning ? "text-amber-400" : subtleCls}`}>
                <span>Planned vs delivered</span>
                <span className={`font-bold ${titleCls}`}>
                  {data.delivery.posts_delivered_this_week}/{data.delivery.posts_planned_this_week}
                </span>
              </div>
              {data.delivery.overdue_items > 0 && (
                <div className={alertCls}>
                  ⚠️ {data.delivery.overdue_items} overdue
                </div>
              )}
              {deliveryWarning && data.delivery.gap_reasons.length > 0 && (
                <div className={warnCls}>
                  Gap: {data.delivery.gap_reasons.join(" · ")}
                </div>
              )}
              <div className={`flex justify-between text-sm ${subtleCls}`}>
                <span>Avg completion</span>
                <span className={titleCls}>{data.delivery.avg_completion_hours}h</span>
              </div>
            </div>
          </div>

          {/* Owner Load */}
          <div className={cardCls}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
              👤 Owner Load
            </h4>
            {ownerEntries.length === 0 ? (
              <div className={`text-sm ${subtleCls}`}>No assigned tasks</div>
            ) : (
              <div className="space-y-2">
                {ownerEntries.map(([owner, info]) => (
                  <div key={owner} className="flex justify-between items-center text-sm">
                    <span className={subtleCls}>{owner}</span>
                    <span className={`font-bold ${info.overloaded ? "text-red-400" : titleCls}`}>
                      {info.active} active {info.overloaded && "⚠️"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
