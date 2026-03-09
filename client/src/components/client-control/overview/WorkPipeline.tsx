"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { CommandSection } from "@/components/ui/CommandSection";
import type { TaskItem, RequestItem } from "@/lib/client/mockClientTabData";
import type { ControlItem } from "@/lib/client/mockClientControlData";

const STAGES = [
  { id: "requests", label: "Requests" },
  { id: "in_progress", label: "In Progress" },
  { id: "waiting_client", label: "Waiting Client" },
  { id: "review", label: "Review / Approval" },
  { id: "delivered", label: "Delivered" },
] as const;

type Props = {
  tasks: TaskItem[];
  requests: RequestItem[];
  controlItems?: ControlItem[];
};

function buildStageCounts(tasks: TaskItem[], requests: RequestItem[], controlItems: ControlItem[] = []) {
  const counts: Record<string, number> = {
    requests: 0,
    in_progress: 0,
    waiting_client: 0,
    review: 0,
    delivered: 0,
  };

  for (const r of requests) {
    if (r.stage === "new") counts.requests++;
    else if (r.stage === "in_progress") counts.in_progress++;
    else if (r.stage === "in_review") counts.review++;
    else if (r.stage === "done") counts.delivered++;
  }

  for (const t of tasks) {
    if (t.status === "backlog" || t.status === "todo") counts.requests++;
    else if (t.status === "in_progress") counts.in_progress++;
    else if (t.status === "review") counts.review++;
    else if (t.status === "done") counts.delivered++;
  }

  const blockers = controlItems.filter((c) => c.kind === "blocker");
  counts.waiting_client = blockers.length;

  return counts;
}

export function WorkPipeline({ tasks, requests, controlItems = [] }: Props) {
  const { isDark } = useTheme();
  const counts = buildStageCounts(tasks, requests, controlItems);

  const stageCls = isDark ? "border-[#1a1810]" : "border-gray-100";
  const labelCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const countCls = (n: number) =>
    n > 0 ? (isDark ? "text-emerald-400 font-bold" : "text-emerald-600 font-bold") : isDark ? "text-[#5a5040]" : "text-gray-400";

  return (
    <CommandSection title="Work Pipeline">
      <div className={`flex overflow-x-auto border-t ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        {STAGES.map(({ id, label }) => {
          const count = counts[id] ?? 0;
          return (
            <div
              key={id}
              className={`flex-1 min-w-[80px] px-4 py-3 text-center border-r last:border-r-0 ${stageCls}`}
            >
              <p className={`text-[10px] font-medium uppercase tracking-wider ${labelCls}`}>{label}</p>
              <p className={`mt-1 text-lg ${countCls(count)}`}>{count}</p>
            </div>
          );
        })}
      </div>
    </CommandSection>
  );
}
