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

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day(s) ago`;
}

type Props = {
  task: ApiTask;
  onStatusChange?: (status: string) => void;
};

export function TaskCard({ task, onStatusChange }: Props) {
  const { isDark } = useTheme();
  const isCompleted = task.status === "completed";
  const priorityStyle = isCompleted ? "border-l-gray-400 bg-gray-500/5" : (PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.normal);
  const priorityIcon = isCompleted ? "✓" : (PRIORITY_ICON[task.priority] ?? "⚪");
  const isAgent = task.source === "agent";

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.6)] border-[rgba(51,65,85,0.5)]" : "bg-white border-gray-200";
  const completedCls = isCompleted
    ? "opacity-60 grayscale pointer-events-auto"
    : "hover:shadow-md";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-l-4 p-3 transition-shadow ${cardBg} ${priorityStyle} ${completedCls}`}
    >
      <div className="flex items-start gap-2">
        <span className={`text-xs shrink-0 ${isCompleted ? "text-gray-500" : ""}`}>
          {isCompleted ? "✅" : priorityIcon}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium truncate ${
              isCompleted
                ? "text-gray-500 line-through"
                : isDark
                  ? "text-[#c4b8a8]"
                  : "text-gray-900"
            }`}
          >
            {task.title}
          </p>
          {task.description && (
            <p className={`text-xs mt-0.5 line-clamp-2 ${isCompleted ? "text-gray-400" : isDark ? "text-gray-500" : "text-gray-600"}`}>
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isAgent && !isCompleted && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">
                🤖 Agent
              </span>
            )}
            {task.assignedTo && (
              <span className={`text-[10px] ${isCompleted ? "text-gray-400" : isDark ? "text-gray-500" : "text-gray-500"}`}>
                {task.assignedTo}
              </span>
            )}
            {task.dueDate && !isCompleted && (
              <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                Due {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {isCompleted && task.completedAt && (
              <span className="text-[10px] text-gray-500">
                Completed {timeAgo(task.completedAt)}
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
      {onStatusChange && task.status === "in_progress" && (
        <button
          type="button"
          onClick={() => onStatusChange("completed")}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
        >
          Complete ✅
        </button>
      )}
    </motion.div>
  );
}
