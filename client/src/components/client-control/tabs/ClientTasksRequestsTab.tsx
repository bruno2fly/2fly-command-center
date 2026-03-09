"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const subParam = searchParams?.get("sub") ?? "requests";
  const activeSub: SubTabId = SUB_TABS.includes(subParam as SubTabId) ? (subParam as SubTabId) : "requests";

  const setSubTab = useCallback(
    (sub: SubTabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", "tasks");
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

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex gap-2 mb-6">
        {SUB_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setSubTab(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
              activeSub === s ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {activeSub === "requests" && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Request pipeline</h2>
          <div className="grid grid-cols-4 gap-4">
            {requestsByStage.map(({ stage, items }) => (
              <div
                key={stage}
                className="rounded-lg border border-gray-100 bg-white p-4 min-h-[200px]"
              >
                <h3 className="text-xs font-medium text-gray-500 mb-3">{STAGE_LABELS[stage]}</h3>
                <ul className="space-y-2">
                  {items.map((r) => (
                    <li
                      key={r.id}
                      className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                    >
                      <p className="font-medium text-gray-900 truncate">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{r.source} · {formatDate(r.dueAt)}</p>
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
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Tasks</h2>
          <div className="grid grid-cols-5 gap-4">
            {tasksByStatus.map(({ status, items }) => (
              <div
                key={status}
                className="rounded-lg border border-gray-100 bg-white p-4 min-h-[200px]"
              >
                <h3 className="text-xs font-medium text-gray-500 mb-3">{STATUS_LABELS[status]}</h3>
                <ul className="space-y-2">
                  {items.map((t) => (
                    <li
                      key={t.id}
                      className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 text-sm"
                    >
                      <p className="font-medium text-gray-900 truncate">{t.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{t.assignee} · {formatDate(t.dueAt)}</p>
                      {t.priority === "high" && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-700">High</span>
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
