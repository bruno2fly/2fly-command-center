"use client";

import { useEffect, useState, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { api, type ApiTask } from "@/lib/api";
import { TaskCard } from "./TaskCard";
import { TaskFilters } from "./TaskFilters";

const COLUMNS = [
  { id: "pending", label: "Pending" },
  { id: "in_progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
] as const;

const SOURCE_QUICK_FILTERS: { value: string; icon: string; label: string }[] = [
  { value: "", icon: "•", label: "All" },
  { value: "manual", icon: "👤", label: "Mine" },
  { value: "agent", icon: "🤖", label: "Agent" },
  { value: "onboarding", icon: "📋", label: "Onboarding" },
];

type Props = {
  clientId: string;
  clientName?: string;
  onSelectTask?: (task: ApiTask) => void;
  onOpenCreateTask?: () => void;
  refreshTrigger?: number;
};

export function TaskBoard({ clientId, clientName = "—", onSelectTask, onOpenCreateTask, refreshTrigger = 0 }: Props) {
  const { isDark } = useTheme();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  const fetchTasks = useCallback(() => {
    const params: { status?: string; type?: string; source?: string } = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    if (sourceFilter) params.source = sourceFilter;
    api
      .getClientTasks(clientId, params)
      .then((r) => setTasks(r.tasks ?? []))
      .catch(() => setTasks([]));
  }, [clientId, statusFilter, typeFilter, sourceFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshTrigger]);

  const byStatus = (status: string) => {
    const list = tasks.filter((t) => t.status === status);
    if (status === "completed") {
      return [...list].sort((a, b) => {
        const aAt = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const bAt = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return bAt - aAt;
      });
    }
    return list;
  };

  const handleStatusChange = (taskId: string, newStatus: string) => {
    api
      .patchClientTask(clientId, taskId, { status: newStatus })
      .then((updated) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      })
      .catch(() => {});
  };

  const handleDueDateChange = (taskId: string, dueDate: string | null) => {
    api
      .patchClientTask(clientId, taskId, { dueDate })
      .then((updated) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      })
      .catch(() => {});
  };

  const colBg = isDark ? "bg-[rgba(30,41,59,0.3)] border-[rgba(51,65,85,0.5)]" : "bg-gray-50/80 border-gray-200";
  const quickBtn = (active: boolean) =>
    active
      ? isDark
        ? "bg-blue-500/25 text-blue-400 border-blue-500/40"
        : "bg-blue-100 text-blue-700 border-blue-200"
      : isDark
        ? "text-gray-400 hover:text-gray-200 border-[rgba(51,65,85,0.5)] hover:border-gray-500"
        : "text-gray-600 hover:text-gray-900 border-gray-200 hover:border-gray-300";

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {SOURCE_QUICK_FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              onClick={() => setSourceFilter(f.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${quickBtn(sourceFilter === f.value)}`}
            >
              <span>{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
        {onOpenCreateTask && (
          <button
            type="button"
            onClick={onOpenCreateTask}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 border border-blue-500/30"
          >
            + Create Task
          </button>
        )}
      </div>
      <TaskFilters
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        sourceFilter={sourceFilter}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onSourceChange={setSourceFilter}
      />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = byStatus(col.id);
          return (
            <motion.div
              key={col.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border min-h-[200px] ${colBg}`}
            >
              <div className={`px-4 py-3 border-b ${isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200"}`}>
                <h3 className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                  {col.label}
                </h3>
                <p className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  {items.length} task{items.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="p-3 space-y-2 overflow-y-auto max-h-[400px]">
                {items.length === 0 ? (
                  <p className={`text-xs py-4 text-center ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    No tasks
                  </p>
                ) : (
                  items.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(status) => handleStatusChange(task.id, status)}
                      onDueDateChange={handleDueDateChange}
                      onTaskClick={onSelectTask}
                    />
                  ))
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
