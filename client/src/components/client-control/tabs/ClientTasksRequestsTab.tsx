"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import type { ApiRequestItem } from "@/lib/api";
import { getRequests, getTasks, type RequestStage, type TaskStatus } from "@/lib/client/mockClientTabData";

const SUB_TABS = ["requests", "tasks"] as const;
type SubTabId = (typeof SUB_TABS)[number];

const KANBAN_COLUMNS = [
  { id: "new", label: "New" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "in_progress", label: "In Progress" },
  { id: "waiting_client", label: "Waiting Client" },
  { id: "review", label: "In Review" },
  { id: "done", label: "Done" },
] as const;

type ColumnId = (typeof KANBAN_COLUMNS)[number]["id"];

function statusToColumn(status: string): ColumnId {
  if (status === "completed" || status === "closed") return "done";
  if (status in { new: 1, acknowledged: 1, in_progress: 1, waiting_client: 1, review: 1 }) return status as ColumnId;
  return "new";
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeSince(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(iso);
}

function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function isToday(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  const t = new Date();
  return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
}

const STATUS_ORDER: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];

const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  todo: "To do",
  in_progress: "In progress",
  review: "Review",
  done: "Done",
};

/** Map mock RequestItem.stage to API-like status for Kanban */
function mockStageToStatus(stage: RequestStage): ColumnId {
  if (stage === "new") return "new";
  if (stage === "in_progress") return "in_progress";
  if (stage === "in_review") return "review";
  return "done";
}

type Props = {
  clientId: string;
};

export function ClientTasksRequestsTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const subParam = searchParams?.get("sub") ?? "requests";
  const activeSub: SubTabId = SUB_TABS.includes(subParam as SubTabId) ? (subParam as SubTabId) : "requests";

  const [requests, setRequests] = useState<ApiRequestItem[]>([]);

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${API}/api/agent-tools/requests?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d: { requests?: ApiRequestItem[] }) => {
        setRequests(d.requests ?? []);
      })
      .catch(() => {
        const mock = getRequests(clientId);
        setRequests(
          mock.map((r) => ({
            id: r.id,
            clientId: r.clientId,
            title: r.title,
            description: undefined,
            priority: "normal",
            status: mockStageToStatus(r.stage),
            dueDate: r.dueAt ?? undefined,
            createdAt: r.createdAt,
            updatedAt: r.createdAt,
            source: r.source ?? "internal",
            type: "general",
            slaBreach: false,
          }))
        );
      });
  }, [clientId]);

  const setSubTab = useCallback(
    (sub: SubTabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "tasksRequests");
      params.set("sub", sub);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const tasks = getTasks(clientId);
  const requestsByColumn = useMemo(() => {
    const map: Record<ColumnId, ApiRequestItem[]> = {
      new: [],
      acknowledged: [],
      in_progress: [],
      waiting_client: [],
      review: [],
      done: [],
    };
    for (const r of requests) {
      const col = statusToColumn(r.status);
      map[col].push(r);
    }
    return map;
  }, [requests]);

  const summary = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    let urgent = 0;
    let overdue = 0;
    let slaBreach = 0;
    let doneThisWeek = 0;
    for (const r of requests) {
      if (r.priority === "urgent") urgent++;
      if (r.dueDate && new Date(r.dueDate) < now && statusToColumn(r.status) !== "done") overdue++;
      if (r.slaBreach) slaBreach++;
      if ((r.status === "completed" || r.status === "closed") && r.updatedAt && new Date(r.updatedAt) >= startOfWeek)
        doneThisWeek++;
    }
    return { total: requests.length, urgent, overdue, slaBreach, doneThisWeek };
  }, [requests]);

  const tasksByStatus = STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  }));

  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const subBtnActive = isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700";
  const subBtnInactive = isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]" : "bg-gray-100 text-gray-600 hover:bg-gray-200";

  const columnBg = isDark ? "rgba(30,41,59,0.3)" : "rgba(248,250,252,1)";
  const columnBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const cardBg = isDark ? "bg-[rgba(30,41,59,0.8)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const headerCls = "text-xs font-semibold uppercase tracking-wider " + mutedCls;

  const sourceBadgeCls = (source: string) => {
    const s = (source || "internal").toLowerCase();
    if (s === "whatsapp") return isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700";
    if (s === "2flyflow") return isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700";
    if (s === "email") return isDark ? "bg-gray-500/20 text-gray-400" : "bg-gray-100 text-gray-600";
    return isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700";
  };

  const priorityBorderCls = (priority: string) => {
    const p = (priority || "normal").toLowerCase();
    if (p === "urgent") return "border-l-red-500";
    if (p === "high") return "border-l-amber-500";
    return "border-l-gray-400";
  };

  const priorityDot = (priority: string) => {
    const p = (priority || "normal").toLowerCase();
    if (p === "urgent") return "🔴";
    if (p === "high") return "🟡";
    return "⚪";
  };

  return (
    <div className={`flex-1 overflow-auto p-6 ${bgBase}`}>
      <div className="flex gap-2 mb-6">
        {SUB_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setSubTab(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              activeSub === s ? subBtnActive : subBtnInactive
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {activeSub === "requests" && (
        <>
          <div className={`flex flex-wrap items-center gap-4 mb-4 text-sm ${mutedCls}`}>
            <span>📋 Total: <strong className={textCls}>{summary.total}</strong></span>
            <span>🔴 Urgent: <strong className={textCls}>{summary.urgent}</strong></span>
            <span>⏰ Overdue: <strong className={textCls}>{summary.overdue}</strong></span>
            <span>⚠️ SLA Breach: <strong className={textCls}>{summary.slaBreach}</strong></span>
            <span>✅ Done this week: <strong className={textCls}>{summary.doneThisWeek}</strong></span>
          </div>

          <div className="grid grid-cols-6 gap-3 min-w-[900px]">
            <AnimatePresence mode="popLayout">
              {KANBAN_COLUMNS.map((col) => {
                const items = requestsByColumn[col.id];
                return (
                  <motion.div
                    key={col.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`rounded-2xl min-h-[400px] border ${columnBorder}`}
                    style={{ background: columnBg }}
                  >
                    <div className={`px-3 py-3 border-b ${columnBorder} flex items-center justify-between`}>
                      <h3 className={headerCls}>{col.label}</h3>
                      <span className={`text-xs font-medium tabular-nums ${mutedCls}`}>{items.length}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[360px]">
                      {items.length === 0 ? (
                        <div
                          className={`rounded-xl border border-dashed ${columnBorder} flex items-center justify-center min-h-[120px] ${mutedCls} text-xs`}
                        >
                          No items
                        </div>
                      ) : (
                        items.map((r, idx) => (
                          <motion.div
                            key={r.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03, duration: 0.2, ease: "easeOut" }}
                            onClick={() => console.log("Request clicked", r.id)}
                            className={`rounded-xl border-l-4 ${priorityBorderCls(r.priority)} ${cardBg} border ${cardBorder} p-3 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-500/20`}
                          >
                            <p className={`font-bold text-sm truncate ${textCls}`}>{r.title}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${sourceBadgeCls(r.source ?? "internal")}`}>
                                {r.source ?? "Internal"}
                              </span>
                              <span
                                className={`text-[10px] ${isOverdue(r.dueDate) ? "text-red-500 font-medium" : isToday(r.dueDate) ? "text-amber-500" : mutedCls}`}
                              >
                                Due {formatDate(r.dueDate)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              <span className="text-[10px]" title={r.priority}>{priorityDot(r.priority)}</span>
                              {r.slaBreach && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                                  SLA breach
                                </span>
                              )}
                              {r.type && (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${mutedCls} border ${columnBorder}`}>
                                  {r.type}
                                </span>
                              )}
                            </div>
                            <p className={`text-[10px] mt-1 ${mutedCls}`}>{timeSince(r.createdAt)}</p>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}

      {activeSub === "tasks" && (
        <div className="space-y-4">
          <h2 className={headerCls}>Tasks</h2>
          <div className="grid grid-cols-5 gap-4">
            {tasksByStatus.map(({ status, items }) => (
              <div
                key={status}
                className={`rounded-lg border p-4 min-h-[200px] ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-100 bg-white"}`}
              >
                <h3 className={`text-xs font-medium mb-3 ${mutedCls}`}>{STATUS_LABELS[status]}</h3>
                <ul className="space-y-2">
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className={`p-2.5 rounded-lg border text-sm ${isDark ? "bg-[#0c0c10] border-[#1a1810]" : "bg-gray-50 border-gray-100"}`}
                    >
                      <p className={`font-medium truncate ${textCls}`}>{t.title}</p>
                      <p className={`text-xs mt-0.5 ${mutedCls}`}>{t.assignee} · {formatDate(t.dueAt)}</p>
                      {t.priority === "high" && (
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}>
                          High
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
