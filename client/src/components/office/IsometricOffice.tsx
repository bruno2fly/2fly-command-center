"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────
type AgentStatus = "active" | "idle" | "completed";

type AgentDef = {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  desk: string;
  schedule: string;
  personality: string;
};

type AgentAction = {
  id: string;
  agentId?: string;
  agentName?: string;
  title: string;
  status: string;
  clientName?: string;
  createdAt: string;
};

// ─── Agent Data ─────────────────────────────────────────────
const AGENTS: AgentDef[] = [
  { id: "founder-boss", name: "Boss", role: "Strategic Command", emoji: "👔", color: "#f59e0b", desk: "corner-office", schedule: "Always on", personality: "Reviewing the numbers..." },
  { id: "meta-traffic", name: "Meta Traffic", role: "Media Buyer", emoji: "📊", color: "#3b82f6", desk: "ads-wing", schedule: "9AM · 4PM · 10PM", personality: "Watching ROAS..." },
  { id: "content-system", name: "Content AI", role: "Content Strategist", emoji: "🧠", color: "#a855f7", desk: "creative-studio", schedule: "9AM · 4PM · 10PM", personality: "Brainstorming hooks..." },
  { id: "research-intel", name: "Research", role: "Intelligence Analyst", emoji: "🔍", color: "#10b981", desk: "intel-lab", schedule: "8AM daily", personality: "Scanning the web..." },
  { id: "growth-strategist", name: "Growth", role: "Revenue Architect", emoji: "🚀", color: "#f97316", desk: "strategy-room", schedule: "Monday 9AM", personality: "Crunching numbers..." },
  { id: "project-manager", name: "PM", role: "Operations Lead", emoji: "📋", color: "#6366f1", desk: "ops-center", schedule: "Every 1-2h", personality: "Checking deadlines..." },
  { id: "client-memory", name: "Memory", role: "Knowledge Keeper", emoji: "🗄️", color: "#64748b", desk: "archives", schedule: "On demand", personality: "Organizing files..." },
  { id: "inbox-triage", name: "Inbox", role: "Communications", emoji: "📬", color: "#ec4899", desk: "front-desk", schedule: "Always on", personality: "Sorting messages..." },
  { id: "approval-feedback", name: "Approval", role: "Quality Control", emoji: "✅", color: "#22c55e", desk: "review-room", schedule: "On demand", personality: "Reviewing approvals..." },
];

// ─── Desk Positions (isometric grid) ────────────────────────
// Positions on a virtual grid, transformed to isometric
const DESK_POSITIONS: Record<string, { x: number; y: number; furniture: string }> = {
  "corner-office":   { x: 1, y: 0, furniture: "executive" },
  "ads-wing":        { x: 3, y: 0, furniture: "monitors" },
  "creative-studio": { x: 5, y: 0, furniture: "design" },
  "intel-lab":       { x: 0, y: 2, furniture: "screens" },
  "strategy-room":   { x: 2, y: 2, furniture: "whiteboard" },
  "ops-center":      { x: 4, y: 2, furniture: "desk" },
  "archives":        { x: 1, y: 4, furniture: "cabinet" },
  "front-desk":      { x: 3, y: 4, furniture: "reception" },
  "review-room":     { x: 5, y: 4, furniture: "desk" },
};

// Coffee machine and meeting room positions
const COFFEE_POS = { x: 2.5, y: 3 };
const MEETING_POS = { x: 3, y: 1 };

// ─── Isometric Transform ────────────────────────────────────
function toIso(gridX: number, gridY: number): { x: number; y: number } {
  const tileW = 120;
  const tileH = 60;
  return {
    x: (gridX - gridY) * (tileW / 2) + 400,
    y: (gridX + gridY) * (tileH / 2) + 60,
  };
}

// ─── Floor Tile ─────────────────────────────────────────────
function FloorTile({ gridX, gridY, highlight }: { gridX: number; gridY: number; highlight?: boolean }) {
  const { x, y } = toIso(gridX, gridY);
  const w = 120;
  const h = 60;
  return (
    <polygon
      points={`${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}`}
      fill={highlight ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)"}
      stroke="rgba(255,255,255,0.04)"
      strokeWidth={0.5}
    />
  );
}

// ─── Desk SVG ───────────────────────────────────────────────
function Desk({ gridX, gridY, type }: { gridX: number; gridY: number; type: string }) {
  const { x, y } = toIso(gridX, gridY);

  const deskColor = type === "executive" ? "#4a3728" : type === "monitors" ? "#2a2a3a" : "#1e1e2e";
  const topColor = type === "executive" ? "#6b4f3a" : "#2d2d40";

  return (
    <g>
      {/* Desk surface - isometric box */}
      <polygon
        points={`${x - 30},${y - 20} ${x + 10},${y - 36} ${x + 50},${y - 20} ${x + 10},${y - 4}`}
        fill={topColor}
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={0.5}
      />
      {/* Desk front */}
      <polygon
        points={`${x - 30},${y - 20} ${x + 10},${y - 4} ${x + 10},${y + 8} ${x - 30},${y - 8}`}
        fill={deskColor}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={0.5}
      />
      {/* Desk side */}
      <polygon
        points={`${x + 10},${y - 4} ${x + 50},${y - 20} ${x + 50},${y - 8} ${x + 10},${y + 8}`}
        fill={deskColor}
        opacity={0.7}
        stroke="rgba(255,255,255,0.05)"
        strokeWidth={0.5}
      />
      {/* Monitor */}
      {(type === "monitors" || type === "screens" || type === "executive") && (
        <>
          <rect x={x - 8} y={y - 44} width={20} height={14} rx={1} fill="#111827" stroke="#374151" strokeWidth={0.5} />
          <rect x={x - 5} y={y - 42} width={14} height={10} rx={0.5} fill="#1e3a5f" opacity={0.8} />
          <rect x={x + 1} y={y - 30} width={2} height={4} fill="#374151" />
        </>
      )}
      {/* Chair */}
      <ellipse cx={x - 5} cy={y + 14} rx={10} ry={5} fill="rgba(55,65,81,0.6)" />
    </g>
  );
}

// ─── Coffee Machine ─────────────────────────────────────────
function CoffeeMachine() {
  const { x, y } = toIso(COFFEE_POS.x, COFFEE_POS.y);
  return (
    <g>
      <rect x={x - 8} y={y - 24} width={16} height={20} rx={2} fill="#292524" stroke="#78716c" strokeWidth={0.5} />
      <rect x={x - 4} y={y - 20} width={8} height={6} rx={1} fill="#dc2626" opacity={0.6} />
      <motion.circle
        cx={x}
        cy={y - 28}
        r={2}
        fill="#a3e635"
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.3)">☕</text>
    </g>
  );
}

// ─── Plant ──────────────────────────────────────────────────
function Plant({ gridX, gridY }: { gridX: number; gridY: number }) {
  const { x, y } = toIso(gridX, gridY);
  return (
    <g>
      <rect x={x - 5} y={y - 4} width={10} height={8} rx={1} fill="#78350f" />
      <circle cx={x} cy={y - 10} r={8} fill="#15803d" opacity={0.7} />
      <circle cx={x - 4} cy={y - 12} r={5} fill="#22c55e" opacity={0.5} />
      <circle cx={x + 3} cy={y - 14} r={4} fill="#16a34a" opacity={0.6} />
    </g>
  );
}

// ─── Agent Character ────────────────────────────────────────
function AgentCharacter({
  agent,
  status,
  speechText,
  isSelected,
  onClick,
  walkTarget,
}: {
  agent: AgentDef;
  status: AgentStatus;
  speechText: string;
  isSelected: boolean;
  onClick: () => void;
  walkTarget?: { x: number; y: number } | null;
}) {
  const deskPos = DESK_POSITIONS[agent.desk];
  const homePos = toIso(deskPos.x, deskPos.y);
  const targetPos = walkTarget || homePos;

  const statusColor = status === "active" ? "#22c55e" : status === "completed" ? "#3b82f6" : "#6b7280";

  return (
    <motion.g
      animate={{ x: targetPos.x - homePos.x, y: targetPos.y - homePos.y }}
      transition={{ duration: 2, ease: "easeInOut" }}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {/* Shadow */}
      <ellipse cx={homePos.x} cy={homePos.y + 18} rx={12} ry={5} fill="rgba(0,0,0,0.3)" />

      {/* Body */}
      <motion.g
        animate={status === "active" ? { y: [0, -2, 0] } : {}}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Legs */}
        <rect x={homePos.x - 5} y={homePos.y + 4} width={4} height={12} rx={2} fill="#374151" />
        <rect x={homePos.x + 1} y={homePos.y + 4} width={4} height={12} rx={2} fill="#374151" />

        {/* Body */}
        <rect x={homePos.x - 8} y={homePos.y - 14} width={16} height={20} rx={4} fill={agent.color} />

        {/* Head */}
        <circle cx={homePos.x} cy={homePos.y - 22} r={9} fill="#fbbf24" />

        {/* Eyes */}
        <motion.g
          animate={status === "active" ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          <circle cx={homePos.x - 3} cy={homePos.y - 23} r={1.5} fill="#1e1b4b" />
          <circle cx={homePos.x + 3} cy={homePos.y - 23} r={1.5} fill="#1e1b4b" />
        </motion.g>

        {/* Agent emoji badge */}
        <text x={homePos.x} y={homePos.y - 2} textAnchor="middle" fontSize={10}>
          {agent.emoji}
        </text>
      </motion.g>

      {/* Name tag */}
      <g>
        <rect
          x={homePos.x - 24}
          y={homePos.y - 40}
          width={48}
          height={14}
          rx={4}
          fill="rgba(0,0,0,0.7)"
          stroke={isSelected ? "#818cf8" : "rgba(255,255,255,0.1)"}
          strokeWidth={isSelected ? 1.5 : 0.5}
        />
        <text
          x={homePos.x}
          y={homePos.y - 30}
          textAnchor="middle"
          fontSize={8}
          fontWeight="bold"
          fill="white"
        >
          {agent.name}
        </text>
      </g>

      {/* Status dot */}
      <motion.circle
        cx={homePos.x + 20}
        cy={homePos.y - 38}
        r={3}
        fill={statusColor}
        animate={status === "active" ? { scale: [1, 1.4, 1], opacity: [1, 0.6, 1] } : {}}
        transition={status === "active" ? { duration: 1.5, repeat: Infinity } : {}}
      />

      {/* Speech bubble */}
      <AnimatePresence>
        {(isSelected || status === "active") && (
          <motion.g
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <rect
              x={homePos.x - 50}
              y={homePos.y - 62}
              width={100}
              height={18}
              rx={6}
              fill={status === "active" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)"}
              stroke={status === "active" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.1)"}
              strokeWidth={0.5}
            />
            <text
              x={homePos.x}
              y={homePos.y - 50}
              textAnchor="middle"
              fontSize={7}
              fill={status === "active" ? "#86efac" : "#9ca3af"}
            >
              {speechText.slice(0, 30)}{speechText.length > 30 ? "..." : ""}
            </text>
            {/* Bubble tail */}
            <polygon
              points={`${homePos.x - 3},${homePos.y - 44} ${homePos.x + 3},${homePos.y - 44} ${homePos.x},${homePos.y - 40}`}
              fill={status === "active" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.08)"}
            />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

// ─── Room Label ─────────────────────────────────────────────
function RoomLabel({ gridX, gridY, label, icon }: { gridX: number; gridY: number; label: string; icon: string }) {
  const { x, y } = toIso(gridX, gridY);
  return (
    <text
      x={x}
      y={y + 30}
      textAnchor="middle"
      fontSize={7}
      fill="rgba(255,255,255,0.15)"
      fontWeight="500"
    >
      {icon} {label}
    </text>
  );
}

// ─── Wall Segments ──────────────────────────────────────────
function Walls() {
  // Back wall
  const topLeft = toIso(-0.5, -0.5);
  const topRight = toIso(6, -0.5);
  const midRight = toIso(6, 5);
  const midLeft = toIso(-0.5, 5);

  return (
    <g>
      {/* Back walls */}
      <line x1={topLeft.x} y1={topLeft.y} x2={topRight.x} y2={topRight.y} stroke="rgba(99,102,241,0.15)" strokeWidth={2} />
      <line x1={topLeft.x} y1={topLeft.y} x2={midLeft.x} y2={midLeft.y} stroke="rgba(99,102,241,0.15)" strokeWidth={2} />
      {/* Front walls (subtle) */}
      <line x1={topRight.x} y1={topRight.y} x2={midRight.x} y2={midRight.y} stroke="rgba(99,102,241,0.06)" strokeWidth={1} />
      <line x1={midLeft.x} y1={midLeft.y} x2={midRight.x} y2={midRight.y} stroke="rgba(99,102,241,0.06)" strokeWidth={1} />
    </g>
  );
}

// ─── Day/Night Overlay ──────────────────────────────────────
function DayNightOverlay() {
  const hour = new Date().getHours();
  // Night: 9PM-6AM = darker overlay
  const isNight = hour >= 21 || hour < 6;
  const isDusk = hour >= 18 && hour < 21;

  if (!isNight && !isDusk) return null;

  return (
    <rect
      x={0}
      y={0}
      width={900}
      height={500}
      fill={isNight ? "rgba(15,23,42,0.3)" : "rgba(30,27,75,0.15)"}
    />
  );
}

// ─── Window Glow (night) ────────────────────────────────────
function WindowGlow() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 20) return null;

  return (
    <g>
      {[0, 2, 4].map((i) => {
        const { x, y } = toIso(i + 0.5, -0.7);
        return (
          <motion.rect
            key={i}
            x={x - 8}
            y={y - 12}
            width={16}
            height={10}
            rx={1}
            fill="#fef08a"
            opacity={0.15}
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
          />
        );
      })}
    </g>
  );
}

// ─── Main Component ─────────────────────────────────────────
export function IsometricOffice({
  actions,
  onSelectAgent,
  selectedAgent,
}: {
  actions: AgentAction[];
  onSelectAgent: (id: string | null) => void;
  selectedAgent: string | null;
}) {
  const [walkingAgents, setWalkingAgents] = useState<Record<string, { x: number; y: number } | null>>({});

  function getAgentStatus(agentId: string): AgentStatus {
    const agentActions = actions.filter((a) => (a.agentId || a.agentName) === agentId);
    if (agentActions.length === 0) return "idle";
    const hasActive = agentActions.some((a) => ["pending", "proposed", "approved", "executing"].includes(a.status));
    if (hasActive) return "active";
    return "completed";
  }

  function getSpeechText(agent: AgentDef): string {
    const agentActs = actions
      .filter((a) => (a.agentId || a.agentName) === agent.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = agentActs[0];
    if (latest && ["pending", "proposed", "executing"].includes(latest.status)) {
      return `Working: ${latest.title.slice(0, 25)}...`;
    }
    if (latest && latest.status === "completed") {
      const ago = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 60000);
      if (ago < 60) return `Done "${latest.title.slice(0, 20)}" ${ago}m ago`;
    }
    return agent.personality;
  }

  // Randomly send active agents to get coffee
  useEffect(() => {
    const interval = setInterval(() => {
      const activeAgents = AGENTS.filter((a) => getAgentStatus(a.id) === "active");
      if (activeAgents.length > 0) {
        const lucky = activeAgents[Math.floor(Math.random() * activeAgents.length)];
        const coffeeIso = toIso(COFFEE_POS.x, COFFEE_POS.y);
        setWalkingAgents((prev) => ({ ...prev, [lucky.id]: coffeeIso }));
        // Walk back after 4s
        setTimeout(() => {
          setWalkingAgents((prev) => ({ ...prev, [lucky.id]: null }));
        }, 4000);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [actions]);

  const roomLabels: Record<string, { label: string; icon: string }> = {
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

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox="0 0 900 520"
        className="w-full min-w-[700px]"
        style={{ maxHeight: "70vh" }}
      >
        {/* Background gradient */}
        <defs>
          <radialGradient id="floorGlow" cx="50%" cy="40%">
            <stop offset="0%" stopColor="rgba(99,102,241,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect x={0} y={0} width={900} height={520} fill="url(#floorGlow)" />

        {/* Floor tiles */}
        {Array.from({ length: 7 }).map((_, gx) =>
          Array.from({ length: 6 }).map((_, gy) => {
            const isDeskTile = Object.values(DESK_POSITIONS).some(
              (p) => Math.floor(p.x) === gx && Math.floor(p.y) === gy
            );
            return <FloorTile key={`${gx}-${gy}`} gridX={gx} gridY={gy} highlight={isDeskTile} />;
          })
        )}

        {/* Walls */}
        <Walls />
        <WindowGlow />

        {/* Coffee machine */}
        <CoffeeMachine />

        {/* Plants */}
        <Plant gridX={-0.3} gridY={0.5} />
        <Plant gridX={5.8} gridY={0.5} />
        <Plant gridX={-0.3} gridY={3.5} />
        <Plant gridX={5.8} gridY={3.5} />

        {/* Desks & room labels */}
        {Object.entries(DESK_POSITIONS).map(([deskId, pos]) => (
          <g key={deskId}>
            <Desk gridX={pos.x} gridY={pos.y} type={pos.furniture} />
            <RoomLabel
              gridX={pos.x}
              gridY={pos.y}
              label={roomLabels[deskId]?.label || deskId}
              icon={roomLabels[deskId]?.icon || ""}
            />
          </g>
        ))}

        {/* Day/Night overlay */}
        <DayNightOverlay />

        {/* Agent characters (rendered last = on top) */}
        {AGENTS.map((agent) => (
          <AgentCharacter
            key={agent.id}
            agent={agent}
            status={getAgentStatus(agent.id)}
            speechText={getSpeechText(agent)}
            isSelected={selectedAgent === agent.id}
            onClick={() => onSelectAgent(selectedAgent === agent.id ? null : agent.id)}
            walkTarget={walkingAgents[agent.id]}
          />
        ))}

        {/* Title */}
        <text x={450} y={20} textAnchor="middle" fontSize={14} fontWeight="bold" fill="rgba(255,255,255,0.5)">
          🏢 2FLY AI Office
        </text>
        <text x={450} y={35} textAnchor="middle" fontSize={8} fill="rgba(255,255,255,0.2)">
          {new Date().getHours() >= 21 || new Date().getHours() < 6 ? "🌙 Night Shift" : new Date().getHours() >= 18 ? "🌅 Evening" : "☀️ Office Hours"}
        </text>
      </svg>
    </div>
  );
}
