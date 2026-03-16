"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

// ─── Agent Definitions ──────────────────────────────────────
type AgentDef = {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  skills: string[];
  desk: string;
  schedule: string;
  personality: string; // idle speech bubble
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
    schedule: "Always on",
    personality: "Reviewing the numbers...",
  },
  {
    id: "meta-traffic",
    name: "Meta Traffic",
    role: "Media Buyer",
    emoji: "📊",
    color: "from-blue-600 to-cyan-500",
    skills: ["Campaign Mgmt", "Budget Optimization", "A/B Testing", "ROAS Tracking"],
    desk: "ads-wing",
    schedule: "9AM · 4PM · 10PM",
    personality: "Watching the ROAS like a hawk...",
  },
  {
    id: "content-system",
    name: "Content Intelligence",
    role: "Content Strategist",
    emoji: "🧠",
    color: "from-purple-600 to-pink-500",
    skills: ["Brand Analysis", "Hook Generation", "Content Calendar", "Trend Intelligence"],
    desk: "creative-studio",
    schedule: "9AM · 4PM · 10PM",
    personality: "Brainstorming hooks...",
  },
  {
    id: "research-intel",
    name: "Research Intel",
    role: "Intelligence Analyst",
    emoji: "🔍",
    color: "from-emerald-600 to-teal-500",
    skills: ["AI Scanning", "Competitor Analysis", "Trend Detection", "Opportunity Mining"],
    desk: "intel-lab",
    schedule: "8AM daily · Sun 8PM digest",
    personality: "Scanning the internet...",
  },
  {
    id: "growth-strategist",
    name: "Growth Strategist",
    role: "Revenue Architect",
    emoji: "🚀",
    color: "from-orange-600 to-red-500",
    skills: ["Revenue Strategy", "Upsell Detection", "Market Analysis", "Goal Tracking"],
    desk: "strategy-room",
    schedule: "Monday 9AM",
    personality: "Crunching growth numbers...",
  },
  {
    id: "project-manager",
    name: "Project Manager",
    role: "Operations Lead",
    emoji: "📋",
    color: "from-indigo-600 to-blue-500",
    skills: ["Task Coordination", "SLA Monitoring", "Timeline Mgmt", "Team Routing"],
    desk: "ops-center",
    schedule: "Every 1-2 hours",
    personality: "Checking SLA deadlines...",
  },
  {
    id: "client-memory",
    name: "Client Memory",
    role: "Knowledge Keeper",
    emoji: "🗄️",
    color: "from-slate-600 to-gray-500",
    skills: ["Profile Storage", "Context Recall", "Preference Tracking", "History"],
    desk: "archives",
    schedule: "On demand",
    personality: "Organizing client files...",
  },
  {
    id: "inbox-triage",
    name: "Inbox Triage",
    role: "Communications",
    emoji: "📬",
    color: "from-rose-600 to-pink-500",
    skills: ["Message Routing", "Priority Sorting", "Response Drafts", "Escalation"],
    desk: "front-desk",
    schedule: "Always on",
    personality: "Sorting incoming messages...",
  },
  {
    id: "approval-feedback",
    name: "Approval Gate",
    role: "Quality Control",
    emoji: "✅",
    color: "from-green-600 to-emerald-500",
    skills: ["Content Review", "Action Approval", "Feedback Loop", "Standards"],
    desk: "review-room",
    schedule: "On demand",
    personality: "Reviewing pending approvals...",
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
  updatedAt?: string;
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

// ─── XP / Level System ─────────────────────────────────────
function getAgentLevel(actionCount: number): { level: number; title: string; xp: number; nextXp: number } {
  if (actionCount >= 50) return { level: 10, title: "Legendary", xp: actionCount, nextXp: 100 };
  if (actionCount >= 30) return { level: 8, title: "Master", xp: actionCount, nextXp: 50 };
  if (actionCount >= 20) return { level: 6, title: "Expert", xp: actionCount, nextXp: 30 };
  if (actionCount >= 10) return { level: 4, title: "Skilled", xp: actionCount, nextXp: 20 };
  if (actionCount >= 5) return { level: 3, title: "Trained", xp: actionCount, nextXp: 10 };
  if (actionCount >= 2) return { level: 2, title: "Rookie", xp: actionCount, nextXp: 5 };
  return { level: 1, title: "New", xp: actionCount, nextXp: 2 };
}

// ─── Floating particles ────────────────────────────────────
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-indigo-500/20"
          initial={{
            x: Math.random() * 100 + "%",
            y: Math.random() * 100 + "%",
            opacity: 0,
          }}
          animate={{
            y: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
            x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 8,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
}

// ─── Speech Bubble ──────────────────────────────────────────
function SpeechBubble({ text, isActive }: { text: string; isActive: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -5, scale: 0.9 }}
      className={`absolute -top-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] px-2.5 py-1 rounded-lg ${
        isActive
          ? "bg-green-500/20 text-green-300 border border-green-500/30"
          : "bg-white/5 text-gray-400 border border-white/10"
      }`}
    >
      {text}
      <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 ${
        isActive ? "bg-green-500/20 border-r border-b border-green-500/30" : "bg-white/5 border-r border-b border-white/10"
      }`} />
    </motion.div>
  );
}

// ─── XP Bar ─────────────────────────────────────────────────
function XPBar({ level, xp, nextXp, title }: { level: number; xp: number; nextXp: number; title: string }) {
  const progress = Math.min((xp / nextXp) * 100, 100);
  return (
    <div className="flex items-center gap-2 mt-2">
      <span className="text-[10px] font-bold text-amber-400">Lv.{level}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
        />
      </div>
      <span className="text-[10px] text-gray-500">{title}</span>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export default function OfficePage() {
  const { isDark } = useTheme();
  const [actions, setActions] = useState<AgentAction[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [prevActionCount, setPrevActionCount] = useState(0);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/agent-actions`
      );
      if (res.ok) {
        const data = await res.json();
        const newActions = data.actions || data || [];
        
        // Notification for new completed actions
        if (prevActionCount > 0 && newActions.length > prevActionCount) {
          const latest = newActions[0];
          if (latest?.status === "completed") {
            toast.success(`${latest.agentName || latest.agentId} completed: ${latest.title.slice(0, 40)}`, {
              duration: 5000,
            });
          }
        }
        setPrevActionCount(newActions.length);
        setActions(newActions);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [prevActionCount]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  // Quick chat with agent
  async function handleChat(agentId: string) {
    if (!chatMessage.trim()) return;
    setChatLoading(true);
    setChatResponse(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/agents/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent: agentId, message: chatMessage }),
        }
      );
      const data = await res.json();
      setChatResponse(data.response || data.error || "No response");
      setChatMessage("");
    } catch (e) {
      setChatResponse("Failed to reach agent");
    } finally {
      setChatLoading(false);
    }
  }

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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);
  }

  function getSpeechBubble(agent: AgentDef): string {
    const agentActs = getAgentActions(agent.id);
    const latest = agentActs[0];
    if (latest && ["pending", "proposed", "executing"].includes(latest.status)) {
      return `Working on: ${latest.title.slice(0, 30)}...`;
    }
    if (latest && latest.status === "completed") {
      const ago = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 60000);
      if (ago < 60) return `✅ Finished "${latest.title.slice(0, 25)}" ${ago}m ago`;
      return agent.personality;
    }
    return agent.personality;
  }

  function getStatusConfig(status: AgentStatus) {
    switch (status) {
      case "active":
        return { label: "Working", dot: "bg-green-400", pulse: true, text: "text-green-400", glow: "shadow-green-500/20" };
      case "completed":
        return { label: "Tasks Done", dot: "bg-blue-400", pulse: false, text: "text-blue-400", glow: "shadow-blue-500/10" };
      case "idle":
        return { label: "Standing By", dot: "bg-gray-500", pulse: false, text: "text-gray-500", glow: "" };
    }
  }

  // Stats
  const totalActions = actions.length;
  const activeAgents = AGENTS.filter((a) => getAgentStatus(a.id) === "active").length;
  const completedActions = actions.filter((a) => a.status === "completed").length;
  const pendingActions = actions.filter((a) => ["pending", "proposed"].includes(a.status)).length;
  const todayActions = actions.filter((a) => {
    const d = new Date(a.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  // Weekly chart data
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weekData = weekDays.map((day, i) => {
    const count = actions.filter((a) => {
      const d = new Date(a.createdAt);
      return d.getDay() === (i + 1) % 7;
    }).length;
    return { day, count };
  });
  const maxWeekCount = Math.max(...weekData.map((d) => d.count), 1);

  const bg = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const cardBg = isDark ? "bg-[#0c0c10] border-white/5" : "bg-white border-gray-200";

  const selectedAgentDef = AGENTS.find((a) => a.id === selectedAgent);

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} p-4 sm:p-6 relative`}>
      <FloatingParticles />
      
      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className={`text-2xl font-bold ${text} flex items-center gap-2`}>
                <motion.span
                  animate={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  🏢
                </motion.span>
                2FLY AI Office
              </h1>
              <p className={`text-sm ${muted} mt-0.5`}>
                Your AI team, working 24/7 · Auto-refreshes every 15s
              </p>
            </div>
          </div>
          
          {/* Stats Bar */}
          <div className={`grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4`}>
            {[
              { label: "Active Now", value: activeAgents, icon: "🟢", color: "text-green-400" },
              { label: "Total Agents", value: AGENTS.length, icon: "🤖", color: text },
              { label: "Completed", value: completedActions, icon: "✅", color: "text-blue-400" },
              { label: "Pending", value: pendingActions, icon: "⏳", color: "text-amber-400" },
              { label: "Today", value: todayActions, icon: "📅", color: "text-purple-400" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl border ${cardBg} p-3 text-center`}
              >
                <p className="text-lg mb-0.5">{stat.icon}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className={`text-[10px] ${muted}`}>{stat.label}</p>
              </motion.div>
            ))}
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
            const isHovered = hoveredAgent === agent.id;
            const area = OFFICE_AREAS[agent.desk];
            const level = getAgentLevel(agentActions.length);

            return (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="relative"
                onMouseEnter={() => setHoveredAgent(agent.id)}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                {/* Speech Bubble */}
                <AnimatePresence>
                  {(isHovered || status === "active") && (
                    <SpeechBubble
                      text={getSpeechBubble(agent)}
                      isActive={status === "active"}
                    />
                  )}
                </AnimatePresence>

                <button
                  onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                  className={`relative w-full text-left rounded-xl border ${cardBg} p-5 transition-all duration-300 ${
                    isSelected
                      ? "ring-2 ring-indigo-500/50 border-indigo-500/30"
                      : "hover:border-white/15 hover:shadow-lg"
                  } ${statusConfig.glow ? `shadow-lg ${statusConfig.glow}` : ""}`}
                >
                  {/* Active glow effect */}
                  {status === "active" && (
                    <motion.div
                      className="absolute inset-0 rounded-xl bg-green-500/5"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}

                  {/* Status indicator */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <motion.span
                      className={`w-2.5 h-2.5 rounded-full ${statusConfig.dot}`}
                      animate={statusConfig.pulse ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] } : {}}
                      transition={statusConfig.pulse ? { duration: 1.5, repeat: Infinity } : {}}
                    />
                    <span className={`text-xs ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                  </div>

                  {/* Agent Avatar with floating animation */}
                  <div className="flex items-start gap-3 mb-2">
                    <motion.div
                      animate={{ y: status === "active" ? [0, -3, 0] : 0 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-2xl shadow-lg relative`}
                    >
                      {agent.emoji}
                      {/* Level badge */}
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#0c0c10] border border-amber-500/50 flex items-center justify-center text-[9px] font-bold text-amber-400">
                        {level.level}
                      </span>
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${text}`}>{agent.name}</p>
                      <p className={`text-xs ${muted}`}>{agent.role}</p>
                      <p className={`text-[10px] ${muted} mt-0.5`}>
                        {area?.icon} {area?.label}
                      </p>
                    </div>
                  </div>

                  {/* XP Bar */}
                  <XPBar {...level} />

                  {/* Schedule */}
                  <div className={`flex items-center gap-1 mt-2 text-[10px] ${muted}`}>
                    <span>⏰</span>
                    <span>{agent.schedule}</span>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.skills.slice(0, 3).map((skill) => (
                      <span
                        key={skill}
                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                          isDark ? "bg-white/[0.04] text-[#8a7e6d]" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  {/* Latest Activity */}
                  {latestAction ? (
                    <div className={`text-xs ${muted} border-t ${isDark ? "border-white/5" : "border-gray-100"} pt-2 mt-3`}>
                      <div className="flex items-center gap-1">
                        <span>
                          {latestAction.status === "completed" ? "✅" : latestAction.status === "approved" ? "👍" : "⏳"}
                        </span>
                        <span className={text}>
                          {latestAction.title.slice(0, 35)}
                          {latestAction.title.length > 35 ? "…" : ""}
                        </span>
                      </div>
                      {latestAction.clientName && (
                        <span className="opacity-60 text-[10px]">
                          for {latestAction.clientName}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className={`text-xs ${muted} border-t ${isDark ? "border-white/5" : "border-gray-100"} pt-2 mt-3 opacity-40`}>
                      💤 No recent activity
                    </div>
                  )}

                  {/* Action count badge */}
                  {agentActions.length > 0 && (
                    <div className="absolute bottom-4 right-4">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isDark ? "bg-white/[0.06] text-[#c4b8a8]" : "bg-gray-100 text-gray-700"
                      }`}>
                        {agentActions.length} action{agentActions.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </button>
              </motion.div>
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
              <div className={`rounded-xl border ${cardBg} p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${selectedAgentDef.color} flex items-center justify-center text-xl`}>
                      {selectedAgentDef.emoji}
                    </div>
                    <div>
                      <h3 className={`font-semibold ${text}`}>
                        {selectedAgentDef.name} — Activity Log
                      </h3>
                      <p className={`text-xs ${muted}`}>
                        {selectedAgentDef.role} · {OFFICE_AREAS[selectedAgentDef.desk]?.label} · ⏰ {selectedAgentDef.schedule}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setChatAgent(selectedAgent); setChatResponse(null); }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                    >
                      💬 Chat
                    </button>
                    <button
                      onClick={() => setSelectedAgent(null)}
                      className={`text-sm ${muted} hover:text-white px-2`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Quick Chat */}
                <AnimatePresence>
                  {chatAgent === selectedAgent && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`mb-4 p-4 rounded-lg border ${isDark ? "border-indigo-500/20 bg-indigo-500/5" : "border-indigo-200 bg-indigo-50"}`}
                    >
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={chatMessage}
                          onChange={(e) => setChatMessage(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && !chatLoading && handleChat(selectedAgent!)}
                          placeholder={`Ask ${selectedAgentDef.name} something...`}
                          className={`flex-1 text-sm px-3 py-2 rounded-lg border ${
                            isDark ? "border-white/10 bg-white/5 text-white placeholder-gray-500" : "border-gray-200 bg-white text-gray-900"
                          } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                          disabled={chatLoading}
                        />
                        <button
                          onClick={() => handleChat(selectedAgent!)}
                          disabled={chatLoading || !chatMessage.trim()}
                          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500 disabled:opacity-50"
                        >
                          {chatLoading ? (
                            <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>⚡</motion.span>
                          ) : "Send"}
                        </button>
                      </div>
                      {chatResponse && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`text-sm p-3 rounded-lg ${isDark ? "bg-white/5 text-[#c4b8a8]" : "bg-white text-gray-700"} max-h-40 overflow-y-auto`}
                        >
                          {chatResponse}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Skills */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedAgentDef.skills.map((skill) => (
                    <span key={skill} className={`text-xs px-3 py-1 rounded-full border ${
                      isDark ? "border-white/10 bg-white/[0.03] text-[#c4b8a8]" : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}>
                      {skill}
                    </span>
                  ))}
                </div>

                {/* Action Timeline */}
                {(() => {
                  const selectedActions = selectedAgent ? getAgentActions(selectedAgent) : [];
                  if (selectedActions.length > 0) {
                    return (
                      <div className="space-y-2">
                        {selectedActions.map((action, idx) => {
                          const statusIcon = action.status === "completed" ? "✅" : action.status === "approved" ? "👍" : "⏳";
                          const statusColor = action.status === "completed" ? "text-green-400" : action.status === "approved" ? "text-blue-400" : "text-amber-400";
                          return (
                            <motion.div
                              key={action.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`flex items-start gap-3 p-3 rounded-lg ${isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}
                            >
                              <span className="text-sm mt-0.5">{statusIcon}</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${text}`}>{action.title}</p>
                                <div className={`flex items-center gap-2 mt-0.5 text-xs ${muted}`}>
                                  <span className={statusColor}>{action.status}</span>
                                  {action.clientName && (<><span>•</span><span>{action.clientName}</span></>)}
                                  <span>•</span>
                                  <span>{new Date(action.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  }
                  return (
                    <div className={`text-center py-8 ${muted}`}>
                      <p className="text-lg mb-1">💤</p>
                      <p className="text-sm">No actions recorded yet. This agent is standing by.</p>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Team Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`rounded-xl border ${cardBg} p-6`}
        >
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-indigo-400/80" : "text-indigo-600"} mb-4`}>
            📊 Team Analytics — Weekly Activity
          </h2>
          <div className="flex items-end justify-between gap-2 h-24 mb-2">
            {weekData.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.count / maxWeekCount) * 80}px` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={`w-full rounded-t-md ${
                    d.count > 0
                      ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                      : "bg-white/5"
                  }`}
                  style={{ minHeight: d.count > 0 ? "8px" : "4px" }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {weekData.map((d) => (
              <div key={d.day} className="flex-1 text-center">
                <p className={`text-[10px] ${muted}`}>{d.day}</p>
                <p className={`text-xs font-medium ${d.count > 0 ? text : muted}`}>{d.count}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Daily Standup */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className={`rounded-xl border ${cardBg} p-6`}
        >
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-amber-500/80" : "text-amber-600"} mb-4`}>
            📋 Daily Standup
          </h2>
          <div className="space-y-3">
            {AGENTS.filter((a) => getAgentActions(a.id).length > 0)
              .sort((a, b) => getAgentActions(b.id).length - getAgentActions(a.id).length)
              .map((agent) => {
                const agentActs = getAgentActions(agent.id);
                const completed = agentActs.filter((a) => a.status === "completed").length;
                const pending = agentActs.filter((a) => ["pending", "proposed", "approved"].includes(a.status)).length;
                const level = getAgentLevel(agentActs.length);

                return (
                  <div key={agent.id} className={`flex items-center gap-3 p-3 rounded-lg ${isDark ? "bg-white/[0.02]" : "bg-gray-50"}`}>
                    <motion.span
                      className="text-lg"
                      animate={getAgentStatus(agent.id) === "active" ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {agent.emoji}
                    </motion.span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${text}`}>{agent.name}</span>
                        <span className="text-[10px] text-amber-400 font-bold">Lv.{level.level}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      {completed > 0 && <span className="text-green-400">✅ {completed}</span>}
                      {pending > 0 && <span className="text-amber-400">⏳ {pending}</span>}
                    </div>
                  </div>
                );
              })}
            {AGENTS.filter((a) => getAgentActions(a.id).length > 0).length === 0 && (
              <p className={`text-sm ${muted} text-center py-4`}>
                No agent activity today. Team is standing by.
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
