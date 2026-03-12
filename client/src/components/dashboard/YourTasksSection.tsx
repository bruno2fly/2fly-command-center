"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { api, type DashboardTodayTask } from "@/lib/api";

type Props = {
  items: DashboardTodayTask[];
  onComplete?: () => void;
};

export function YourTasksSection({ items, onComplete }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();

  const cardBg = isDark ? "bg-[#141414] border-[#2a2520]" : "bg-gray-50 border-gray-200";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-600";

  const handleToggle = async (task: DashboardTodayTask) => {
    try {
      await api.patchClientTask(task.clientId, task.taskId, { status: "completed" });
      onComplete?.();
      router.refresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-500/90">📋 Your Tasks Today</h2>
        <p className={`text-sm ${muted}`}>No pending tasks.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-indigo-500/90">📋 Your Tasks Today</h2>
      <ul className="space-y-2">
        {items.map((task, i) => (
          <motion.li
            key={task.taskId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`flex items-start gap-3 rounded-lg border ${cardBg} border px-4 py-3`}
          >
            <button
              type="button"
              onClick={() => handleToggle(task)}
              className="mt-0.5 shrink-0 rounded border-2 border-gray-400 bg-transparent w-5 h-5 flex items-center justify-center hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors"
              aria-label={`Mark "${task.title}" complete`}
            >
              {/* unchecked box */}
            </button>
            <button
              type="button"
              onClick={() => router.push(`/clients/${task.clientId}?tab=tasks`)}
              className="flex-1 text-left"
            >
              <span className={text}>{task.title}</span>
              <span className={`block text-xs ${muted} mt-0.5`}>{task.clientName}</span>
              {task.dueDate && (
                <span className={`block text-[10px] mt-0.5 ${task.isOverdue ? "text-red-500 dark:text-red-400" : muted}`}>
                  {task.isOverdue ? `Overdue · ${new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : `Due ${new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                </span>
              )}
            </button>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
