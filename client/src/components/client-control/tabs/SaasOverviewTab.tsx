"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { motion } from "framer-motion";

type SaasNotes = {
  type?: string;
  description?: string;
  stage?: string;
  revenue?: number;
  targetRevenue?: number;
  url?: string;
  techStack?: string;
  competitors?: string[];
  goals?: string[];
  customers?: number;
};

type Props = {
  clientId: string;
  clientName?: string;
  onOpenTaskDetail?: (taskId: string) => void;
};

const STAGE_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  planning: { label: "Planning", color: "text-gray-400 bg-gray-500/10 border-gray-500/20", emoji: "📋" },
  building: { label: "Building", color: "text-blue-400 bg-blue-500/10 border-blue-500/20", emoji: "🔨" },
  beta: { label: "Beta", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20", emoji: "🧪" },
  launched: { label: "Launched", color: "text-green-400 bg-green-500/10 border-green-500/20", emoji: "🚀" },
  scaling: { label: "Scaling", color: "text-purple-400 bg-purple-500/10 border-purple-500/20", emoji: "📈" },
  internal: { label: "Internal Tool", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20", emoji: "🏠" },
};

function parseNotes(notes: string | null | undefined): SaasNotes {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

export function SaasOverviewTab({ clientId, clientName, onOpenTaskDetail }: Props) {
  const { isDark } = useTheme();
  const [data, setData] = useState<SaasNotes>({});
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const client = await api.getClient(clientId);
        setData(parseNotes(client.notes));
        
        // Fetch tasks
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/clients/${clientId}/tasks`);
        if (res.ok) {
          const taskData = await res.json();
          setTasks(Array.isArray(taskData) ? taskData : taskData.tasks || []);
        }
      } catch (e) {
        console.error("SaaS overview load error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [clientId]);

  const bgCls = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const cardBg = isDark ? "bg-[#0c0c10] border-white/5" : "bg-white border-gray-200";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const subtleBg = isDark ? "bg-white/[0.02]" : "bg-gray-50";

  const stage = STAGE_CONFIG[data.stage || "planning"] || STAGE_CONFIG.planning;
  const revenue = data.revenue || 0;
  const target = data.targetRevenue || 1;
  const progress = Math.min((revenue / target) * 100, 100);
  const pendingTasks = tasks.filter(t => t.status === "pending" || t.status === "in_progress");
  const completedTasks = tasks.filter(t => t.status === "completed");
  const totalGoal = 30000; // Bruno's $30K/mo goal

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${bgCls}`}>
        <div className="animate-pulse text-gray-500">Loading product data...</div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full overflow-auto ${bgCls}`}>
      <div className="p-4 space-y-5 max-w-4xl mx-auto w-full">
        {/* Product Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border ${cardBg} p-5`}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className={`text-xl font-bold ${text}`}>
                  {clientName || "Product"}
                </h1>
                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${stage.color}`}>
                  {stage.emoji} {stage.label}
                </span>
              </div>
              <p className={`text-sm ${muted}`}>{data.description || "No description"}</p>
              {data.url && (
                <a
                  href={data.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:text-blue-300 mt-1 inline-block"
                >
                  {data.url} ↗
                </a>
              )}
            </div>
          </div>
          {data.techStack && (
            <div className="mt-3 flex items-center gap-2">
              <span className={`text-xs ${muted}`}>Tech:</span>
              <span className={`text-xs ${text}`}>{data.techStack}</span>
            </div>
          )}
        </motion.div>

        {/* Revenue Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className={`rounded-xl border ${cardBg} p-5`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-emerald-500/80 mb-4">
            💰 Revenue
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <p className={`text-2xl font-bold ${text}`}>
                ${revenue.toLocaleString()}
              </p>
              <p className={`text-xs ${muted}`}>Current MRR</p>
            </div>
            <div>
              <p className={`text-2xl font-bold text-emerald-400`}>
                ${(data.targetRevenue || 0).toLocaleString()}
              </p>
              <p className={`text-xs ${muted}`}>Target MRR</p>
            </div>
            <div>
              <p className={`text-2xl font-bold ${revenue > 0 ? "text-emerald-400" : "text-amber-400"}`}>
                {data.customers ?? 0}
              </p>
              <p className={`text-xs ${muted}`}>Customers</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className={muted}>Progress to target</span>
              <span className={text}>{progress.toFixed(0)}%</span>
            </div>
            <div className={`w-full h-2.5 rounded-full ${isDark ? "bg-white/5" : "bg-gray-200"}`}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
              />
            </div>
            <p className={`text-xs ${muted}`}>
              ${((data.targetRevenue || 0) - revenue).toLocaleString()}/mo needed to hit target
            </p>
          </div>
        </motion.div>

        {/* $30K Combined Goal */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl border border-purple-500/20 bg-purple-500/5 p-5`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-purple-400/80 mb-3">
            🎯 $30K/mo Goal — June 2026
          </h2>
          <div className="flex items-center gap-4 mb-3">
            <p className={`text-3xl font-bold ${text}`}>
              ${revenue.toLocaleString()}
              <span className={`text-lg ${muted}`}> / ${totalGoal.toLocaleString()}</span>
            </p>
          </div>
          <div className={`w-full h-3 rounded-full ${isDark ? "bg-white/5" : "bg-gray-200"}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((revenue / totalGoal) * 100, 100)}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-400"
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className={`text-xs ${muted}`}>
              {((revenue / totalGoal) * 100).toFixed(1)}% complete
            </span>
            <span className={`text-xs ${muted}`}>
              ~{Math.ceil((new Date("2026-06-30").getTime() - Date.now()) / (7 * 86400000))} weeks left
            </span>
          </div>
        </motion.div>

        {/* Goals & Milestones */}
        {data.goals && data.goals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className={`rounded-xl border ${cardBg} p-5`}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-amber-500/80 mb-3">
              🎯 Goals & Milestones
            </h2>
            <ul className="space-y-2">
              {data.goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5">◻</span>
                  <span className={`text-sm ${text}`}>{goal}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Competitors */}
        {data.competitors && data.competitors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`rounded-xl border ${cardBg} p-5`}
          >
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-500/80 mb-3">
              ⚔️ Competitors
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.competitors.map((comp, i) => (
                <span
                  key={i}
                  className={`text-xs px-3 py-1.5 rounded-full border ${isDark ? "border-white/10 bg-white/[0.03] text-[#c4b8a8]" : "border-gray-200 bg-gray-50 text-gray-700"}`}
                >
                  {comp}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Tasks Summary */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`rounded-xl border ${cardBg} p-5`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-500/80 mb-3">
            📋 Tasks
          </h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className={`text-center p-3 rounded-lg ${subtleBg}`}>
              <p className={`text-2xl font-bold text-amber-400`}>{pendingTasks.length}</p>
              <p className={`text-xs ${muted}`}>Pending</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${subtleBg}`}>
              <p className={`text-2xl font-bold text-emerald-400`}>{completedTasks.length}</p>
              <p className={`text-xs ${muted}`}>Completed</p>
            </div>
            <div className={`text-center p-3 rounded-lg ${subtleBg}`}>
              <p className={`text-2xl font-bold ${text}`}>{tasks.length}</p>
              <p className={`text-xs ${muted}`}>Total</p>
            </div>
          </div>
          {pendingTasks.length > 0 && (
            <div className="space-y-2">
              <p className={`text-xs font-medium ${muted} uppercase`}>Next up:</p>
              {pendingTasks.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  onClick={() => onOpenTaskDetail?.(task.id)}
                  className={`w-full text-left rounded-lg p-3 border ${isDark ? "border-white/5 hover:border-white/10 bg-white/[0.02]" : "border-gray-100 hover:border-gray-200 bg-gray-50"} transition-colors`}
                >
                  <p className={`text-sm font-medium ${text}`}>{task.title}</p>
                  {task.description && (
                    <p className={`text-xs ${muted} mt-0.5 line-clamp-1`}>{task.description}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
