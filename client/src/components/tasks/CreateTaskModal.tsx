"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";

const TYPE_OPTIONS = [
  { value: "task", label: "Task" },
  { value: "content", label: "Content" },
  { value: "ads", label: "Ads" },
  { value: "support", label: "Support" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const ASSIGNEE_OPTIONS = [
  { value: "", label: "Unassigned" },
  { value: "Bruno", label: "Bruno" },
  { value: "meta-traffic", label: "Meta Traffic" },
  { value: "content-system", label: "Content System" },
  { value: "project-manager", label: "Project Manager" },
  { value: "research-intel", label: "Research Intel" },
];

export interface CreateTaskModalProps {
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTaskModal({ clientId, onClose, onSuccess }: CreateTaskModalProps) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("task");
  const [priority, setPriority] = useState("normal");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const modalBg = isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-white border-gray-200";
  const inputCls = isDark
    ? "bg-[#141414] border-[#2a2520] text-[#e8e4dc] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";
  const labelCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      await api.createClientTask(clientId, {
        title: trimmed,
        description: description.trim() || undefined,
        type,
        priority,
        assignedTo: assignedTo || undefined,
        dueDate: dueDate ? `${dueDate}T00:00:00.000Z` : undefined,
      });
      toast.success("✅ Task created");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl ${modalBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#2a2520]/50 bg-inherit">
            <h2 id="create-task-title" className={`text-lg font-semibold ${textCls}`}>
              Create New Task
            </h2>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-lg ${labelCls} hover:opacity-80`}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label htmlFor="create-task-title-input" className={`block text-sm font-medium ${labelCls} mb-1`}>
                Title *
              </label>
              <input
                id="create-task-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="create-task-desc" className={`block text-sm font-medium ${labelCls} mb-1`}>
                Description
              </label>
              <textarea
                id="create-task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm resize-y min-h-[80px] ${inputCls}`}
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label htmlFor="create-task-type" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Type
                </label>
                <select
                  id="create-task-type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-task-priority" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Priority
                </label>
                <select
                  id="create-task-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-task-assign" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Assign
                </label>
                <select
                  id="create-task-assign"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                >
                  {ASSIGNEE_OPTIONS.map((o) => (
                    <option key={o.value || "unassigned"} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-task-due" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Due Date
                </label>
                <input
                  id="create-task-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${labelCls} hover:opacity-80`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? "Creating…" : "Create Task ✅"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
