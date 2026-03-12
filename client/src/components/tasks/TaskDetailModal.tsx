"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { getSourceBadge } from "./sourceBadges";

export type TaskDetailTask = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  type: string;
  source: string;
  assignedTo?: string | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

const ASSIGNEE_OPTIONS = [
  { value: "", label: "—" },
  { value: "Bruno", label: "Bruno" },
  { value: "meta-traffic", label: "Meta Traffic" },
  { value: "content-system", label: "Content System" },
  { value: "project-manager", label: "Project Manager" },
  { value: "research-intel", label: "Research Intel" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_PILL: Record<string, string> = {
  pending: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  cancelled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const PRIORITY_PILL: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  normal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  low: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export interface TaskDetailModalProps {
  task: TaskDetailTask;
  clientName: string;
  clientId: string;
  onClose: () => void;
  onStatusChange: (taskId: string, status: string) => void;
  onDueDateChange: (taskId: string, date: string | null) => void;
  onAssignChange: (taskId: string, assignee: string) => void;
  onTitleChange?: (taskId: string, title: string) => void;
  onDescriptionChange?: (taskId: string, description: string) => void;
  onDelete: (taskId: string) => void;
}

export function TaskDetailModal({
  task,
  clientName,
  clientId,
  onClose,
  onStatusChange,
  onDueDateChange,
  onAssignChange,
  onTitleChange,
  onDescriptionChange,
  onDelete,
}: TaskDetailModalProps) {
  const { isDark } = useTheme();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description ?? "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
  }, [task.id, task.title, task.description]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const modalBg = isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const inputCls = isDark
    ? "bg-[#141414] border-[#2a2520] text-[#e8e4dc]"
    : "bg-gray-50 border-gray-200 text-gray-900";

  const dueDisplay = task.dueDate
    ? (() => {
        const due = new Date(task.dueDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((due.getTime() - now.getTime()) / 86400000);
        if (diffDays < 0 && task.status !== "completed")
          return { text: `Overdue ${Math.abs(diffDays)} days`, className: "text-red-500" };
        return { text: due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), className: mutedCls };
      })()
    : { text: "Not set", className: mutedCls };

  const sourceBadge = getSourceBadge(task.source);

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl ${modalBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex justify-end p-2 border-b border-[#2a2520]/50 bg-inherit">
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-lg ${mutedCls} hover:opacity-80`}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="p-6 space-y-5">
            {isEditingTitle ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => {
                  setIsEditingTitle(false);
                  if (editTitle.trim() !== task.title) onTitleChange?.(task.id, editTitle.trim());
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                className={`w-full text-lg font-semibold rounded-lg border px-3 py-2 ${inputCls}`}
                autoFocus
              />
            ) : (
              <h2
                id="task-detail-title"
                className={`text-lg font-semibold ${textCls} cursor-pointer hover:opacity-90`}
                onClick={() => onTitleChange && setIsEditingTitle(true)}
              >
                {task.title}
              </h2>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className={`rounded-lg border px-3 py-2 ${isDark ? "border-[#2a2520] bg-[#141414]" : "border-gray-200 bg-gray-50"}`}>
                <p className={`text-[10px] uppercase tracking-wider ${mutedCls}`}>Status</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium border ${STATUS_PILL[task.status] ?? "bg-gray-500/20 text-gray-400"}`}>
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
              </div>
              <div className={`rounded-lg border px-3 py-2 ${isDark ? "border-[#2a2520] bg-[#141414]" : "border-gray-200 bg-gray-50"}`}>
                <p className={`text-[10px] uppercase tracking-wider ${mutedCls}`}>Priority</p>
                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_PILL[task.priority] ?? "bg-gray-500/20 text-gray-400"}`}>
                  {task.priority}
                </span>
              </div>
              <div className={`rounded-lg border px-3 py-2 ${isDark ? "border-[#2a2520] bg-[#141414]" : "border-gray-200 bg-gray-50"}`}>
                <p className={`text-[10px] uppercase tracking-wider ${mutedCls}`}>Type</p>
                <p className={`text-sm font-medium ${textCls}`}>{task.type}</p>
              </div>
              <div className={`rounded-lg border px-3 py-2 ${isDark ? "border-[#2a2520] bg-[#141414]" : "border-gray-200 bg-gray-50"}`}>
                <p className={`text-[10px] uppercase tracking-wider ${mutedCls}`}>Source</p>
                <span className={`inline-flex items-center h-6 mt-0.5 px-2 py-0.5 rounded text-xs font-medium border ${sourceBadge.className}`}>
                  {sourceBadge.icon} {sourceBadge.label}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={mutedCls}>📅 Due:</span>
              {showDatePicker ? (
                <input
                  type="date"
                  className={`rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
                  defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ""}
                  onBlur={() => setShowDatePicker(false)}
                  onKeyDown={(e) => e.key === "Enter" && setShowDatePicker(false)}
                  onChange={(e) => {
                    const v = e.target.value;
                    onDueDateChange(task.id, v ? `${v}T00:00:00.000Z` : null);
                  }}
                />
              ) : (
                <>
                  <span className={dueDisplay.className}>{dueDisplay.text}</span>
                  {task.status !== "completed" && (
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(true)}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Set date
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className={mutedCls}>👤 Assigned to:</span>
              <select
                value={task.assignedTo ?? ""}
                onChange={(e) => onAssignChange(task.id, e.target.value)}
                className={`rounded-lg border px-2 py-1.5 text-sm ${inputCls}`}
              >
                {ASSIGNEE_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <p className={`text-sm ${mutedCls}`}>🏢 Client: {clientName}</p>
            <p className={`text-sm ${mutedCls}`}>
              📅 Created: {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>

            <div>
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${mutedCls} mb-2`}>Description</h3>
              {isEditingDescription ? (
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onBlur={() => {
                    setIsEditingDescription(false);
                    if (editDescription !== (task.description ?? "")) onDescriptionChange?.(task.id, editDescription);
                  }}
                  className={`w-full min-h-[100px] rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${inputCls}`}
                  autoFocus
                />
              ) : (
                <div
                  className={`min-h-[60px] rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${isDark ? "bg-[#141414] border-[#2a2520] text-gray-300" : "bg-gray-50 border-gray-200 text-gray-700"} ${onDescriptionChange ? "cursor-pointer hover:opacity-90" : ""}`}
                  onClick={() => onDescriptionChange && setIsEditingDescription(true)}
                >
                  {task.description || "—"}
                </div>
              )}
            </div>

            <div>
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${mutedCls} mb-2`}>Actions</h3>
              <div className="flex flex-wrap gap-2">
                {task.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(task.id, "in_progress")}
                    className="px-4 py-2 rounded-xl bg-blue-500 text-white font-medium hover:bg-blue-600"
                  >
                    Start →
                  </button>
                )}
                {task.status === "in_progress" && (
                  <button
                    type="button"
                    onClick={() => onStatusChange(task.id, "completed")}
                    className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600"
                  >
                    Complete ✅
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 font-medium hover:bg-red-500/30 border border-red-500/30"
                >
                  Delete 🗑
                </button>
              </div>
            </div>

            <div>
              <h3 className={`text-xs font-semibold uppercase tracking-wider ${mutedCls} mb-2`}>Activity</h3>
              <ul className={`text-sm ${mutedCls} space-y-1`}>
                <li>
                  {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — Created
                  {task.source === "agent" ? " by agent" : task.source === "onboarding" ? " (onboarding)" : ""}
                </li>
                {task.status !== "pending" && (
                  <li>
                    {new Date(task.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} — Status
                    changed to {STATUS_LABEL[task.status] ?? task.status}
                  </li>
                )}
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className={`max-w-sm w-full rounded-xl border p-6 ${modalBg}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`font-semibold ${textCls} mb-2`}>Delete this task?</p>
            <p className={`text-sm ${mutedCls} mb-4`}>This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded-lg ${mutedCls} hover:opacity-80`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(task.id);
                  setShowDeleteConfirm(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
