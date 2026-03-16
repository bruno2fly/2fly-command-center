"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ──────────────────────────────────────────────────
type AgentStatus = "active" | "idle" | "completed";

type AgentDef = {
  id: string;
  name: string;
  role: string;
  emoji: string;
  neonColor: string; // primary neon accent
  glowColor: string; // glow rgba
  desk: string;
  schedule: string;
  personality: string;
  stationProps: string; // what's on their desk
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
  { id: "founder-boss", name: "BOSS", role: "Strategic Command", emoji: "👔", neonColor: "#fbbf24", glowColor: "rgba(251,191,36,0.3)", desk: "corner-office", schedule: "Always on", personality: "Reviewing the numbers...", stationProps: "holodesk" },
  { id: "meta-traffic", name: "META", role: "Media Buyer", emoji: "📊", neonColor: "#3b82f6", glowColor: "rgba(59,130,246,0.3)", desk: "ads-wing", schedule: "9AM·4PM·10PM", personality: "Watching ROAS...", stationProps: "charts" },
  { id: "content-system", name: "CONTENT", role: "Content Strategist", emoji: "🧠", neonColor: "#a855f7", glowColor: "rgba(168,85,247,0.3)", desk: "creative-studio", schedule: "9AM·4PM·10PM", personality: "Brainstorming...", stationProps: "creative" },
  { id: "research-intel", name: "INTEL", role: "Intelligence Analyst", emoji: "🔍", neonColor: "#10b981", glowColor: "rgba(16,185,129,0.3)", desk: "intel-lab", schedule: "8AM daily", personality: "Scanning web...", stationProps: "servers" },
  { id: "growth-strategist", name: "GROWTH", role: "Revenue Architect", emoji: "🚀", neonColor: "#f97316", glowColor: "rgba(249,115,22,0.3)", desk: "strategy-room", schedule: "Mon 9AM", personality: "Crunching numbers...", stationProps: "charts" },
  { id: "project-manager", name: "PM", role: "Operations Lead", emoji: "📋", neonColor: "#6366f1", glowColor: "rgba(99,102,241,0.3)", desk: "ops-center", schedule: "Every 1-2h", personality: "Checking deadlines...", stationProps: "screens" },
  { id: "client-memory", name: "MEMORY", role: "Knowledge Keeper", emoji: "🗄️", neonColor: "#64748b", glowColor: "rgba(100,116,139,0.3)", desk: "archives", schedule: "On demand", personality: "Organizing files...", stationProps: "cabinets" },
  { id: "inbox-triage", name: "INBOX", role: "Communications", emoji: "📬", neonColor: "#ec4899", glowColor: "rgba(236,72,153,0.3)", desk: "front-desk", schedule: "Always on", personality: "Sorting messages...", stationProps: "comms" },
  { id: "approval-feedback", name: "GATE", role: "Quality Control", emoji: "✅", neonColor: "#22c55e", glowColor: "rgba(34,197,94,0.3)", desk: "review-room", schedule: "On demand", personality: "Reviewing...", stationProps: "screens" },
];

// ─── Desk Positions ─────────────────────────────────────────
const DESK_POSITIONS: Record<string, { x: number; y: number }> = {
  "corner-office":   { x: 1, y: 0 },
  "ads-wing":        { x: 3, y: 0 },
  "creative-studio": { x: 5, y: 0 },
  "intel-lab":       { x: 0, y: 2 },
  "strategy-room":   { x: 2, y: 2 },
  "ops-center":      { x: 4, y: 2 },
  "archives":        { x: 1, y: 4 },
  "front-desk":      { x: 3, y: 4 },
  "review-room":     { x: 5, y: 4 },
};

const COFFEE_POS = { x: 2.5, y: 3 };

// ─── Room Labels ────────────────────────────────────────────
const ROOM_LABELS: Record<string, { label: string; icon: string }> = {
  "corner-office": { label: "COMMAND", icon: "⚡" },
  "ads-wing": { label: "ADS LAB", icon: "💰" },
  "creative-studio": { label: "CREATIVE", icon: "🎨" },
  "intel-lab": { label: "INTEL", icon: "🔬" },
  "strategy-room": { label: "STRATEGY", icon: "📈" },
  "ops-center": { label: "OPS", icon: "⚙️" },
  "archives": { label: "MEMORY", icon: "💾" },
  "front-desk": { label: "COMMS", icon: "📡" },
  "review-room": { label: "QA GATE", icon: "🔎" },
};

// ─── Neon pathway connections ───────────────────────────────
const PATHWAYS: [string, string][] = [
  ["corner-office", "ads-wing"],
  ["corner-office", "strategy-room"],
  ["ads-wing", "creative-studio"],
  ["ads-wing", "ops-center"],
  ["creative-studio", "ops-center"],
  ["intel-lab", "strategy-room"],
  ["strategy-room", "ops-center"],
  ["intel-lab", "archives"],
  ["ops-center", "review-room"],
  ["archives", "front-desk"],
  ["front-desk", "review-room"],
  ["strategy-room", "front-desk"],
];

// ─── Isometric Transform ────────────────────────────────────
function toIso(gridX: number, gridY: number): { x: number; y: number } {
  const tileW = 120;
  const tileH = 60;
  return {
    x: (gridX - gridY) * (tileW / 2) + 420,
    y: (gridX + gridY) * (tileH / 2) + 80,
  };
}

// ─── SVG Definitions (glows, gradients) ─────────────────────
function SvgDefs() {
  return (
    <defs>
      {/* Background glow */}
      <radialGradient id="bgGlow" cx="50%" cy="40%">
        <stop offset="0%" stopColor="rgba(99,102,241,0.06)" />
        <stop offset="100%" stopColor="rgba(0,0,0,0)" />
      </radialGradient>

      {/* Neon glow filters */}
      <filter id="neonGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      <filter id="screenGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Holographic gradient */}
      <linearGradient id="holoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.4" />
        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
      </linearGradient>

      {/* Data flow gradient */}
      <linearGradient id="dataFlow" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
        <stop offset="50%" stopColor="#06b6d4" stopOpacity="1" />
        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
      </linearGradient>
    </defs>
  );
}

// ─── Floor Tile ─────────────────────────────────────────────
function FloorTile({ gridX, gridY, highlight, glowColor }: { gridX: number; gridY: number; highlight?: boolean; glowColor?: string }) {
  const { x, y } = toIso(gridX, gridY);
  const w = 120;
  const h = 60;
  return (
    <g>
      <polygon
        points={`${x},${y - h / 2} ${x + w / 2},${y} ${x},${y + h / 2} ${x - w / 2},${y}`}
        fill={highlight ? (glowColor || "rgba(99,102,241,0.06)") : "rgba(255,255,255,0.01)"}
        stroke={highlight ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.03)"}
        strokeWidth={highlight ? 0.8 : 0.3}
      />
      {/* Grid lines inside tile */}
      <line
        x1={x - w / 4} y1={y - h / 4}
        x2={x + w / 4} y2={y + h / 4}
        stroke="rgba(255,255,255,0.015)"
        strokeWidth={0.3}
      />
    </g>
  );
}

// ─── Neon Pathway ───────────────────────────────────────────
function NeonPathway({ from, to, active }: { from: string; to: string; active: boolean }) {
  const posA = DESK_POSITIONS[from];
  const posB = DESK_POSITIONS[to];
  if (!posA || !posB) return null;

  const a = toIso(posA.x, posA.y);
  const b = toIso(posB.x, posB.y);

  const pathId = `path-${from}-${to}`;

  return (
    <g>
      {/* Base line (dim) */}
      <line
        x1={a.x} y1={a.y}
        x2={b.x} y2={b.y}
        stroke="rgba(6,182,212,0.08)"
        strokeWidth={1.5}
      />
      {/* Active neon line */}
      {active && (
        <line
          x1={a.x} y1={a.y}
          x2={b.x} y2={b.y}
          stroke="rgba(6,182,212,0.25)"
          strokeWidth={1}
          filter="url(#neonGlow)"
        />
      )}
      {/* Data flow dot */}
      {active && (
        <>
          <path id={pathId} d={`M${a.x},${a.y} L${b.x},${b.y}`} fill="none" />
          <motion.circle
            r={2.5}
            fill="#06b6d4"
            filter="url(#neonGlow)"
          >
            <animateMotion
              dur={`${2 + Math.random() * 2}s`}
              repeatCount="indefinite"
              path={`M${a.x},${a.y} L${b.x},${b.y}`}
            />
          </motion.circle>
        </>
      )}
    </g>
  );
}

// ─── Cyberpunk Station ──────────────────────────────────────
function Station({ gridX, gridY, type, neonColor, glowColor, agentStatus }: {
  gridX: number; gridY: number; type: string; neonColor: string; glowColor: string; agentStatus: AgentStatus;
}) {
  const { x, y } = toIso(gridX, gridY);
  const isActive = agentStatus === "active";

  return (
    <g>
      {/* Platform base */}
      <polygon
        points={`${x - 32},${y - 8} ${x + 8},${y - 28} ${x + 48},${y - 12} ${x + 8},${y + 8}`}
        fill="rgba(15,23,42,0.8)"
        stroke={isActive ? neonColor : "rgba(100,116,139,0.15)"}
        strokeWidth={isActive ? 1 : 0.5}
        filter={isActive ? "url(#screenGlow)" : undefined}
      />
      {/* Platform top surface */}
      <polygon
        points={`${x - 32},${y - 10} ${x + 8},${y - 30} ${x + 48},${y - 14} ${x + 8},${y + 6}`}
        fill="rgba(30,41,59,0.6)"
        stroke={isActive ? neonColor : "rgba(100,116,139,0.1)"}
        strokeWidth={0.5}
      />

      {/* Station-specific props */}
      {(type === "charts" || type === "holodesk") && (
        <g>
          {/* Holographic screen */}
          <motion.rect
            x={x - 10} y={y - 54} width={24} height={16} rx={1}
            fill="rgba(6,182,212,0.1)"
            stroke={isActive ? neonColor : "rgba(6,182,212,0.2)"}
            strokeWidth={0.5}
            filter={isActive ? "url(#screenGlow)" : undefined}
            animate={isActive ? { opacity: [0.6, 1, 0.6] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {/* Chart bars */}
          {[0, 1, 2, 3].map((i) => (
            <motion.rect
              key={i}
              x={x - 6 + i * 5}
              y={y - 50 + (isActive ? 0 : 2)}
              width={3}
              height={isActive ? 4 + Math.random() * 6 : 4}
              fill={neonColor}
              opacity={isActive ? 0.8 : 0.3}
              animate={isActive ? { height: [4, 4 + Math.random() * 8, 4] } : {}}
              transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
          {/* Stand */}
          <rect x={x + 1} y={y - 38} width={2} height={10} fill="rgba(100,116,139,0.3)" />
        </g>
      )}

      {type === "servers" && (
        <g>
          {/* Server rack */}
          <rect x={x + 20} y={y - 48} width={12} height={24} rx={1} fill="rgba(15,23,42,0.9)" stroke="rgba(100,116,139,0.2)" strokeWidth={0.5} />
          {[0, 1, 2, 3].map((i) => (
            <motion.circle
              key={i}
              cx={x + 29}
              cy={y - 44 + i * 6}
              r={1.5}
              fill={isActive ? "#10b981" : "#374151"}
              animate={isActive ? { opacity: [0.3, 1, 0.3] } : {}}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </g>
      )}

      {type === "creative" && (
        <g>
          {/* Tablet/Drawing surface */}
          <rect x={x - 8} y={y - 50} width={20} height={14} rx={2} fill="rgba(15,23,42,0.9)" stroke="rgba(168,85,247,0.3)" strokeWidth={0.5} />
          {/* Color palette dots */}
          {["#ec4899", "#a855f7", "#3b82f6", "#10b981"].map((c, i) => (
            <circle key={i} cx={x - 4 + i * 5} cy={y - 43} r={2} fill={c} opacity={isActive ? 0.8 : 0.3} />
          ))}
          {isActive && (
            <motion.line
              x1={x - 4} y1={y - 48}
              x2={x + 8} y2={y - 46}
              stroke="#a855f7"
              strokeWidth={1}
              opacity={0.6}
              animate={{ x2: [x + 8, x - 2, x + 8] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}
        </g>
      )}

      {type === "cabinets" && (
        <g>
          {/* File cabinet */}
          <rect x={x + 18} y={y - 44} width={14} height={20} rx={1} fill="rgba(30,41,59,0.8)" stroke="rgba(100,116,139,0.2)" strokeWidth={0.5} />
          {[0, 1, 2].map((i) => (
            <rect key={i} x={x + 20} y={y - 42 + i * 6} width={10} height={4} rx={0.5} fill="rgba(100,116,139,0.15)" stroke="rgba(100,116,139,0.1)" strokeWidth={0.3} />
          ))}
          {/* Drawer handle */}
          <rect x={x + 23} y={y - 40} width={4} height={0.8} fill="rgba(148,163,184,0.3)" />
        </g>
      )}

      {type === "comms" && (
        <g>
          {/* Antenna / transmitter */}
          <line x1={x + 24} y1={y - 52} x2={x + 24} y2={y - 36} stroke="rgba(236,72,153,0.4)" strokeWidth={1} />
          <motion.circle
            cx={x + 24} cy={y - 54}
            r={3}
            fill="none"
            stroke={isActive ? "#ec4899" : "rgba(236,72,153,0.2)"}
            strokeWidth={0.5}
            animate={isActive ? { r: [3, 8, 3], opacity: [0.8, 0, 0.8] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
          />
          {isActive && (
            <motion.circle
              cx={x + 24} cy={y - 54}
              r={5}
              fill="none"
              stroke="#ec4899"
              strokeWidth={0.3}
              animate={{ r: [5, 12, 5], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
          )}
        </g>
      )}

      {type === "screens" && (
        <g>
          {/* Multi-screen setup */}
          {[-12, 4].map((ox, i) => (
            <motion.rect
              key={i}
              x={x + ox} y={y - 52} width={14} height={10} rx={1}
              fill="rgba(15,23,42,0.9)"
              stroke={isActive ? neonColor : "rgba(100,116,139,0.2)"}
              strokeWidth={0.5}
              animate={isActive ? { opacity: [0.7, 1, 0.7] } : {}}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
            />
          ))}
          {/* Screen content lines */}
          {isActive && [0, 1, 2].map((i) => (
            <rect key={i} x={x - 9} y={y - 50 + i * 3} width={8} height={1} fill={neonColor} opacity={0.4} rx={0.5} />
          ))}
        </g>
      )}

      {/* Base glow ring for active stations */}
      {isActive && (
        <motion.ellipse
          cx={x + 8}
          cy={y + 2}
          rx={36}
          ry={14}
          fill="none"
          stroke={neonColor}
          strokeWidth={0.5}
          opacity={0.3}
          animate={{ opacity: [0.1, 0.4, 0.1], rx: [34, 38, 34] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      )}
    </g>
  );
}

// ─── Robot Agent Character ──────────────────────────────────
function RobotAgent({
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
  const home = toIso(deskPos.x, deskPos.y);
  const target = walkTarget || home;
  const isActive = status === "active";

  return (
    <motion.g
      animate={{ x: target.x - home.x, y: target.y - home.y }}
      transition={{ duration: 2.5, ease: "easeInOut" }}
      style={{ cursor: "pointer" }}
      onClick={onClick}
    >
      {/* Shadow */}
      <motion.ellipse
        cx={home.x}
        cy={home.y + 16}
        rx={10}
        ry={4}
        fill={isActive ? agent.glowColor : "rgba(0,0,0,0.3)"}
        animate={isActive ? { rx: [10, 14, 10], opacity: [0.3, 0.6, 0.3] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />

      <motion.g
        animate={isActive ? { y: [0, -3, 0] } : {}}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Robot body */}
        <rect x={home.x - 7} y={home.y - 8} width={14} height={16} rx={3} fill="rgba(30,41,59,0.9)" stroke={agent.neonColor} strokeWidth={isActive ? 1 : 0.5} />
        
        {/* Chest light */}
        <motion.circle
          cx={home.x}
          cy={home.y}
          r={2}
          fill={agent.neonColor}
          animate={isActive ? { opacity: [0.4, 1, 0.4], r: [1.5, 2.5, 1.5] } : { opacity: 0.3 }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Arms */}
        <rect x={home.x - 11} y={home.y - 6} width={3} height={10} rx={1.5} fill="rgba(30,41,59,0.8)" stroke={agent.neonColor} strokeWidth={0.3} />
        <rect x={home.x + 8} y={home.y - 6} width={3} height={10} rx={1.5} fill="rgba(30,41,59,0.8)" stroke={agent.neonColor} strokeWidth={0.3} />

        {/* Legs */}
        <rect x={home.x - 5} y={home.y + 8} width={4} height={6} rx={1} fill="rgba(30,41,59,0.8)" stroke={agent.neonColor} strokeWidth={0.3} />
        <rect x={home.x + 1} y={home.y + 8} width={4} height={6} rx={1} fill="rgba(30,41,59,0.8)" stroke={agent.neonColor} strokeWidth={0.3} />

        {/* Head */}
        <rect x={home.x - 8} y={home.y - 22} width={16} height={14} rx={4} fill="rgba(15,23,42,0.95)" stroke={agent.neonColor} strokeWidth={isActive ? 1 : 0.5} />
        
        {/* Antenna */}
        <line x1={home.x} y1={home.y - 22} x2={home.x} y2={home.y - 28} stroke={agent.neonColor} strokeWidth={0.8} />
        <motion.circle
          cx={home.x}
          cy={home.y - 29}
          r={2}
          fill={agent.neonColor}
          animate={isActive ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.2 }}
          transition={{ duration: 1, repeat: Infinity }}
          filter={isActive ? "url(#neonGlow)" : undefined}
        />

        {/* Eyes */}
        <motion.g
          animate={isActive ? { scaleY: [1, 0.1, 1] } : {}}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
        >
          <motion.rect
            x={home.x - 6} y={home.y - 18}
            width={4} height={3} rx={1}
            fill={agent.neonColor}
            animate={isActive ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.4 }}
            transition={{ duration: 2, repeat: Infinity }}
            filter={isActive ? "url(#screenGlow)" : undefined}
          />
          <motion.rect
            x={home.x + 2} y={home.y - 18}
            width={4} height={3} rx={1}
            fill={agent.neonColor}
            animate={isActive ? { opacity: [0.6, 1, 0.6] } : { opacity: 0.4 }}
            transition={{ duration: 2, repeat: Infinity }}
            filter={isActive ? "url(#screenGlow)" : undefined}
          />
        </motion.g>

        {/* Mouth / visor line */}
        <rect x={home.x - 4} y={home.y - 12} width={8} height={1} rx={0.5} fill={agent.neonColor} opacity={isActive ? 0.5 : 0.2} />
      </motion.g>

      {/* Name tag with neon border */}
      <g>
        <rect
          x={home.x - 26}
          y={home.y - 38}
          width={52}
          height={12}
          rx={3}
          fill="rgba(0,0,0,0.8)"
          stroke={isSelected ? agent.neonColor : "rgba(255,255,255,0.1)"}
          strokeWidth={isSelected ? 1.5 : 0.5}
        />
        <text
          x={home.x}
          y={home.y - 29.5}
          textAnchor="middle"
          fontSize={7}
          fontWeight="bold"
          fill={agent.neonColor}
          fontFamily="monospace"
        >
          {agent.name}
        </text>
      </g>

      {/* Status indicator */}
      <motion.circle
        cx={home.x + 22}
        cy={home.y - 36}
        r={3}
        fill={isActive ? "#22c55e" : status === "completed" ? "#3b82f6" : "#4b5563"}
        animate={isActive ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] } : {}}
        transition={isActive ? { duration: 1.2, repeat: Infinity } : {}}
        filter={isActive ? "url(#neonGlow)" : undefined}
      />

      {/* Speech bubble */}
      <AnimatePresence>
        {(isSelected || isActive) && (
          <motion.g
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
          >
            <rect
              x={home.x - 55}
              y={home.y - 56}
              width={110}
              height={16}
              rx={5}
              fill="rgba(0,0,0,0.85)"
              stroke={isActive ? agent.neonColor : "rgba(255,255,255,0.1)"}
              strokeWidth={0.5}
            />
            <text
              x={home.x}
              y={home.y - 45}
              textAnchor="middle"
              fontSize={6.5}
              fill={isActive ? agent.neonColor : "#9ca3af"}
              fontFamily="monospace"
            >
              {speechText.slice(0, 35)}{speechText.length > 35 ? "…" : ""}
            </text>
            <polygon
              points={`${home.x - 4},${home.y - 40} ${home.x + 4},${home.y - 40} ${home.x},${home.y - 36}`}
              fill="rgba(0,0,0,0.85)"
            />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

// ─── Coffee Machine (cyberpunk) ─────────────────────────────
function CoffeeMachine() {
  const { x, y } = toIso(COFFEE_POS.x, COFFEE_POS.y);
  return (
    <g>
      <rect x={x - 8} y={y - 22} width={16} height={20} rx={2} fill="rgba(15,23,42,0.9)" stroke="rgba(6,182,212,0.2)" strokeWidth={0.5} />
      <motion.rect
        x={x - 4} y={y - 18} width={8} height={5} rx={1}
        fill="rgba(6,182,212,0.15)"
        animate={{ opacity: [0.3, 0.8, 0.3] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.circle
        cx={x} cy={y - 26} r={2}
        fill="#06b6d4"
        filter="url(#neonGlow)"
        animate={{ opacity: [0.2, 0.8, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x={x} y={y + 6} textAnchor="middle" fontSize={7} fill="rgba(6,182,212,0.3)" fontFamily="monospace">☕</text>
    </g>
  );
}

// ─── Ambient Particles ──────────────────────────────────────
function AmbientParticles() {
  return (
    <g>
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.circle
          key={i}
          cx={150 + Math.random() * 600}
          cy={50 + Math.random() * 400}
          r={0.5 + Math.random() * 1}
          fill={["#06b6d4", "#a855f7", "#3b82f6", "#22c55e"][i % 4]}
          opacity={0.15}
          animate={{
            cy: [50 + Math.random() * 400, 30 + Math.random() * 400],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 5,
          }}
        />
      ))}
    </g>
  );
}

// ─── Room Label ─────────────────────────────────────────────
function RoomLabel({ gridX, gridY, label, icon }: { gridX: number; gridY: number; label: string; icon: string }) {
  const { x, y } = toIso(gridX, gridY);
  return (
    <text
      x={x}
      y={y + 28}
      textAnchor="middle"
      fontSize={6}
      fill="rgba(148,163,184,0.25)"
      fontFamily="monospace"
      fontWeight="bold"
      letterSpacing="1"
    >
      {icon} {label}
    </text>
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
      return `> ${latest.title.slice(0, 28)}...`;
    }
    if (latest && latest.status === "completed") {
      const ago = Math.floor((Date.now() - new Date(latest.createdAt).getTime()) / 60000);
      if (ago < 60) return `✓ ${latest.title.slice(0, 22)} ${ago}m ago`;
    }
    return agent.personality;
  }

  // Active agents walk to coffee
  useEffect(() => {
    const interval = setInterval(() => {
      const active = AGENTS.filter((a) => getAgentStatus(a.id) === "active");
      if (active.length > 0) {
        const lucky = active[Math.floor(Math.random() * active.length)];
        const coffeeIso = toIso(COFFEE_POS.x, COFFEE_POS.y);
        setWalkingAgents((prev) => ({ ...prev, [lucky.id]: coffeeIso }));
        setTimeout(() => {
          setWalkingAgents((prev) => ({ ...prev, [lucky.id]: null }));
        }, 4000);
      }
    }, 12000);
    return () => clearInterval(interval);
  }, [actions]);

  // Check which pathways have active agents at either end
  function isPathwayActive(from: string, to: string): boolean {
    const fromAgent = AGENTS.find((a) => a.desk === from);
    const toAgent = AGENTS.find((a) => a.desk === to);
    return (
      (fromAgent ? getAgentStatus(fromAgent.id) === "active" : false) ||
      (toAgent ? getAgentStatus(toAgent.id) === "active" : false)
    );
  }

  const hour = new Date().getHours();
  const timeLabel = hour >= 21 || hour < 6 ? "🌙 NIGHT OPS" : hour >= 18 ? "🌅 EVENING" : "☀️ ACTIVE";

  return (
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox="0 0 900 540"
        className="w-full min-w-[700px]"
        style={{ maxHeight: "72vh" }}
      >
        <SvgDefs />

        {/* Background */}
        <rect x={0} y={0} width={900} height={540} fill="url(#bgGlow)" />

        {/* Ambient particles */}
        <AmbientParticles />

        {/* Floor tiles */}
        {Array.from({ length: 7 }).map((_, gx) =>
          Array.from({ length: 6 }).map((_, gy) => {
            const deskEntry = Object.entries(DESK_POSITIONS).find(
              ([, p]) => Math.floor(p.x) === gx && Math.floor(p.y) === gy
            );
            const agent = deskEntry ? AGENTS.find((a) => a.desk === deskEntry[0]) : null;
            return (
              <FloorTile
                key={`${gx}-${gy}`}
                gridX={gx}
                gridY={gy}
                highlight={!!deskEntry}
                glowColor={agent ? agent.glowColor.replace("0.3", "0.04") : undefined}
              />
            );
          })
        )}

        {/* Neon pathways */}
        {PATHWAYS.map(([from, to]) => (
          <NeonPathway
            key={`${from}-${to}`}
            from={from}
            to={to}
            active={isPathwayActive(from, to)}
          />
        ))}

        {/* Coffee machine */}
        <CoffeeMachine />

        {/* Stations & room labels */}
        {AGENTS.map((agent) => {
          const pos = DESK_POSITIONS[agent.desk];
          const room = ROOM_LABELS[agent.desk];
          return (
            <g key={`station-${agent.id}`}>
              <Station
                gridX={pos.x}
                gridY={pos.y}
                type={agent.stationProps}
                neonColor={agent.neonColor}
                glowColor={agent.glowColor}
                agentStatus={getAgentStatus(agent.id)}
              />
              {room && (
                <RoomLabel
                  gridX={pos.x}
                  gridY={pos.y}
                  label={room.label}
                  icon={room.icon}
                />
              )}
            </g>
          );
        })}

        {/* Night overlay */}
        {(hour >= 21 || hour < 6) && (
          <rect x={0} y={0} width={900} height={540} fill="rgba(15,23,42,0.2)" />
        )}

        {/* Robot agents */}
        {AGENTS.map((agent) => (
          <RobotAgent
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
        <text x={450} y={22} textAnchor="middle" fontSize={12} fontWeight="bold" fill="rgba(6,182,212,0.6)" fontFamily="monospace" letterSpacing="3">
          2FLY AI HEADQUARTERS
        </text>
        <text x={450} y={36} textAnchor="middle" fontSize={8} fill="rgba(148,163,184,0.3)" fontFamily="monospace">
          {timeLabel} · {AGENTS.filter((a) => getAgentStatus(a.id) === "active").length} ACTIVE
        </text>
      </svg>
    </div>
  );
}
