"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getRequests, getTasks } from "@/lib/client/mockClientTabData";
import { getClientHealth } from "@/lib/client/mockClientControlData";
import type { ControlItem } from "@/lib/client/mockClientControlData";

const STAGES = [
  { id: "request", label: "Request" },
  { id: "task", label: "Task" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "Review" },
  { id: "delivered", label: "Delivered" },
  { id: "paid", label: "Paid" },
] as const;

type PipelineItem = {
  id: string;
  title: string;
  source: string;
  date: string | null;
  assignee?: string;
  priority?: string;
  stage: string;
};

function buildPipelineItems(
  clientId: string,
  controlItems: ControlItem[],
  health: { paymentStatus: string } | null
): PipelineItem[] {
  const requests = getRequests(clientId);
  const tasks = getTasks(clientId);

  const items: PipelineItem[] = [];

  for (const r of requests) {
    const stage =
      r.stage === "new" ? "request" :
      r.stage === "in_review" ? "task" :
      r.stage === "in_progress" ? "in_progress" :
      "delivered";
    items.push({
      id: `req-${r.id}`,
      title: r.title,
      source: r.source,
      date: r.dueAt,
      stage,
    });
  }

  for (const t of tasks) {
    const stage =
      t.status === "backlog" ? "task" :
      t.status === "todo" ? "task" :
      t.status === "in_progress" ? "in_progress" :
      t.status === "review" ? "review" :
      "delivered";
    items.push({
      id: `task-${t.id}`,
      title: t.title,
      source: "Task",
      date: t.dueAt,
      assignee: t.assignee,
      priority: t.priority,
      stage,
    });
  }

  if (health?.paymentStatus === "paid") {
    items.push({
      id: "paid-1",
      title: "Invoice paid",
      source: "Payment",
      date: null,
      stage: "paid",
    });
  }

  return items;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type Props = {
  clientId: string;
  controlItems: ControlItem[];
  health: { paymentStatus: string } | null;
};

export function UnifiedPipeline({ clientId, controlItems, health }: Props) {
  const { isDark } = useTheme();
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const items = buildPipelineItems(clientId, controlItems, health);

  const byStage = STAGES.map((s) => ({
    ...s,
    items: items.filter((i) => i.stage === s.id),
  }));

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <section className={`rounded-xl border overflow-hidden ${baseCls}`}>
      <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
          Unified Pipeline
        </h2>
      </div>
      <div className="flex overflow-x-auto">
        {byStage.map(({ id, label, items: stageItems }) => {
          const count = stageItems.length;
          const isExpanded = expandedStage === id;

          return (
            <div
              key={id}
              className={`flex-shrink-0 min-w-[100px] border-r last:border-r-0 ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}
            >
              <button
                onClick={() => setExpandedStage(isExpanded ? null : id)}
                className={`w-full px-4 py-3 text-left ${
                  isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"
                }`}
              >
                <p className={`text-xs font-medium ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>
                  {label}
                </p>
                <p className={`mt-1 text-lg font-bold ${count > 0 ? (isDark ? "text-emerald-400" : "text-emerald-600") : isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                  {count}
                </p>
              </button>
              {isExpanded && stageItems.length > 0 && (
                <div className={`px-4 pb-3 border-t ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                  <ul className="space-y-2 mt-2">
                    {stageItems.map((i) => (
                      <li
                        key={i.id}
                        className={`p-2.5 rounded-lg text-sm ${
                          isDark ? "bg-[#0c0c10] border border-[#1a1810]" : "bg-gray-50 border border-gray-100"
                        }`}
                      >
                        <p className={`font-medium truncate ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                          {i.title}
                        </p>
                        <p className={`text-xs mt-0.5 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                          {i.source} · {formatDate(i.date)}
                          {i.assignee && ` · ${i.assignee}`}
                        </p>
                        {i.priority === "high" && (
                          <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] ${isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"}`}>
                            High
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
