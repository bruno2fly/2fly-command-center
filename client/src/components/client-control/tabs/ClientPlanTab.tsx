"use client";

import { useState, useEffect, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { useClientPlan } from "@/hooks/useClientPlan";
import type { PlanGoal, PlanRoadmapItem, GoalStatus, RoadmapStatus } from "@/hooks/useClientPlan";

function formatDateDisplay(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function generateId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const GOAL_STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "achieved", label: "Achieved" },
  { value: "at_risk", label: "At Risk" },
  { value: "paused", label: "Paused" },
];

const QUARTERS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];

function AnimatedNumber({ value, duration = 400 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let rafId: number;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) * (1 - t);
      setDisplay(Math.round(eased * value));
      if (t < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, duration]);
  return <>{display}</>;
}

type Props = {
  clientId: string;
};

export function ClientPlanTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const { goals, roadmap, setGoals, setRoadmap, apiData, hydrated } = useClientPlan(clientId);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editingRoadmapId, setEditingRoadmapId] = useState<string | null>(null);

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const headerCls = "text-xs font-semibold uppercase tracking-wider " + mutedCls;

  const goalStatusBorder: Record<GoalStatus, string> = {
    active: "border-l-blue-500",
    achieved: "border-l-emerald-500",
    at_risk: "border-l-amber-500",
    paused: "border-l-gray-400",
  };

  const goalStatusPill: Record<GoalStatus, string> = {
    active: isDark ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-blue-100 text-blue-700 border-blue-200",
    achieved: isDark ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-emerald-100 text-emerald-700 border-emerald-200",
    at_risk: isDark ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-amber-100 text-amber-700 border-amber-200",
    paused: isDark ? "bg-gray-500/20 text-gray-400 border-gray-500/30" : "bg-gray-100 text-gray-600 border-gray-200",
  };

  const addGoal = () => {
    const newGoal: PlanGoal = {
      id: generateId(),
      clientId,
      text: "New goal",
      status: "active",
      targetDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
    };
    setGoals((prev) => [...prev, newGoal]);
    setEditingGoalId(newGoal.id);
  };

  const updateGoal = (id: string, patch: Partial<PlanGoal>) => {
    setGoals((prev) => prev.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const addRoadmapItem = (quarter: string) => {
    const newItem: PlanRoadmapItem = {
      id: generateId(),
      clientId,
      title: "New initiative",
      quarter,
      status: "planned",
    };
    setRoadmap((prev) => [...prev, newItem]);
    setEditingRoadmapId(newItem.id);
  };

  const updateRoadmapItem = (id: string, patch: Partial<PlanRoadmapItem>) => {
    setRoadmap((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const roadmapByQuarter = useMemo(() => {
    const map: Record<string, PlanRoadmapItem[]> = {};
    for (const q of QUARTERS) map[q] = [];
    for (const r of roadmap) {
      if (map[r.quarter]) map[r.quarter].push(r);
    }
    return map;
  }, [roadmap]);

  if (!hydrated) {
    return (
      <div className={`flex-1 overflow-auto p-6 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
        <div className={mutedCls}>Loading plan…</div>
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-auto p-6 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      <div className="max-w-4xl space-y-10">
        {/* ——— GOALS ——— */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className={headerCls}>Goals</h2>
            <button
              type="button"
              onClick={addGoal}
              className={`text-xs font-medium px-3 py-2 rounded-lg border border-dashed ${cardBorder} ${mutedCls} hover:border-blue-500/50 hover:text-blue-500 transition-all duration-200`}
            >
              + Add goal
            </button>
          </div>
          <ul className="space-y-3">
            <AnimatePresence mode="popLayout">
              {goals.length === 0 ? (
                <motion.li
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`text-sm py-6 ${mutedCls}`}
                >
                  No goals. Click “+ Add goal” to create one.
                </motion.li>
              ) : (
                goals.map((g, i) => (
                  <motion.li
                    key={g.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: i * 0.05, duration: 0.2 }}
                    className={`rounded-xl border ${cardBorder} ${cardBg} border-l-[3px] ${goalStatusBorder[g.status]} p-4 transition-all duration-200 hover:shadow-md`}
                  >
                    {editingGoalId === g.id ? (
                      <div className="space-y-3">
                        <input
                          value={g.text}
                          onChange={(e) => updateGoal(g.id, { text: e.target.value })}
                          className={`w-full text-sm font-medium rounded-lg border ${cardBorder} ${isDark ? "bg-[#0f172a] text-[#c4b8a8]" : "bg-gray-50 text-gray-900"} px-3 py-2`}
                          placeholder="Goal text"
                          autoFocus
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="date"
                            value={g.targetDate ?? ""}
                            onChange={(e) => updateGoal(g.id, { targetDate: e.target.value || null })}
                            className={`text-xs rounded border ${cardBorder} ${isDark ? "bg-[#0f172a]" : "bg-gray-50"} px-2 py-1.5`}
                          />
                          <select
                            value={g.status}
                            onChange={(e) => updateGoal(g.id, { status: e.target.value as GoalStatus })}
                            className={`text-xs rounded border ${cardBorder} ${isDark ? "bg-[#0f172a] text-[#c4b8a8]" : "bg-gray-50"} px-2 py-1.5`}
                          >
                            {GOAL_STATUS_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setEditingGoalId(null)}
                            className="text-xs font-medium text-blue-500 hover:underline"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingGoalId(g.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className={`text-sm font-medium ${textCls}`}>{g.text}</p>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs ${mutedCls}`}>{formatDateDisplay(g.targetDate)}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${goalStatusPill[g.status]}`}>
                              {GOAL_STATUS_OPTIONS.find((o) => o.value === g.status)?.label ?? g.status}
                            </span>
                          </div>
                        </div>
                      </button>
                    )}
                  </motion.li>
                ))
              )}
            </AnimatePresence>
          </ul>
        </section>

        {/* ——— ROADMAP TIMELINE ——— */}
        <section>
          <h2 className={`${headerCls} mb-4`}>Roadmap</h2>
          <div className="overflow-x-auto pb-4">
            <div className="min-w-[600px]">
              {/* Quarter labels above line */}
              <div className="flex justify-between mb-1">
                {QUARTERS.map((q) => (
                  <p key={q} className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>
                    {q}
                  </p>
                ))}
              </div>
              {/* Horizontal line with nodes */}
              <div className="relative h-2 flex items-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500 to-blue-500/20"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                />
                {QUARTERS.map((_, i) => (
                  <div
                    key={QUARTERS[i]}
                    className="absolute w-3 h-3 rounded-full bg-gray-400 shrink-0 z-10"
                    style={{ left: `${(i / (QUARTERS.length - 1)) * 100}%`, transform: "translate(-50%, -50%)", top: "50%" }}
                  />
                ))}
              </div>
              <div className="flex flex-col md:flex-row md:justify-between mt-4 relative gap-6 md:gap-0">
                {QUARTERS.map((q) => (
                  <div key={q} className="flex flex-col items-center flex-1 md:max-w-[25%]">
                    <div className="mt-3 space-y-2 w-full max-w-[200px]">
                      {roadmapByQuarter[q]?.map((r) => (
                        <motion.div
                          key={r.id}
                          layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`rounded-xl border ${cardBorder} ${cardBg} p-3 transition-all duration-200 hover:shadow-md flex items-center gap-2`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              r.status === "in_progress"
                                ? "bg-blue-500 ring-4 ring-blue-500/20 animate-pulse"
                                : r.status === "done"
                                  ? "bg-emerald-500"
                                  : "bg-gray-400"
                            }`}
                          />
                          {editingRoadmapId === r.id ? (
                            <div className="flex-1 space-y-2">
                              <input
                                value={r.title}
                                onChange={(e) => updateRoadmapItem(r.id, { title: e.target.value })}
                                className={`w-full text-xs rounded border ${cardBorder} ${isDark ? "bg-[#0f172a] text-[#c4b8a8]" : "bg-gray-50"} px-2 py-1.5`}
                                autoFocus
                              />
                              <select
                                value={r.status}
                                onChange={(e) => updateRoadmapItem(r.id, { status: e.target.value as RoadmapStatus })}
                                className={`text-[10px] rounded border ${cardBorder} ${isDark ? "bg-[#0f172a]" : "bg-gray-50"} px-2 py-1`}
                              >
                                <option value="planned">Planned</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Completed</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setEditingRoadmapId(null)}
                                className="text-[10px] text-blue-500"
                              >
                                Done
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setEditingRoadmapId(r.id)}
                              className="flex-1 text-left min-w-0"
                            >
                              <p className={`text-xs font-medium truncate ${textCls}`}>{r.title}</p>
                              <p className={`text-[10px] mt-0.5 ${mutedCls}`}>
                                {r.status === "in_progress" ? "In Progress" : r.status === "done" ? "Completed" : "Planned"}
                              </p>
                            </button>
                          )}
                        </motion.div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addRoadmapItem(q)}
                        className={`w-full rounded-xl border border-dashed ${cardBorder} py-2 text-[10px] ${mutedCls} hover:border-blue-500/50 hover:text-blue-500 transition-colors`}
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ——— KEY KPIs ——— */}
        <section>
          <h2 className={`${headerCls} mb-4`}>Key KPIs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {/* MQLs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <p className={headerCls}>MQLs</p>
              <p className={`text-2xl font-bold mt-1 ${textCls}`}>—</p>
              <p className={`text-[10px] mt-1 ${mutedCls}`}>Connect CRM</p>
            </motion.div>

            {/* ROAS */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className={`rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <p className={headerCls}>ROAS</p>
              <p className={`text-2xl font-bold mt-1 ${textCls}`}>
                {apiData.roasFromAds != null ? `${apiData.roasFromAds}x` : apiData.roasTarget != null ? `${apiData.roasTarget}x` : "—"}
              </p>
              {apiData.roasFromAds == null && apiData.roasTarget != null && (
                <p className={`text-[10px] mt-1 ${mutedCls}`}>Target</p>
              )}
            </motion.div>

            {/* Content Delivery */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <p className={headerCls}>Content Delivery</p>
              <p className={`text-2xl font-bold mt-1 ${textCls}`}>
                {apiData.contentDeliveryPct != null ? <AnimatedNumber value={apiData.contentDeliveryPct} /> : "—"}
                {apiData.contentDeliveryPct != null ? "%" : ""}
              </p>
            </motion.div>

            {/* Active Requests */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className={`rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <p className={headerCls}>Active Requests</p>
              <p className={`text-2xl font-bold mt-1 ${textCls}`}>
                <AnimatedNumber value={apiData.activeRequestsCount} />
              </p>
            </motion.div>

            {/* Retainer */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <p className={headerCls}>Retainer</p>
              <p className={`text-2xl font-bold mt-1 ${textCls}`}>
                {apiData.retainer != null && apiData.retainer > 0
                  ? `$${apiData.retainer.toLocaleString()}`
                  : "—"}
              </p>
            </motion.div>

            {/* Ad Spend */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className={`rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <p className={headerCls}>Ad Spend</p>
              <p className={`text-2xl font-bold mt-1 ${textCls}`}>
                {apiData.adSpend != null ? `$${apiData.adSpend.toLocaleString()}` : "—"}
              </p>
            </motion.div>

            {/* Health Score */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className={`rounded-2xl border ${cardBorder} ${cardBg} p-4 transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
            >
              <p className={headerCls}>Health Score</p>
              <div className="mt-1">
                {apiData.healthOverall ? (
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${
                      apiData.healthOverall === "green"
                        ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30"
                        : apiData.healthOverall === "yellow"
                          ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                          : "bg-red-500/20 text-red-500 border border-red-500/30"
                    }`}
                  >
                    {apiData.healthOverall.charAt(0).toUpperCase() + apiData.healthOverall.slice(1)}
                  </span>
                ) : (
                  <span className={mutedCls}>—</span>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
