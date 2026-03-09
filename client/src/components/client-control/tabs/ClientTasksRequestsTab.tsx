"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getRequests,
  getTasks,
  type RequestStage,
  type TaskStatus,
} from "@/lib/client/mockClientTabData";

const SUB_TABS = ["requests", "tasks"] as const;
type SubTabId = (typeof SUB_TABS)[number];

const STAGE_ORDER: RequestStage[] = ["new", "in_review", "in_progress", "done"];
const STATUS_ORDER: TaskStatus[] = ["backlog", "todo", "in_progress", "review", "done"];

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

  const setSubTab = useCallback(
    (sub: SubTabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "tasksRequests");
      params.set("sub", sub);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const requests = getRequests(clientId);
  const tasks = getTasks(clientId);

  const requestsByStage = STAGE_ORDER.map((stage) => ({
    stage,
    items: requests.filter((r) => r.stage === stage),
  }));

  const tasksByStatus = STATUS_ORDER.map((status) => ({
    status,
    items: tasks.filter((t) => t.status === status),
  }));

  const STAGE_LABELS: Record<RequestStage, string> = {
    new: "New",
    in_review: "In review",
    in_progress: "In progress",
    done: "Done",
  };

  const STATUS_LABELS: Record<TaskStatus, string> = {
    backlog: "Backlog",
    todo: "To do",
    in_progress: "In progress",
    review: "Review",
    done: "Done",
  };

  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const cardCls = isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-100 bg-white";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const subBtnActive = isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700";
  const subBtnInactive = isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]" : "bg-gray-100 text-gray-600 hover:bg-gray-200";

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
        <div className="space-y-4">
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedCls}`}>Request pipeline</h2>
          <div className="grid grid-cols-4 gap-4">
            {requestsByStage.map(({ stage, items }) => (
              <div
                key={stage}
                className={`rounded-lg border p-4 min-h-[200px] ${cardCls}`}
              >
                <h3 className={`text-xs font-medium mb-3 ${mutedCls}`}>{STAGE_LABELS[stage]}</h3>
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li
                      key={r.id}
                      className={`p-2.5 rounded-lg border text-sm ${isDark ? "bg-[#0c0c10] border-[#1a1810]" : "bg-gray-50 border-gray-100"}`}
                    >
                      <p className={`font-medium truncate ${textCls}`}>{r.title}</p>
                      <p className={`text-xs mt-0.5 ${mutedCls}`}>{r.source} · {formatDate(r.dueAt)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSub === "tasks" && (
        <div className="space-y-4">
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${mutedCls}`}>Tasks</h2>
          <div className="grid grid-cols-5 gap-4">
            {tasksByStatus.map(({ status, items }) => (
              <div
                key={status}
                className={`rounded-lg border p-4 min-h-[200px] ${cardCls}`}
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
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-xs ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}>High</span>
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
