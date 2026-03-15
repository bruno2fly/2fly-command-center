"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { ApiTask } from "@/lib/api";
import { getSourceBadge } from "./sourceBadges";

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

function getDueLabel(dueDate: string | null, isCompleted: boolean): { text: string; className: string } | null {
  if (!dueDate || isCompleted) return null;
  const due = new Date(dueDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000);
  const shortDate = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (diffDays < 0) return { text: `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""}`, className: "text-red-500 dark:text-red-400" };
  if (diffDays === 0) return { text: "Due today", className: "text-amber-600 dark:text-amber-400" };
  if (diffDays <= 3) return { text: `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`, className: "text-amber-500 dark:text-amber-400/90" };
  return { text: `Due ${shortDate}`, className: "text-gray-500 dark:text-gray-500" };
}

type Props = {
  task: ApiTask;
  onStatusChange?: (status: string) => void;
  onDueDateChange?: (taskId: string, dueDate: string | null) => void;
  onTaskClick?: (task: ApiTask) => void;
  onExecute?: (task: ApiTask) => void;
  onCopyPrompt?: (task: ApiTask) => void;
};

export function TaskCard({ task, onStatusChange, onDueDateChange, onTaskClick, onExecute, onCopyPrompt }: Props) {
  const { isDark } = useTheme();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isCompleted = task.status === "completed";
  const priorityStyle = isCompleted ? "border-l-gray-400 bg-gray-500/5" : (PRIORITY_STYLE[task.priority] ?? PRIORITY_STYLE.normal);
  const priorityIcon = isCompleted ? "✓" : (PRIORITY_ICON[task.priority] ?? "⚪");
  const sourceBadge = getSourceBadge(task.source);
  const dueLabel = getDueLabel(task.dueDate ?? null, isCompleted);

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.6)] border-[rgba(51,65,85,0.5)]" : "bg-white border-gray-200";
  const completedCls = isCompleted
    ? "opacity-60 grayscale pointer-events-auto"
    : "hover:shadow-md";
  const dateInputClass = isDark
    ? "bg-[#1a1818] border-[#2a2520] text-[#e8e4dc] rounded px-2 py-1 text-[10px]"
    : "bg-gray-100 border-gray-300 text-gray-900 rounded px-2 py-1 text-[10px]";

  const handleCardClick = () => {
    if (onTaskClick) onTaskClick(task);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-l-4 p-3 transition-shadow ${cardBg} ${priorityStyle} ${completedCls} ${onTaskClick ? "cursor-pointer hover:border-opacity-80 hover:scale-[1.01]" : ""}`}
      onClick={onTaskClick ? handleCardClick : undefined}
    >
      <div className="flex items-start gap-2">
        <span className={`text-xs shrink-0 ${isCompleted ? "text-gray-500" : ""}`}>
          {isCompleted ? "✅" : priorityIcon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`text-sm font-medium truncate flex-1 min-w-0 ${
              isCompleted
                ? "text-gray-500 line-through"
                : isDark
                  ? "text-[#c4b8a8]"
                  : "text-gray-900"
            }`}
            >
              {task.title}
            </p>
            {(onExecute || onCopyPrompt) && !isCompleted && (
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                {onExecute && (
                  <button
                    type="button"
                    onClick={() => onExecute(task)}
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Execute with AI"
                    aria-label="Execute with AI"
                  >
                    🤖
                  </button>
                )}
                {onCopyPrompt && (
                  <button
                    type="button"
                    onClick={() => onCopyPrompt(task)}
                    className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    title="Copy prompt to clipboard"
                    aria-label="Copy prompt to clipboard"
                  >
                    📋
                  </button>
                )}
              </div>
            )}
          </div>
          {task.description && (
            <p className={`text-xs mt-0.5 line-clamp-2 ${isCompleted ? "text-gray-400" : isDark ? "text-gray-500" : "text-gray-600"}`}>
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {!isCompleted && (
              <span className={`inline-flex items-center h-4 px-1.5 rounded text-[10px] font-medium border ${sourceBadge.className}`}>
                {sourceBadge.icon} {sourceBadge.label}
              </span>
            )}
            {task.assignedTo && (
              <span className={`text-[10px] ${isCompleted ? "text-gray-400" : isDark ? "text-gray-500" : "text-gray-500"}`}>
                {task.assignedTo}
              </span>
            )}
            {!isCompleted && onDueDateChange && (
              <span className="flex items-center gap-1 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {showDatePicker ? (
                  <input
                    type="date"
                    className={dateInputClass}
                    defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                    onBlur={() => setShowDatePicker(false)}
                    onKeyDown={(e) => e.key === "Enter" && setShowDatePicker(false)}
                    onChange={(e) => {
                      const v = e.target.value;
                      onDueDateChange(task.id, v ? `${v}T00:00:00.000Z` : null);
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(true)}
                    className={`text-[10px] hover:underline ${dueLabel ? dueLabel.className : isDark ? "text-gray-500" : "text-gray-500"}`}
                  >
                    {dueLabel ? dueLabel.text : "Set due date"}
                  </button>
                )}
              </span>
            )}
            {dueLabel && !showDatePicker && !onDueDateChange && (
              <span className={`text-[10px] ${dueLabel.className}`}>{dueLabel.text}</span>
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
          onClick={(e) => { e.stopPropagation(); onStatusChange("in_progress"); }}
          className="mt-2 text-[10px] text-blue-500 hover:underline"
        >
          Start →
        </button>
      )}
      {onStatusChange && task.status === "in_progress" && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStatusChange("completed"); }}
          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
        >
          Complete ✅
        </button>
      )}
    </motion.div>
  );
}
