"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────
type AgentStatus = "active" | "idle" | "completed";

type AgentAction = {
  id: string;
  agentId?: string;
  agentName?: string;
  title: string;
  status: string;
  clientName?: string;
  createdAt: string;
};

type AgentDef = {
  id: string;
  name: string;
  role: string;
  emoji: string;
  skinColor: string;
  shirtColor: string;
  desk: string;
  personality: string;
};

// ─── Agents ─────────────────────────────────────────────────
const AGENTS: AgentDef[] = [
  { id: "founder-boss", name: "Boss", role: "Strategic Command", emoji: "👔", skinColor: "#d4a574", shirtColor: "#1e3a5f", desk: "corner-office", personality: "Reviewing numbers..." },
  { id: "meta-traffic", name: "Meta", role: "Media Buyer", emoji: "📊", skinColor: "#c68642", shirtColor: "#1d4ed8", desk: "ads-desk-1", personality: "Checking ROAS..." },
  { id: "content-system", name: "Content", role: "Content Strategist", emoji: "🧠", skinColor: "#e0ac69", shirtColor: "#7c3aed", desk: "creative-1", personality: "Writing hooks..." },
  { id: "research-intel", name: "Intel", role: "Intelligence", emoji: "🔍", skinColor: "#8d5524", shirtColor: "#059669", desk: "intel-desk", personality: "Scanning web..." },
  { id: "growth-strategist", name: "Growth", role: "Revenue", emoji: "🚀", skinColor: "#d4a574", shirtColor: "#dc2626", desk: "meeting-1", personality: "Growth planning..." },
  { id: "project-manager", name: "PM", role: "Operations", emoji: "📋", skinColor: "#c68642", shirtColor: "#4f46e5", desk: "ops-desk", personality: "Tracking tasks..." },
  { id: "client-memory", name: "Memory", role: "Knowledge", emoji: "🗄️", skinColor: "#e0ac69", shirtColor: "#475569", desk: "archive-desk", personality: "Filing records..." },
  { id: "inbox-triage", name: "Inbox", role: "Communications", emoji: "📬", skinColor: "#d4a574", shirtColor: "#be185d", desk: "reception", personality: "Sorting mail..." },
  { id: "approval-feedback", name: "QA", role: "Quality Control", emoji: "✅", skinColor: "#8d5524", shirtColor: "#15803d", desk: "qa-desk", personality: "Reviewing..." },
];

// ─── Office Layout (pixel positions on 900x600 canvas) ──────
// Real office: walls, rooms, open plan area, meeting room, kitchen
const DESK_POSITIONS: Record<string, { x: number; y: number; facing: "left" | "right" | "up" | "down" }> = {
  "corner-office": { x: 135, y: 145, facing: "right" },
  "ads-desk-1":    { x: 380, y: 130, facing: "down" },
  "creative-1":    { x: 540, y: 130, facing: "down" },
  "intel-desk":    { x: 380, y: 260, facing: "down" },
  "meeting-1":     { x: 135, y: 340, facing: "right" },
  "ops-desk":      { x: 540, y: 260, facing: "down" },
  "archive-desk":  { x: 700, y: 260, facing: "left" },
  "reception":     { x: 700, y: 130, facing: "left" },
  "qa-desk":       { x: 700, y: 400, facing: "left" },
};

// ─── SVG Defs ───────────────────────────────────────────────
function SvgDefs() {
  return (
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.3)" />
      </filter>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <pattern id="carpet" patternUnits="userSpaceOnUse" width="20" height="20">
        <rect width="20" height="20" fill="#1a1a2e" />
        <rect x="0" y="0" width="10" height="10" fill="#1c1c32" />
        <rect x="10" y="10" width="10" height="10" fill="#1c1c32" />
      </pattern>
      <pattern id="woodFloor" patternUnits="userSpaceOnUse" width="40" height="8">
        <rect width="40" height="8" fill="#2a1f14" />
        <line x1="0" y1="0" x2="40" y2="0" stroke="#35291a" strokeWidth="0.5" />
        <line x1="20" y1="0" x2="20" y2="8" stroke="#35291a" strokeWidth="0.3" />
      </pattern>
    </defs>
  );
}

// ─── Office Walls & Rooms ───────────────────────────────────
function OfficeLayout() {
  return (
    <g>
      {/* Main floor */}
      <rect x={60} y={60} width={770} height={430} rx={4} fill="url(#carpet)" />
      
      {/* Boss's Corner Office (walled room) */}
      <rect x={70} y={70} width={160} height={150} rx={2} fill="url(#woodFloor)" stroke="#334155" strokeWidth={2} />
      <text x={150} y={88} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.4)" fontFamily="monospace" fontWeight="bold">CORNER OFFICE</text>
      {/* Door */}
      <rect x={210} y={160} width={20} height={4} fill="#475569" />
      
      {/* Meeting Room (walled) */}
      <rect x={70} y={270} width={160} height={140} rx={2} fill="url(#woodFloor)" stroke="#334155" strokeWidth={2} />
      <text x={150} y={288} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.4)" fontFamily="monospace" fontWeight="bold">MEETING ROOM</text>
      {/* Meeting table */}
      <rect x={105} y={310} width={90} height={50} rx={20} fill="#1e293b" stroke="#334155" strokeWidth={1} />
      {/* Chairs around meeting table */}
      {[
        { x: 120, y: 305 }, { x: 160, y: 305 },
        { x: 120, y: 365 }, { x: 160, y: 365 },
        { x: 100, y: 330 }, { x: 200, y: 330 },
      ].map((c, i) => (
        <circle key={`mc-${i}`} cx={c.x} cy={c.y} r={8} fill="#1e293b" stroke="#475569" strokeWidth={0.5} />
      ))}
      
      {/* Open Plan Area label */}
      <text x={460} y={88} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.3)" fontFamily="monospace" fontWeight="bold">OPEN PLAN</text>
      
      {/* Kitchen/Break area */}
      <rect x={260} y={380} width={200} height={100} rx={2} fill="#1a1520" stroke="#334155" strokeWidth={1.5} strokeDasharray="4 2" />
      <text x={360} y={398} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.3)" fontFamily="monospace" fontWeight="bold">☕ KITCHEN</text>
      {/* Counter */}
      <rect x={280} y={410} width={160} height={12} rx={2} fill="#292524" stroke="#44403c" strokeWidth={0.5} />
      {/* Coffee machine */}
      <rect x={310} y={400} width={16} height={18} rx={2} fill="#1c1917" stroke="#57534e" strokeWidth={0.5} />
      <motion.circle cx={318} cy={403} r={2} fill="#22c55e" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 2, repeat: Infinity }} />
      {/* Fridge */}
      <rect x={380} y={396} width={24} height={28} rx={2} fill="#1e293b" stroke="#475569" strokeWidth={0.5} />
      
      {/* Server Room / Archive area */}
      <rect x={660} y={200} width={150} height={120} rx={2} fill="#0f172a" stroke="#334155" strokeWidth={1.5} />
      <text x={735} y={218} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.3)" fontFamily="monospace" fontWeight="bold">💾 DATA CENTER</text>
      {/* Server racks */}
      {[0, 1, 2].map((i) => (
        <g key={`srv-${i}`}>
          <rect x={760} y={230 + i * 26} width={30} height={20} rx={1} fill="#0c0f1a" stroke="#1e293b" strokeWidth={0.5} />
          {[0, 1, 2, 3].map((j) => (
            <motion.circle
              key={`led-${i}-${j}`}
              cx={772 + j * 5}
              cy={236 + i * 26}
              r={1.5}
              fill={j % 2 === 0 ? "#22c55e" : "#3b82f6"}
              animate={{ opacity: [0.2, 0.8, 0.2] }}
              transition={{ duration: 1 + Math.random(), repeat: Infinity, delay: Math.random() }}
            />
          ))}
        </g>
      ))}
      
      {/* Reception area */}
      <rect x={660} y={70} width={150} height={110} rx={2} fill="#1a1520" stroke="#334155" strokeWidth={1.5} />
      <text x={735} y={88} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.3)" fontFamily="monospace" fontWeight="bold">📡 RECEPTION</text>
      
      {/* QA Room */}
      <rect x={660} y={345} width={150} height={100} rx={2} fill="#0f172a" stroke="#334155" strokeWidth={1.5} />
      <text x={735} y={363} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.3)" fontFamily="monospace" fontWeight="bold">🔎 QA LAB</text>

      {/* Divider lines in open plan */}
      <line x1={310} y1={100} x2={310} y2={200} stroke="#334155" strokeWidth={0.5} strokeDasharray="3 3" />
      <line x1={470} y1={100} x2={470} y2={200} stroke="#334155" strokeWidth={0.5} strokeDasharray="3 3" />
      <line x1={310} y1={220} x2={630} y2={220} stroke="#334155" strokeWidth={0.5} strokeDasharray="3 3" />
      
      {/* Plants */}
      {[
        { x: 250, y: 80 }, { x: 630, y: 80 }, { x: 250, y: 460 }, { x: 630, y: 460 },
        { x: 80, y: 240 }, { x: 240, y: 440 },
      ].map((p, i) => (
        <g key={`plant-${i}`}>
          <rect x={p.x - 5} y={p.y - 2} width={10} height={8} rx={1} fill="#78350f" />
          <circle cx={p.x} cy={p.y - 8} r={7} fill="#15803d" opacity={0.6} />
          <circle cx={p.x - 3} cy={p.y - 10} r={4} fill="#22c55e" opacity={0.4} />
        </g>
      ))}
      
      {/* Whiteboard in meeting room */}
      <rect x={76} y={278} width={4} height={50} fill="#e2e8f0" rx={1} />
      
      {/* Window indicators (top wall) */}
      {[100, 200, 350, 500, 650, 750].map((wx) => (
        <rect key={`win-${wx}`} x={wx} y={60} width={30} height={3} fill="rgba(56,189,248,0.15)" rx={1} />
      ))}
    </g>
  );
}

// ─── Desk with Computer ─────────────────────────────────────
function DeskWithComputer({ x, y, facing, isActive, agentColor }: {
  x: number; y: number; facing: string; isActive: boolean; agentColor: string;
}) {
  // Desk orientation
  const dw = 60;
  const dh = 30;

  return (
    <g>
      {/* Desk surface */}
      <rect
        x={x - dw / 2} y={y - dh / 2}
        width={dw} height={dh} rx={3}
        fill="#2d2520"
        stroke={isActive ? agentColor : "#44403c"}
        strokeWidth={isActive ? 1 : 0.5}
      />
      {/* Desk legs */}
      <rect x={x - dw / 2 + 3} y={y + dh / 2} width={3} height={6} fill="#1c1917" />
      <rect x={x + dw / 2 - 6} y={y + dh / 2} width={3} height={6} fill="#1c1917" />

      {/* Monitor */}
      <rect
        x={x - 12} y={y - dh / 2 - 18}
        width={24} height={16} rx={1.5}
        fill="#0f172a"
        stroke={isActive ? agentColor : "#334155"}
        strokeWidth={isActive ? 1 : 0.5}
      />
      {/* Screen content */}
      <rect
        x={x - 10} y={y - dh / 2 - 16}
        width={20} height={12} rx={1}
        fill={isActive ? "rgba(56,189,248,0.12)" : "#0c0f1a"}
      />
      {/* Screen lines when active */}
      {isActive && [0, 1, 2].map((i) => (
        <motion.rect
          key={`sl-${i}`}
          x={x - 8} y={y - dh / 2 - 14 + i * 4}
          width={12 + Math.random() * 4} height={1.5} rx={0.5}
          fill={agentColor}
          opacity={0.5}
          animate={{ width: [10, 16, 10], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      {/* Monitor stand */}
      <rect x={x - 2} y={y - dh / 2 - 2} width={4} height={4} fill="#334155" />

      {/* Keyboard */}
      <rect x={x - 10} y={y - 4} width={20} height={6} rx={1} fill="#1e293b" stroke="#334155" strokeWidth={0.3} />

      {/* Mouse */}
      <ellipse cx={x + 18} cy={y - 1} rx={4} ry={3} fill="#1e293b" stroke="#334155" strokeWidth={0.3} />

      {/* Coffee mug */}
      <circle cx={x + 22} cy={y - 10} r={3.5} fill="#78350f" stroke="#92400e" strokeWidth={0.5} />
      {isActive && (
        <motion.path
          d={`M${x + 20},${y - 16} Q${x + 22},${y - 20} ${x + 24},${y - 16}`}
          fill="none"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth={0.5}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Chair */}
      <circle
        cx={x}
        cy={y + dh / 2 + 12}
        r={10}
        fill="#1e293b"
        stroke={isActive ? agentColor : "#334155"}
        strokeWidth={isActive ? 0.8 : 0.3}
      />
      {/* Chair back */}
      <rect
        x={x - 8}
        y={y + dh / 2 + 18}
        width={16} height={6} rx={3}
        fill="#1e293b"
        stroke={isActive ? agentColor : "#334155"}
        strokeWidth={0.3}
      />
    </g>
  );
}

// ─── Person Character (top-down view) ───────────────────────
function PersonCharacter({
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
  const desk = DESK_POSITIONS[agent.desk];
  if (!desk) return null;

  // Agent sits in front of desk (at the chair position)
  const homeX = desk.x;
  const homeY = desk.y + 27;
  const targetX = walkTarget ? walkTarget.x : homeX;
  const targetY = walkTarget ? walkTarget.y : homeY;
  const isActive = status === "active";

  return (
    <motion.g
      animate={{ x: targetX - homeX, y: targetY - homeY }}
      transition={{ duration: 2.5, ease: "easeInOut" }}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {/* Person body (top-down, sitting in chair) */}
      <motion.g
        animate={isActive ? { y: [0, -1.5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Body/torso */}
        <ellipse cx={homeX} cy={homeY + 2} rx={8} ry={6} fill={agent.shirtColor} />
        
        {/* Arms reaching to keyboard */}
        <line x1={homeX - 7} y1={homeY} x2={homeX - 12} y2={homeY - 8} stroke={agent.skinColor} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={homeX + 7} y1={homeY} x2={homeX + 12} y2={homeY - 8} stroke={agent.skinColor} strokeWidth={2.5} strokeLinecap="round" />
        
        {/* Head */}
        <circle cx={homeX} cy={homeY - 6} r={7} fill={agent.skinColor} />
        
        {/* Hair */}
        <ellipse cx={homeX} cy={homeY - 10} rx={7} ry={4} fill={agent.shirtColor === "#1e3a5f" ? "#1a1a2e" : "#2d1b0e"} />
        
        {/* Eyes */}
        <motion.g
          animate={status === "active" ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}
        >
          <circle cx={homeX - 2.5} cy={homeY - 6} r={1} fill="#1e1b4b" />
          <circle cx={homeX + 2.5} cy={homeY - 6} r={1} fill="#1e1b4b" />
        </motion.g>
        
        {/* Typing animation for hands */}
        {isActive && (
          <motion.g
            animate={{ y: [0, -1, 0, -1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
          >
            <circle cx={homeX - 12} cy={homeY - 9} r={2} fill={agent.skinColor} />
            <circle cx={homeX + 12} cy={homeY - 9} r={2} fill={agent.skinColor} />
          </motion.g>
        )}
      </motion.g>

      {/* Status dot */}
      <motion.circle
        cx={homeX + 12}
        cy={homeY - 14}
        r={3.5}
        fill={isActive ? "#22c55e" : status === "completed" ? "#3b82f6" : "#4b5563"}
        stroke="#0f172a"
        strokeWidth={1}
        animate={isActive ? { scale: [1, 1.3, 1] } : {}}
        transition={isActive ? { duration: 1.2, repeat: Infinity } : {}}
      />

      {/* Name label */}
      <g>
        <rect
          x={homeX - 22} y={homeY - 24}
          width={44} height={12} rx={3}
          fill="rgba(0,0,0,0.75)"
          stroke={isSelected ? "#818cf8" : "rgba(255,255,255,0.08)"}
          strokeWidth={isSelected ? 1.5 : 0.5}
        />
        <text
          x={homeX} y={homeY - 15.5}
          textAnchor="middle" fontSize={7} fontWeight="bold"
          fill={isActive ? "#22d3ee" : "#94a3b8"}
          fontFamily="monospace"
        >
          {agent.name}
        </text>
      </g>

      {/* Speech bubble */}
      <AnimatePresence>
        {(isSelected || isActive) && (
          <motion.g
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
          >
            <rect
              x={homeX - 50} y={homeY - 42}
              width={100} height={14} rx={5}
              fill="rgba(0,0,0,0.85)"
              stroke={isActive ? "#22d3ee" : "rgba(255,255,255,0.1)"}
              strokeWidth={0.5}
            />
            <text
              x={homeX} y={homeY - 32.5}
              textAnchor="middle" fontSize={6.5}
              fill={isActive ? "#67e8f9" : "#9ca3af"}
              fontFamily="monospace"
            >
              {speechText.slice(0, 30)}{speechText.length > 30 ? "…" : ""}
            </text>
            <polygon
              points={`${homeX - 3},${homeY - 28} ${homeX + 3},${homeY - 28} ${homeX},${homeY - 24}`}
              fill="rgba(0,0,0,0.85)"
            />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

// ─── Ambient Effects ────────────────────────────────────────
function AmbientEffects() {
  return (
    <g>
      {/* Subtle light shafts from windows */}
      {[100, 350, 650].map((wx) => (
        <rect
          key={`light-${wx}`}
          x={wx} y={63}
          width={30} height={60}
          fill="rgba(56,189,248,0.02)"
        />
      ))}
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
    if (agentActions.some((a) => ["pending", "proposed", "approved", "executing"].includes(a.status))) return "active";
    return "completed";
  }

  function getSpeechText(agent: AgentDef): string {
    const agentActs = actions
      .filter((a) => (a.agentId || a.agentName) === agent.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const latest = agentActs[0];
    if (latest && ["pending", "proposed", "executing"].includes(latest.status)) {
      return `Working: ${latest.title.slice(0, 24)}...`;
    }
    if (latest?.status === "completed") {
      const ago = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 60000);
      if (ago < 60) return `Done: ${latest.title.slice(0, 20)} ${ago}m`;
    }
    return agent.personality;
  }

  // Random coffee walks
  useEffect(() => {
    const interval = setInterval(() => {
      const active = AGENTS.filter((a) => getAgentStatus(a.id) === "active");
      if (active.length > 0) {
        const lucky = active[Math.floor(Math.random() * active.length)];
        setWalkingAgents((prev) => ({ ...prev, [lucky.id]: { x: 340, y: 435 } }));
        setTimeout(() => {
          setWalkingAgents((prev) => ({ ...prev, [lucky.id]: null }));
        }, 5000);
      }
    }, 18000);
    return () => clearInterval(interval);
  }, [actions]);

  const hour = new Date().getHours();
  const activeCount = AGENTS.filter((a) => getAgentStatus(a.id) === "active").length;
  const timeLabel = hour >= 21 || hour < 6 ? "🌙 Night Shift" : hour >= 18 ? "🌅 Evening" : "☀️ Office Hours";

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox="0 0 880 520"
        className="w-full min-w-[700px]"
        style={{ maxHeight: "72vh" }}
      >
        <SvgDefs />

        {/* Background */}
        <rect x={0} y={0} width={880} height={520} fill="#0a0a12" />

        {/* Office layout (walls, rooms, furniture) */}
        <OfficeLayout />
        <AmbientEffects />

        {/* Desks with computers */}
        {AGENTS.map((agent) => {
          const pos = DESK_POSITIONS[agent.desk];
          if (!pos) return null;
          const status = getAgentStatus(agent.id);
          return (
            <DeskWithComputer
              key={`desk-${agent.id}`}
              x={pos.x}
              y={pos.y}
              facing={pos.facing}
              isActive={status === "active"}
              agentColor={agent.shirtColor}
            />
          );
        })}

        {/* People */}
        {AGENTS.map((agent) => (
          <PersonCharacter
            key={agent.id}
            agent={agent}
            status={getAgentStatus(agent.id)}
            speechText={getSpeechText(agent)}
            isSelected={selectedAgent === agent.id}
            onClick={() => onSelectAgent(selectedAgent === agent.id ? null : agent.id)}
            walkTarget={walkingAgents[agent.id]}
          />
        ))}

        {/* Header */}
        <text x={440} y={32} textAnchor="middle" fontSize={13} fontWeight="bold" fill="rgba(148,163,184,0.5)" fontFamily="monospace" letterSpacing="2">
          2FLY DIGITAL HQ
        </text>
        <text x={440} y={48} textAnchor="middle" fontSize={8} fill="rgba(100,116,139,0.4)" fontFamily="monospace">
          {timeLabel} · {activeCount} agent{activeCount !== 1 ? "s" : ""} working
        </text>
      </svg>
    </div>
  );
}
