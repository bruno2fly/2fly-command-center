"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { ApiTask } from "@/lib/api";

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "border-l-red-500 bg-red-500/5",
  high: "border-l-amber-500 bg-amber-500/5",
  normal: "border-l-gray-400",
  low: "border-l-gray-300",
};

const PRIORITY_ICON: Record<string, string> = {
  urgent: "🔴",
  high: "🟡",
  normal: "🟢",
  low: "⚪",
};

type Props = {
  task: ApiTask;
  onStatusChange?: (status: string) => void;
};

export function TaskCard({ task, onStatusChange }: Props) {
  const { isDark } = useTheme();
  const priorityStyle = PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.normal;
  const priorityIcon = PRIORITY_ICON[task.priority] ?? "⚪";
  const isAgent = task.source === "agent";

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.6)] border-[rgba(51,65,85,0.5)]" : "bg-white border-gray-200";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-l-4 p-3 ${cardBg} ${priorityStyle} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-2">
        <span className="text-xs shrink-0">{priorityIcon}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            {task.title}
          </p>
          {task.description && (
            <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? "text-gray-500" : "text-gray-600"}`}>
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isAgent && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">
                🤖 Agent
              </span>
            )}
            {task.assignedTo && (
              <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                {task.assignedTo}
              </span>
            )}
            {task.dueDate && (
              <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Due {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
      {onStatusChange && task.status === "pending" && (
        <button
          type="button"
          onClick={() => onStatusChange("in_progress")}
          className="mt-2 text-[10px] text-blue-500 hover:underline"
        >
          Start →
        </button>
      )}
    </motion.div>
  );
}
