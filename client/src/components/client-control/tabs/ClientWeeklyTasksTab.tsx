"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

interface WeeklyTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  type: string;
  status: string;
  canAgentExecute: boolean;
  agentInstructions: string | null;
  weekLabel: string | null;
  createdAt: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  high: { label: "High", dot: "🔴", text: "text-red-400" },
  urgent: { label: "Urgent", dot: "🔴", text: "text-red-400" },
  normal: { label: "Medium", dot: "🟡", text: "text-yellow-400" },
  low: { label: "Low", dot: "🟢", text: "text-emerald-400" },
};

const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  content: { label: "Content", bg: "bg-purple-500/15", text: "text-purple-300" },
  ads: { label: "Ads", bg: "bg-blue-500/15", text: "text-blue-300" },
  strategy: { label: "Strategy", bg: "bg-orange-500/15", text: "text-orange-300" },
  technical: { label: "Technical", bg: "bg-slate-500/15", text: "text-slate-300" },
  task: { label: "Task", bg: "bg-zinc-500/15", text: "text-zinc-300" },
};

type Props = { clientId: string };

export function ClientWeeklyTasksTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [weekLabel, setWeekLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/weekly-tasks/${clientId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as { weekLabel: string; tasks: WeeklyTask[] };
      setWeekLabel(data.weekLabel);
      setTasks(data.tasks);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/weekly-tasks/generate/${clientId}`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadTasks();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRegenerating(false);
    }
  };

  const handleMarkDone = async (taskId: string) => {
    try {
      await fetch(`${API_BASE}/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "completed" } : t))
      );
    } catch (e) {
      console.error("Failed to mark done:", e);
    }
  };

  const handleExecute = async (task: WeeklyTask) => {
    if (!task.agentInstructions) return;
    setExecutingId(task.id);
    try {
      await fetch(`${API_BASE}/api/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: "founder-boss",
          message: task.agentInstructions,
          clientId,
        }),
      });
      // Mark as in_progress after sending to agent
      await fetch(`${API_BASE}/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "in_progress" }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "in_progress" } : t))
      );
    } catch (e) {
      console.error("Failed to execute:", e);
    } finally {
      setExecutingId(null);
    }
  };

  const pendingTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const bg = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const cardBg = isDark ? "bg-[#0e0e14] border-[#1a1820]" : "bg-white border-gray-200";
  const textPrimary = isDark ? "text-[#e8dcc8]" : "text-gray-900";
  const textMuted = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  if (loading) {
    return (
      <div className={`flex-1 flex items-center justify-center ${bg}`}>
        <div className={`text-sm ${textMuted}`}>Loading weekly tasks...</div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto ${bg}`}>
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-semibold ${textPrimary}`}>
              {weekLabel || "This Week"}
            </h2>
            <p className={`text-xs ${textMuted} mt-0.5`}>
              AI-generated priorities for this client
            </p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isDark
                ? "border-[#2a2535] text-[#c4b8a8] hover:bg-[#1a1525] disabled:opacity-40"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            }`}
          >
            {regenerating ? "Regenerating..." : "↺ Regenerate"}
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {pendingTasks.length === 0 && !error && (
          <div className={`rounded-xl border p-8 text-center ${cardBg}`}>
            <p className={`text-sm ${textMuted} mb-3`}>No tasks generated yet for this week.</p>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-40"
            >
              {regenerating ? "Generating..." : "Generate This Week's Tasks"}
            </button>
          </div>
        )}

        {/* Task cards */}
        <div className="space-y-3">
          {pendingTasks.map((task) => {
            const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
            const typ = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.task;
            const isExecuting = executingId === task.id;
            const isInProgress = task.status === "in_progress";

            return (
              <div
                key={task.id}
                className={`rounded-xl border p-4 transition-opacity ${cardBg} ${
                  isInProgress ? "opacity-70" : ""
                }`}
              >
                {/* Top row: title + badges */}
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-sm font-semibold ${textPrimary}`}>
                        {task.title}
                      </span>
                      {isInProgress && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                          In Progress
                        </span>
                      )}
                    </div>
                    {task.description && (
                      <p
                        className={`text-xs ${textMuted} line-clamp-2`}
                        style={{ lineClamp: 2, WebkitLineClamp: 2, display: "-webkit-box", WebkitBoxOrient: "vertical", overflow: "hidden" }}
                      >
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom row: badges + actions */}
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${pri.text}`}>
                      {pri.dot} {pri.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typ.bg} ${typ.text}`}>
                      {typ.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.canAgentExecute && task.agentInstructions && !isInProgress && (
                      <button
                        onClick={() => handleExecute(task)}
                        disabled={isExecuting}
                        className="px-3 py-1 text-xs font-medium rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-600/30 transition-colors disabled:opacity-40"
                      >
                        {isExecuting ? "Sending..." : "⚡ Execute"}
                      </button>
                    )}
                    <button
                      onClick={() => handleMarkDone(task.id)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        isDark
                          ? "border-[#2a2535] text-[#8a7e6d] hover:text-[#c4b8a8] hover:border-[#3a3545]"
                          : "border-gray-300 text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      ✅ Mark Done
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed section */}
        {completedTasks.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted((v) => !v)}
              className={`text-xs font-medium ${textMuted} hover:${textPrimary} transition-colors flex items-center gap-1`}
            >
              {showCompleted ? "▾" : "▸"} Completed ({completedTasks.length})
            </button>
            {showCompleted && (
              <div className="mt-2 space-y-2">
                {completedTasks.map((task) => {
                  const pri = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.normal;
                  const typ = TYPE_CONFIG[task.type] ?? TYPE_CONFIG.task;
                  return (
                    <div
                      key={task.id}
                      className={`rounded-xl border p-3 opacity-50 ${cardBg}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-xs line-through ${textMuted}`}>{task.title}</span>
                        <span className={`text-xs ${pri.text}`}>{pri.dot}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${typ.bg} ${typ.text}`}>
                          {typ.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
