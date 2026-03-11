"use client";

import { useEffect, useState } from "react";
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

type Props = {
  clientId: string;
};

export function TaskBoard({ clientId }: Props) {
  const { isDark } = useTheme();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");

  useEffect(() => {
    const params: { status?: string; type?: string; source?: string } = {};
    if (statusFilter) params.status = statusFilter;
    if (typeFilter) params.type = typeFilter;
    if (sourceFilter) params.source = sourceFilter;
    api
      .getClientTasks(clientId, params)
      .then((r) => setTasks(r.tasks ?? []))
      .catch(() => setTasks([]));
  }, [clientId, statusFilter, typeFilter, sourceFilter]);

  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    api
      .patchClientTask(clientId, taskId, { status: newStatus })
      .then((updated) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      })
      .catch(() => {});
  };

  const colBg = isDark ? "bg-[rgba(30,41,59,0.3)] border-[rgba(51,65,85,0.5)]" : "bg-gray-50/80 border-gray-200";

  return (
    <div className="p-4 space-y-4">
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
