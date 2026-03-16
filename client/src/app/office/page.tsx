"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

// ─── Agent Definitions ──────────────────────────────────────
type AgentDef = {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  skills: string[];
  desk: string; // office area
};

const AGENTS: AgentDef[] = [
  {
    id: "founder-boss",
    name: "Boss",
    role: "Strategic Command",
    emoji: "👔",
    color: "from-amber-600 to-yellow-500",
    skills: ["Decisions", "Overrides", "Briefings", "Risk Assessment"],
    desk: "corner-office",
  },
  {
    id: "meta-traffic",
    name: "Meta Traffic",
    role: "Media Buyer",
    emoji: "📊",
    color: "from-blue-600 to-cyan-500",
    skills: ["Campaign Mgmt", "Budget Optimization", "A/B Testing", "ROAS Tracking"],
    desk: "ads-wing",
  },
  {
    id: "content-system",
    name: "Content Intelligence",
    role: "Content Strategist",
    emoji: "🧠",
    color: "from-purple-600 to-pink-500",
    skills: ["Brand Analysis", "Hook Generation", "Content Calendar", "Trend Intelligence"],
    desk: "creative-studio",
  },
  {
    id: "research-intel",
    name: "Research Intel",
    role: "Intelligence Analyst",
    emoji: "🔍",
    color: "from-emerald-600 to-teal-500",
    skills: ["AI Scanning", "Competitor Analysis", "Trend Detection", "Opportunity Mining"],
    desk: "intel-lab",
  },
  {
    id: "growth-strategist",
    name: "Growth Strategist",
    role: "Revenue Architect",
    emoji: "🚀",
    color: "from-orange-600 to-red-500",
    skills: ["Revenue Strategy", "Upsell Detection", "Market Analysis", "Goal Tracking"],
    desk: "strategy-room",
  },
  {
    id: "project-manager",
    name: "Project Manager",
    role: "Operations Lead",
    emoji: "📋",
    color: "from-indigo-600 to-blue-500",
    skills: ["Task Coordination", "SLA Monitoring", "Timeline Mgmt", "Team Routing"],
    desk: "ops-center",
  },
  {
    id: "client-memory",
    name: "Client Memory",
    role: "Knowledge Keeper",
    emoji: "🗄️",
    color: "from-slate-600 to-gray-500",
    skills: ["Profile Storage", "Context Recall", "Preference Tracking", "History"],
    desk: "archives",
  },
  {
    id: "inbox-triage",
    name: "Inbox Triage",
    role: "Communications",
    emoji: "📬",
    color: "from-rose-600 to-pink-500",
    skills: ["Message Routing", "Priority Sorting", "Response Drafts", "Escalation"],
    desk: "front-desk",
  },
  {
    id: "approval-feedback",
    name: "Approval Gate",
    role: "Quality Control",
    emoji: "✅",
    color: "from-green-600 to-emerald-500",
    skills: ["Content Review", "Action Approval", "Feedback Loop", "Standards"],
    desk: "review-room",
  },
];

// ─── Types ──────────────────────────────────────────────────
type AgentAction = {
  id: string;
  agentId?: string;
  agentName?: string;
  title: string;
  status: string;
  clientName?: string;
  createdAt: string;
};

type AgentStatus = "active" | "idle" | "completed";

// ─── Office Areas ───────────────────────────────────────────
const OFFICE_AREAS: Record<string, { label: string; icon: string }> = {
  "corner-office": { label: "Corner Office", icon: "🏢" },
  "ads-wing": { label: "Ads Wing", icon: "💰" },
  "creative-studio": { label: "Creative Studio", icon: "🎨" },
  "intel-lab": { label: "Intel Lab", icon: "🔬" },
  "strategy-room": { label: "Strategy Room", icon: "📈" },
  "ops-center": { label: "Ops Center", icon: "⚙️" },
  "archives": { label: "Archives", icon: "📚" },
  "front-desk": { label: "Front Desk", icon: "🏪" },
  "review-room": { label: "Review Room", icon: "🔎" },
};

export default function OfficePage() {
  const { isDark } = useTheme();
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/agent-actions`
        );
        if (res.ok) {
          const data = await res.json();
          setActions(data.actions || data || []);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // Refresh every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  function getAgentStatus(agentId: string): AgentStatus {
    const agentActions = actions.filter(
      (a) => (a.agentId || a.agentName) === agentId
    );
    if (agentActions.length === 0) return "idle";
    const hasActive = agentActions.some((a) =>
      ["pending", "proposed", "approved", "executing"].includes(a.status)
    );
    if (hasActive) return "active";
    return "completed";
  }

  function getAgentActions(agentId: string): AgentAction[] {
    return actions
      .filter((a) => (a.agentId || a.agentName) === agentId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 10);
  }

  function getStatusConfig(status: AgentStatus) {
    switch (status) {
      case "active":
        return {
          label: "Working",
          dot: "bg-green-400",
          pulse: true,
          text: "text-green-400",
        };
      case "completed":
        return {
          label: "Tasks Done",
          dot: "bg-blue-400",
          pulse: false,
          text: "text-blue-400",
        };
      case "idle":
        return {
          label: "Standing By",
          dot: "bg-gray-500",
          pulse: false,
          text: "text-gray-500",
        };
    }
  }

  const totalActions = actions.length;
  const activeAgents = AGENTS.filter(
    (a) => getAgentStatus(a.id) === "active"
  ).length;
  const completedActions = actions.filter(
    (a) => a.status === "completed"
  ).length;

  const bg = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const cardBg = isDark
    ? "bg-[#0c0c10] border-white/5"
    : "bg-white border-gray-200";

  const selectedAgentDef = AGENTS.find((a) => a.id === selectedAgent);
  const selectedAgentActions = selectedAgent
    ? getAgentActions(selectedAgent)
    : [];

  return (
    <div className={`min-h-screen ${bg} p-4 sm:p-6`}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className={`text-2xl font-bold ${text}`}>
              🏢 2FLY AI Office
            </h1>
            <p className={`text-sm ${muted} mt-1`}>
              Your AI team, working 24/7
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className={`text-2xl font-bold text-green-400`}>
                {activeAgents}
              </p>
              <p className={`text-xs ${muted}`}>Active</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold ${text}`}>{AGENTS.length}</p>
              <p className={`text-xs ${muted}`}>Agents</p>
            </div>
            <div className="text-center">
              <p className={`text-2xl font-bold text-blue-400`}>
                {completedActions}
              </p>
              <p className={`text-xs ${muted}`}>Done</p>
            </div>
          </div>
        </motion.div>

        {/* Office Floor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map((agent, i) => {
            const status = getAgentStatus(agent.id);
            const statusConfig = getStatusConfig(status);
            const agentActions = getAgentActions(agent.id);
            const latestAction = agentActions[0];
            const isSelected = selectedAgent === agent.id;
            const area = OFFICE_AREAS[agent.desk];

            return (
              <motion.button
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() =>
                  setSelectedAgent(isSelected ? null : agent.id)
                }
                className={`relative text-left rounded-xl border ${cardBg} p-5 transition-all duration-200 ${
                  isSelected
                    ? "ring-2 ring-indigo-500/50 border-indigo-500/30"
                    : "hover:border-white/10"
                }`}
              >
                {/* Status indicator */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${statusConfig.dot} ${
                      statusConfig.pulse ? "animate-pulse" : ""
                    }`}
                  />
                  <span className={`text-xs ${statusConfig.text}`}>
                    {statusConfig.label}
                  </span>
                </div>

                {/* Agent Avatar */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl shadow-lg`}
                  >
                    {agent.emoji}
                  </div>
                  <div>
                    <p className={`font-semibold ${text}`}>{agent.name}</p>
                    <p className={`text-xs ${muted}`}>{agent.role}</p>
                  </div>
                </div>

                {/* Office Area */}
                <div
                  className={`text-xs ${muted} mb-3 flex items-center gap-1`}
                >
                  <span>{area?.icon}</span>
                  <span>{area?.label}</span>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.skills.slice(0, 3).map((skill) => (
                    <span
                      key={skill}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        isDark
                          ? "bg-white/[0.04] text-[#8a7e6d]"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Latest Activity */}
                {latestAction ? (
                  <div
                    className={`text-xs ${muted} border-t ${
                      isDark ? "border-white/5" : "border-gray-100"
                    } pt-2 mt-2`}
                  >
                    <span className="opacity-60">Latest:</span>{" "}
                    <span className={text}>
                      {latestAction.title.slice(0, 40)}
                      {latestAction.title.length > 40 ? "…" : ""}
                    </span>
                    {latestAction.clientName && (
                      <span className="opacity-60">
                        {" "}
                        — {latestAction.clientName}
                      </span>
                    )}
                  </div>
                ) : (
                  <div
                    className={`text-xs ${muted} border-t ${
                      isDark ? "border-white/5" : "border-gray-100"
                    } pt-2 mt-2 opacity-40`}
                  >
                    No recent activity
                  </div>
                )}

                {/* Action count badge */}
                {agentActions.length > 0 && (
                  <div className="absolute bottom-4 right-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isDark
                          ? "bg-white/[0.06] text-[#c4b8a8]"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {agentActions.length} action
                      {agentActions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Agent Detail Panel */}
        <AnimatePresence>
          {selectedAgentDef && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={`rounded-xl border ${cardBg} p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedAgentDef.color} flex items-center justify-center text-xl`}
                    >
                      {selectedAgentDef.emoji}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${text}`}>
                        {selectedAgentDef.name} — Activity Log
                      </h3>
                      <p className={`text-xs ${muted}`}>
                        {selectedAgentDef.role} •{" "}
                        {OFFICE_AREAS[selectedAgentDef.desk]?.label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedAgent(null)}
                    className={`text-sm ${muted} hover:${text}`}
                  >
                    ✕ Close
                  </button>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedAgentDef.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`text-xs px-3 py-1 rounded-full border ${
                        isDark
                          ? "border-white/10 bg-white/[0.03] text-[#c4b8a8]"
                          : "border-gray-200 bg-gray-50 text-gray-700"
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Action Timeline */}
                {selectedAgentActions.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAgentActions.map((action) => {
                      const statusColor =
                        action.status === "completed"
                          ? "text-green-400"
                          : action.status === "approved"
                          ? "text-blue-400"
                          : action.status === "pending" ||
                            action.status === "proposed"
                          ? "text-amber-400"
                          : "text-gray-400";
                      const statusIcon =
                        action.status === "completed"
                          ? "✅"
                          : action.status === "approved"
                          ? "👍"
                          : action.status === "pending" ||
                            action.status === "proposed"
                          ? "⏳"
                          : "•";

                      return (
                        <div
                          key={action.id}
                          className={`flex items-start gap-3 p-3 rounded-lg ${
                            isDark ? "bg-white/[0.02]" : "bg-gray-50"
                          }`}
                        >
                          <span className="text-sm mt-0.5">{statusIcon}</span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${text}`}>
                              {action.title}
                            </p>
                            <div
                              className={`flex items-center gap-2 mt-0.5 text-xs ${muted}`}
                            >
                              <span className={statusColor}>
                                {action.status}
                              </span>
                              {action.clientName && (
                                <>
                                  <span>•</span>
                                  <span>{action.clientName}</span>
                                </>
                              )}
                              <span>•</span>
                              <span>
                                {new Date(action.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  }
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`text-center py-8 ${muted}`}
                  >
                    <p className="text-lg mb-1">💤</p>
                    <p className="text-sm">
                      No actions recorded yet. This agent is standing by.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Daily Standup Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`rounded-xl border ${cardBg} p-6`}
        >
          <h2
            className={`text-sm font-semibold uppercase tracking-wider ${
              isDark ? "text-amber-500/80" : "text-amber-600"
            } mb-4`}
          >
            📋 Today&apos;s Standup
          </h2>
          <div className="space-y-3">
            {AGENTS.filter((a) => getAgentActions(a.id).length > 0).map(
              (agent) => {
                const agentActs = getAgentActions(agent.id);
                const completed = agentActs.filter(
                  (a) => a.status === "completed"
                ).length;
                const pending = agentActs.filter((a) =>
                  ["pending", "proposed", "approved"].includes(a.status)
                ).length;

                return (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      isDark ? "bg-white/[0.02]" : "bg-gray-50"
                    }`}
                  >
                    <span className="text-lg">{agent.emoji}</span>
                    <div className="flex-1">
                      <span className={`text-sm font-medium ${text}`}>
                        {agent.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {completed > 0 && (
                        <span className="text-green-400">
                          ✅ {completed} done
                        </span>
                      )}
                      {pending > 0 && (
                        <span className="text-amber-400">
                          ⏳ {pending} pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
            {AGENTS.filter((a) => getAgentActions(a.id).length > 0).length ===
              0 && (
              <p className={`text-sm ${muted} text-center py-4`}>
                No agent activity today. Agents are standing by.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
