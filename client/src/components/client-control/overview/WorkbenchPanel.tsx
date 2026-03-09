"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { WorkbenchItem } from "./WorkbenchItem";
import type { TaskItem } from "@/lib/client/mockClientTabData";
import type { RequestItem } from "@/lib/client/mockClientTabData";
import type { ControlItem } from "@/lib/client/mockClientControlData";

type WorkItem = {
  id: string;
  title: string;
  assignee?: string;
  source: string;
  status: string;
  dueAt: string | null;
  priority: "high" | "medium" | "low";
  kind: "task" | "request" | "approval";
};

type Props = {
  tasks: TaskItem[];
  requests: RequestItem[];
  controlItems: ControlItem[];
};

function buildWorkItems(
  tasks: TaskItem[],
  requests: RequestItem[],
  controlItems: ControlItem[]
): WorkItem[] {
  const items: WorkItem[] = [];

  const approvals = controlItems.filter((c) => c.kind === "approval");
  for (const a of approvals) {
    items.push({
      id: `approval-${a.id}`,
      title: a.title,
      assignee: a.owner,
      source: "Approval",
      status: "in_review",
      dueAt: a.dueAt,
      priority: "high",
      kind: "approval",
    });
  }

  for (const t of tasks.filter((x) => x.status !== "done")) {
    items.push({
      id: `task-${t.id}`,
      title: t.title,
      assignee: t.assignee,
      source: "Task",
      status: t.status,
      dueAt: t.dueAt,
      priority: t.priority,
      kind: "task",
    });
  }

  for (const r of requests.filter((x) => x.stage !== "done")) {
    items.push({
      id: `req-${r.id}`,
      title: r.title,
      source: r.source,
      status: r.stage,
      dueAt: r.dueAt,
      priority: r.dueAt ? "high" : "medium",
      kind: "request",
    });
  }

  const order: Record<string, number> = {
    in_progress: 0,
    in_review: 1,
    todo: 2,
    new: 3,
    backlog: 4,
  };
  return items.sort(
    (a, b) =>
      (order[a.status] ?? 5) - (order[b.status] ?? 5) ||
      (a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2) -
        (b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2)
  );
}

export function WorkbenchPanel({ tasks, requests, controlItems }: Props) {
  const { isDark } = useTheme();
  const items = buildWorkItems(tasks, requests, controlItems);

  const panelCls = isDark
    ? "bg-[#0a0a0e] border-[#1a1810]"
    : "bg-white border-gray-200";

  return (
    <section
      className={`rounded-xl border-2 overflow-hidden ${panelCls} ${
        isDark ? "border-emerald-500/20" : "border-blue-200"
      }`}
    >
      <div
        className={`px-4 py-3 border-b flex items-center gap-2 ${
          isDark ? "border-emerald-500/20 bg-emerald-500/5" : "border-blue-100 bg-blue-50/50"
        }`}
      >
        <span className={isDark ? "text-emerald-400" : "text-blue-600"}>▣</span>
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-emerald-400" : "text-blue-700"
          }`}
        >
          Workbench
        </h2>
      </div>
      <div className="p-3 space-y-2 max-h-[360px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
              No active work
            </p>
          </div>
        ) : (
          items.map((item) => (
            <WorkbenchItem
              key={item.id}
              id={item.id}
              title={item.title}
              assignee={item.assignee}
              source={item.source}
              status={item.status}
              dueAt={item.dueAt}
              priority={item.priority}
              kind={item.kind}
            />
          ))
        )}
      </div>
    </section>
  );
}
