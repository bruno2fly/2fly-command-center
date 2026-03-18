"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";

type FlowMetrics = {
  content: Record<string, number>;
  delivery: {
    posts_planned_this_week: number;
    posts_delivered_this_week: number;
    overdue_items: number;
    avg_completion_hours: number;
    gap_reasons: string[];
  };
  bottlenecks: { type: string; message: string }[];
  team: Record<string, number>;
  owner_load: Record<string, { active: number; overloaded: boolean }>;
  client_activity: {
    new_requests_this_week: number;
    avg_approval_delay_hours: number;
  };
  requests_quality: {
    open: number;
    completed: number;
    turned_into_deliverables: number;
  };
};

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

  const pipelineStatuses = [
    { key: "requested", label: "Requested", color: "bg-gray-500" },
    { key: "in_progress", label: "In Progress", color: "bg-blue-500" },
    { key: "pending_approval", label: "Pending Approval", color: "bg-amber-500" },
    { key: "approved", label: "Approved", color: "bg-emerald-500" },
    { key: "scheduled", label: "Scheduled", color: "bg-purple-500" },
    { key: "posted", label: "Posted", color: "bg-cyan-500" },
  ];

  const deliveryWarning = data.delivery.posts_delivered_this_week < data.delivery.posts_planned_this_week;
  const hasOverdue = data.delivery.overdue_items > 0;
  const ownerEntries = Object.entries(data.owner_load || {}).sort((a, b) => b[1].active - a[1].active);

  return (
    <div className="space-y-4">
      <h3 className={`text-sm font-semibold uppercase tracking-wider ${subtleCls}`}>
        2FlyFlow
      </h3>

      {/* BOTTLENECKS — TOP (problems first) */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Content Pipeline */}
        <div className={cardCls}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
            Content Pipeline
          </h4>
          <div className="flex flex-wrap gap-2">
            {pipelineStatuses.map((s) => (
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

        {/* Delivery Health + Gap Reason */}
        <div className={cardCls}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
            Delivery Health
          </h4>
          <div className="space-y-2">
            <div className={`flex justify-between text-sm ${deliveryWarning ? "text-amber-400" : subtleCls}`}>
              <span>Posts: planned vs delivered</span>
              <span className={`font-bold ${titleCls}`}>
                {data.delivery.posts_delivered_this_week}/{data.delivery.posts_planned_this_week}
              </span>
            </div>
            {hasOverdue && (
              <div className={alertCls}>
                ⚠️ {data.delivery.overdue_items} overdue item{data.delivery.overdue_items > 1 ? "s" : ""}
              </div>
            )}
            {deliveryWarning && data.delivery.gap_reasons.length > 0 && (
              <div className={warnCls}>
                <span className="font-medium">Gap:</span>{" "}
                {data.delivery.gap_reasons.join(" · ")}
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

        {/* Requests Quality */}
        <div className={cardCls}>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
            📋 Requests This Week
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className={metricCls}>
              <div className={`text-lg font-bold ${titleCls}`}>{data.requests_quality?.open ?? 0}</div>
              <div className={`text-xs ${subtleCls}`}>Open</div>
            </div>
            <div className={metricCls}>
              <div className={`text-lg font-bold ${titleCls}`}>{data.requests_quality?.completed ?? 0}</div>
              <div className={`text-xs ${subtleCls}`}>Completed</div>
            </div>
            <div className={metricCls}>
              <div className={`text-lg font-bold ${titleCls}`}>{data.requests_quality?.turned_into_deliverables ?? 0}</div>
              <div className={`text-xs ${subtleCls}`}>Deliverables</div>
            </div>
          </div>
        </div>

        {/* Client Activity */}
        {(data.client_activity.new_requests_this_week > 0 || data.client_activity.avg_approval_delay_hours > 0) && (
          <div className={cardCls}>
            <h4 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${subtleCls}`}>
              Client Activity
            </h4>
            <div className="space-y-2">
              {data.client_activity.new_requests_this_week > 0 && (
                <div className={`flex justify-between text-sm ${subtleCls}`}>
                  <span>Requests this week</span>
                  <span className={titleCls}>{data.client_activity.new_requests_this_week}</span>
                </div>
              )}
              {data.client_activity.avg_approval_delay_hours > 0 && (
                <div className={`flex justify-between text-sm ${subtleCls}`}>
                  <span>Avg approval delay</span>
                  <span className={data.client_activity.avg_approval_delay_hours > 48 ? "text-amber-400 font-bold" : titleCls}>
                    {data.client_activity.avg_approval_delay_hours}h
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
