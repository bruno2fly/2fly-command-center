"use client";

import { useState, useEffect, createContext, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

// Theme context for office sub-components
const OfficeThemeCtx = createContext(true); // true = dark

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
  neonColor: string;
  desk: string;
  personality: string;
};

// ─── Agents ─────────────────────────────────────────────────
const AGENTS: AgentDef[] = [
  // ─── Team (Humans) ───
  { id: "bruno", name: "Bruno", role: "Founder & CEO", emoji: "🫡", skinColor: "#c68642", shirtColor: "#111827", neonColor: "#f59e0b", desk: "corner-office", personality: "Running the agency..." },
  { id: "milena", name: "Milena", role: "Social Media Manager", emoji: "📱", skinColor: "#e0ac69", shirtColor: "#7c3aed", neonColor: "#a855f7", desk: "creative-1", personality: "Publishing posts..." },
  { id: "guilherme", name: "Guilherme", role: "Designer", emoji: "🎨", skinColor: "#d4a574", shirtColor: "#2563eb", neonColor: "#3b82f6", desk: "creative-2", personality: "Designing assets..." },
  { id: "igor", name: "Igor", role: "Designer", emoji: "✏️", skinColor: "#c68642", shirtColor: "#059669", neonColor: "#10b981", desk: "creative-3", personality: "Creating visuals..." },
  // ─── AI Agents ───
  { id: "founder-boss", name: "Boss AI", role: "Strategic Command", emoji: "🤖", skinColor: "#94a3b8", shirtColor: "#1e3a5f", neonColor: "#f59e0b", desk: "ai-desk-1", personality: "Analyzing strategy..." },
  { id: "meta-traffic", name: "Meta Ads", role: "Meta Media Buyer", emoji: "📊", skinColor: "#94a3b8", shirtColor: "#1d4ed8", neonColor: "#3b82f6", desk: "ads-desk-1", personality: "Checking ROAS..." },
  { id: "google-ads", name: "Google Ads", role: "Google Media Buyer", emoji: "🔍", skinColor: "#94a3b8", shirtColor: "#ea4335", neonColor: "#ea4335", desk: "ads-desk-2", personality: "Optimizing bids..." },
  { id: "content-strategist", name: "Strategist", role: "Content Director", emoji: "🧠", skinColor: "#94a3b8", shirtColor: "#7c3aed", neonColor: "#a855f7", desk: "ai-desk-2", personality: "Writing hooks..." },
  { id: "research-intel", name: "Intel", role: "Intelligence", emoji: "🔬", skinColor: "#94a3b8", shirtColor: "#059669", neonColor: "#10b981", desk: "intel-desk", personality: "Scanning web..." },
  { id: "undertone", name: "Undertone", role: "Brand Voice", emoji: "🎭", skinColor: "#94a3b8", shirtColor: "#be185d", neonColor: "#ec4899", desk: "reception", personality: "Crafting tone..." },
  { id: "dev", name: "Dev", role: "Engineering", emoji: "💻", skinColor: "#94a3b8", shirtColor: "#475569", neonColor: "#64748b", desk: "ops-desk", personality: "Building features..." },
];

// ─── Desk Positions ─────────────────────────────────────────
const DESK_POSITIONS: Record<string, { x: number; y: number; facing: "left" | "right" | "up" | "down" }> = {
  // Human team — left side
  "corner-office": { x: 135, y: 120, facing: "right" },  // Bruno
  "creative-1":    { x: 135, y: 230, facing: "right" },  // Milena
  "creative-2":    { x: 135, y: 340, facing: "right" },  // Guilherme
  "creative-3":    { x: 135, y: 450, facing: "right" },  // Igor
  // AI Agents — right side
  "ai-desk-1":    { x: 380, y: 120, facing: "down" },   // Boss AI
  "ads-desk-1":   { x: 540, y: 120, facing: "down" },   // Meta Ads
  "ads-desk-2":   { x: 700, y: 120, facing: "left" },   // Google Ads
  "ai-desk-2":    { x: 380, y: 250, facing: "down" },   // Content Strategist
  "intel-desk":   { x: 540, y: 250, facing: "down" },   // Intel
  "reception":    { x: 700, y: 250, facing: "left" },   // Undertone
  "ops-desk":     { x: 540, y: 380, facing: "down" },   // Dev
};

// ─── SVG Defs (Cyberpunk) ───────────────────────────────────
function SvgDefs() {
  const dk = useContext(OfficeThemeCtx);
  return (
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor={dk ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.1)"} />
      </filter>
      <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      {/* Floor patterns */}
      <pattern id="circuitBoard" patternUnits="userSpaceOnUse" width="40" height="40">
        <rect width="40" height="40" fill={dk ? "#050510" : "#f1f5f9"} />
        <path d="M0 20h15M25 20h15M20 0v15M20 25v15" stroke={dk ? "#0a1628" : "#e2e8f0"} strokeWidth="0.5" />
        <circle cx="20" cy="20" r="1.5" fill={dk ? "#0d2847" : "#cbd5e1"} />
        <circle cx="0" cy="0" r="1" fill={dk ? "#0d2847" : "#cbd5e1"} />
        <circle cx="40" cy="40" r="1" fill={dk ? "#0d2847" : "#cbd5e1"} />
      </pattern>
      <pattern id="hexGrid" patternUnits="userSpaceOnUse" width="28" height="49">
        <rect width="28" height="49" fill="transparent" />
        <path d="M14,0 L28,8 L28,24 L14,32 L0,24 L0,8 Z M14,17 L28,25 L28,41 L14,49 L0,41 L0,25 Z" fill="none" stroke={dk ? "rgba(0,240,255,0.04)" : "rgba(99,102,241,0.06)"} strokeWidth="0.5" />
      </pattern>
      {/* Neon line gradients */}
      <linearGradient id="neonCyan" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={dk ? "#00f0ff" : "#6366f1"} stopOpacity="0" />
        <stop offset="50%" stopColor={dk ? "#00f0ff" : "#6366f1"} stopOpacity={dk ? "0.8" : "0.3"} />
        <stop offset="100%" stopColor={dk ? "#00f0ff" : "#6366f1"} stopOpacity="0" />
      </linearGradient>
      <linearGradient id="neonMagenta" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor={dk ? "#ff00ff" : "#ec4899"} stopOpacity="0" />
        <stop offset="50%" stopColor={dk ? "#ff00ff" : "#ec4899"} stopOpacity={dk ? "0.6" : "0.25"} />
        <stop offset="100%" stopColor={dk ? "#ff00ff" : "#ec4899"} stopOpacity="0" />
      </linearGradient>
      <linearGradient id="neonAmber" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
        <stop offset="50%" stopColor="#f59e0b" stopOpacity={dk ? "0.5" : "0.2"} />
        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="spotlightCenter" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stopColor={dk ? "rgba(0,240,255,0.03)" : "rgba(99,102,241,0.04)"} />
        <stop offset="100%" stopColor="transparent" />
      </radialGradient>
    </defs>
  );
}

// ─── Cyberpunk Office Layout ────────────────────────────────
function OfficeLayout() {
  const dk = useContext(OfficeThemeCtx);
  // Theme palette
  const roomBg = dk ? "#080818" : "#ffffff";
  const roomBg2 = dk ? "#0a0818" : "#fef9ff";
  const roomBg3 = dk ? "#040a08" : "#f0fdf4";
  const roomBg4 = dk ? "#030810" : "#eff6ff";
  const roomBg5 = dk ? "#0a0514" : "#fdf2f8";
  const labelOpacity = dk ? 0.6 : 0.8;
  const borderOpacity = dk ? 0.4 : 0.5;
  const pulseOpacity = dk ? [0.2, 0.6, 0.2] : [0.1, 0.3, 0.1];
  const subtleStroke = dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";

  return (
    <g>
      {/* Main floor */}
      <rect x={60} y={60} width={770} height={430} rx={4} fill="url(#circuitBoard)" />
      <rect x={60} y={60} width={770} height={430} rx={4} fill="url(#hexGrid)" />
      <rect x={60} y={60} width={770} height={430} rx={4} fill="url(#spotlightCenter)" />

      {/* ── Boss's Corner Office ── */}
      <rect x={70} y={70} width={160} height={150} rx={2} fill={roomBg} />
      <rect x={70} y={70} width={160} height={150} rx={2} fill="none" stroke="#f59e0b" strokeWidth={1.5} opacity={borderOpacity} />
      <motion.rect x={70} y={70} width={160} height={150} rx={2} fill="none" stroke="#f59e0b" strokeWidth={0.5}
        animate={{ opacity: pulseOpacity as number[] }} transition={{ duration: 3, repeat: Infinity }} />
      <text x={150} y={88} textAnchor="middle" fontSize={8} fill={dk ? "rgba(245,158,11,0.6)" : "rgba(180,100,0,0.8)"} fontFamily="monospace" fontWeight="bold">⚡ COMMAND CENTER</text>
      {/* Door glow */}
      <rect x={210} y={158} width={20} height={6} fill="#f59e0b" opacity={dk ? 0.15 : 0.08} rx={1} />
      <rect x={213} y={160} width={14} height={2} fill="#f59e0b" opacity={dk ? 0.5 : 0.3} rx={0.5} />

      {/* ── Meeting Room (magenta neon) ── */}
      <rect x={70} y={270} width={160} height={140} rx={2} fill={roomBg2} />
      <rect x={70} y={270} width={160} height={140} rx={2} fill="none" stroke={dk ? "#ff00ff" : "#ec4899"} strokeWidth={1.5} opacity={dk ? 0.3 : 0.4} />
      <motion.rect x={70} y={270} width={160} height={140} rx={2} fill="none" stroke={dk ? "#ff00ff" : "#ec4899"} strokeWidth={0.5}
        animate={{ opacity: dk ? [0.15, 0.4, 0.15] : [0.08, 0.2, 0.08] }} transition={{ duration: 4, repeat: Infinity }} />
      <text x={150} y={288} textAnchor="middle" fontSize={8} fill={dk ? "rgba(255,0,255,0.5)" : "rgba(190,24,93,0.7)"} fontFamily="monospace" fontWeight="bold">🔮 WAR ROOM</text>
      {/* Meeting table */}
      <rect x={105} y={310} width={90} height={50} rx={20} fill={dk ? "#0c0520" : "#fdf2f8"} stroke={dk ? "rgba(255,0,255,0.2)" : "rgba(236,72,153,0.2)"} strokeWidth={1} />
      <motion.rect x={108} y={313} width={84} height={44} rx={18} fill="none" stroke={dk ? "rgba(255,0,255,0.15)" : "rgba(236,72,153,0.1)"} strokeWidth={0.5}
        animate={{ opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 2, repeat: Infinity }} />
      {/* Projector */}
      <motion.circle cx={150} cy={335} r={6} fill="none" stroke={dk ? "rgba(0,240,255,0.2)" : "rgba(99,102,241,0.15)"} strokeWidth={0.5}
        animate={{ r: [4, 8, 4], opacity: [0.3, 0.1, 0.3] }} transition={{ duration: 3, repeat: Infinity }} />
      <motion.circle cx={150} cy={335} r={3} fill={dk ? "rgba(0,240,255,0.15)" : "rgba(99,102,241,0.1)"}
        animate={{ r: [2, 4, 2], opacity: [0.4, 0.15, 0.4] }} transition={{ duration: 2, repeat: Infinity }} />
      {/* Chairs */}
      {[
        { x: 120, y: 305 }, { x: 160, y: 305 },
        { x: 120, y: 365 }, { x: 160, y: 365 },
        { x: 100, y: 330 }, { x: 200, y: 330 },
      ].map((c, i) => (
        <g key={`mc-${i}`}>
          <circle cx={c.x} cy={c.y} r={8} fill={dk ? "#0c0a1a" : "#f8fafc"} stroke={dk ? "rgba(255,0,255,0.12)" : "rgba(236,72,153,0.15)"} strokeWidth={0.5} />
        </g>
      ))}

      {/* ── Open Plan Area ── */}
      <text x={460} y={88} textAnchor="middle" fontSize={8} fill={dk ? "rgba(0,240,255,0.3)" : "rgba(99,102,241,0.4)"} fontFamily="monospace" fontWeight="bold">◈ OPEN FLOOR ◈</text>

      {/* ── Kitchen/Break area ── */}
      <rect x={260} y={380} width={200} height={100} rx={2} fill={roomBg3} />
      <rect x={260} y={380} width={200} height={100} rx={2} fill="none" stroke="#10b981" strokeWidth={1} opacity={dk ? 0.3 : 0.4} />
      <text x={360} y={398} textAnchor="middle" fontSize={8} fill={dk ? "rgba(16,185,129,0.5)" : "rgba(5,150,105,0.7)"} fontFamily="monospace" fontWeight="bold">☕ RECHARGE BAY</text>
      {/* Counter */}
      <rect x={280} y={410} width={160} height={12} rx={2} fill={dk ? "#0a1a14" : "#ecfdf5"} stroke={dk ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.2)"} strokeWidth={0.5} />
      {/* Coffee machine */}
      <rect x={310} y={400} width={16} height={18} rx={2} fill={dk ? "#0c1a14" : "#d1fae5"} stroke={dk ? "rgba(16,185,129,0.2)" : "rgba(16,185,129,0.3)"} strokeWidth={0.5} />
      <motion.circle cx={318} cy={403} r={2} fill="#22c55e"
        animate={{ opacity: [0.3, 1, 0.3], r: [1.5, 2.5, 1.5] }} transition={{ duration: 2, repeat: Infinity }} />
      {/* Fridge */}
      <rect x={380} y={396} width={24} height={28} rx={2} fill={dk ? "#0a1018" : "#eff6ff"} stroke={dk ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.2)"} strokeWidth={0.5} />
      <motion.rect x={380} y={396} width={24} height={2} rx={1} fill="#3b82f6" opacity={dk ? 0.3 : 0.15}
        animate={{ opacity: dk ? [0.2, 0.5, 0.2] : [0.1, 0.25, 0.1] }} transition={{ duration: 2.5, repeat: Infinity }} />

      {/* ── Data Center ── */}
      <rect x={660} y={200} width={150} height={120} rx={2} fill={roomBg4} />
      <rect x={660} y={200} width={150} height={120} rx={2} fill="none" stroke={dk ? "#00f0ff" : "#6366f1"} strokeWidth={1.5} opacity={dk ? 0.3 : 0.4} />
      <motion.rect x={660} y={200} width={150} height={120} rx={2} fill="none" stroke={dk ? "#00f0ff" : "#6366f1"} strokeWidth={0.5}
        animate={{ opacity: dk ? [0.1, 0.4, 0.1] : [0.05, 0.2, 0.05] }} transition={{ duration: 2.5, repeat: Infinity }} />
      <text x={735} y={218} textAnchor="middle" fontSize={8} fill={dk ? "rgba(0,240,255,0.5)" : "rgba(79,70,229,0.7)"} fontFamily="monospace" fontWeight="bold">💾 NEURAL CORE</text>
      {/* Server racks */}
      {[0, 1, 2].map((i) => (
        <g key={`srv-${i}`}>
          <rect x={760} y={230 + i * 26} width={30} height={20} rx={1} fill={dk ? "#050a18" : "#e0e7ff"} stroke={dk ? "rgba(0,240,255,0.1)" : "rgba(99,102,241,0.2)"} strokeWidth={0.5} />
          {[0, 1, 2, 3, 4, 5].map((j) => (
            <motion.circle
              key={`led-${i}-${j}`}
              cx={768 + j * 4}
              cy={236 + i * 26}
              r={1.5}
              fill={j % 3 === 0 ? "#00f0ff" : j % 3 === 1 ? "#ff00ff" : "#22c55e"}
              animate={{ opacity: [0.1, 1, 0.1] }}
              transition={{ duration: 0.5 + Math.random() * 1.5, repeat: Infinity, delay: Math.random() * 2 }}
            />
          ))}
          {/* Data transfer line */}
          <motion.rect x={762} y={243 + i * 26} width={26} height={1} fill={dk ? "#00f0ff" : "#6366f1"} opacity={0.15}
            animate={{ opacity: [0, 0.3, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.4 }} />
        </g>
      ))}
      {/* Data stream particles */}
      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={`data-${i}`}
          cx={680} cy={250 + i * 15} r={1}
          fill={dk ? "#00f0ff" : "#6366f1"}
          animate={{ cx: [680, 750, 680], opacity: [0, dk ? 0.8 : 0.4, 0] }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}

      {/* ── Reception ── */}
      <rect x={660} y={70} width={150} height={110} rx={2} fill={roomBg5} />
      <rect x={660} y={70} width={150} height={110} rx={2} fill="none" stroke="#ec4899" strokeWidth={1} opacity={dk ? 0.3 : 0.4} />
      <text x={735} y={88} textAnchor="middle" fontSize={8} fill={dk ? "rgba(236,72,153,0.5)" : "rgba(190,24,93,0.7)"} fontFamily="monospace" fontWeight="bold">📡 SIGNAL HUB</text>

      {/* ── QA Lab ── */}
      <rect x={660} y={345} width={150} height={100} rx={2} fill={dk ? "#040a08" : "#f0fdf4"} />
      <rect x={660} y={345} width={150} height={100} rx={2} fill="none" stroke="#22c55e" strokeWidth={1} opacity={dk ? 0.3 : 0.4} />
      <text x={735} y={363} textAnchor="middle" fontSize={8} fill={dk ? "rgba(34,197,94,0.5)" : "rgba(21,128,61,0.7)"} fontFamily="monospace" fontWeight="bold">🔎 VALIDATION LAB</text>

      {/* ── Floor Pathways ── */}
      <motion.line x1={230} y1={220} x2={660} y2={220} stroke="url(#neonCyan)" strokeWidth={1}
        animate={{ opacity: dk ? [0.2, 0.5, 0.2] : [0.1, 0.25, 0.1] }} transition={{ duration: 4, repeat: Infinity }} />
      <motion.line x1={310} y1={100} x2={310} y2={380} stroke="url(#neonAmber)" strokeWidth={0.8}
        animate={{ opacity: dk ? [0.15, 0.4, 0.15] : [0.08, 0.2, 0.08] }} transition={{ duration: 5, repeat: Infinity }} />
      <motion.line x1={470} y1={100} x2={470} y2={380} stroke="url(#neonAmber)" strokeWidth={0.8}
        animate={{ opacity: dk ? [0.15, 0.4, 0.15] : [0.08, 0.2, 0.08] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} />
      <motion.line x1={630} y1={100} x2={630} y2={445} stroke="url(#neonMagenta)" strokeWidth={0.8}
        animate={{ opacity: dk ? [0.1, 0.35, 0.1] : [0.05, 0.15, 0.05] }} transition={{ duration: 6, repeat: Infinity }} />

      {/* Moving light pulses */}
      <motion.circle r={3} fill={dk ? "#00f0ff" : "#6366f1"} opacity={0.4} filter="url(#softGlow)"
        animate={{ cx: [230, 660], cy: [220, 220], opacity: [0, dk ? 0.6 : 0.3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
      <motion.circle r={2} fill={dk ? "#ff00ff" : "#ec4899"} opacity={0.3} filter="url(#softGlow)"
        animate={{ cx: [630, 630], cy: [100, 445], opacity: [0, dk ? 0.5 : 0.25, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 2 }} />
      <motion.circle r={2} fill="#f59e0b" opacity={0.3} filter="url(#softGlow)"
        animate={{ cx: [310, 310], cy: [380, 100], opacity: [0, dk ? 0.5 : 0.25, 0] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "linear", delay: 1 }} />

      {/* ── Divider lines ── */}
      <line x1={310} y1={100} x2={310} y2={200} stroke={dk ? "rgba(0,240,255,0.08)" : "rgba(99,102,241,0.1)"} strokeWidth={0.5} strokeDasharray="3 5" />
      <line x1={470} y1={100} x2={470} y2={200} stroke={dk ? "rgba(0,240,255,0.08)" : "rgba(99,102,241,0.1)"} strokeWidth={0.5} strokeDasharray="3 5" />

      {/* ── Plants ── */}
      {[
        { x: 250, y: 80, color: dk ? "#00f0ff" : "#6366f1" }, { x: 630, y: 80, color: dk ? "#ff00ff" : "#ec4899" },
        { x: 250, y: 460, color: "#22c55e" }, { x: 630, y: 460, color: "#f59e0b" },
        { x: 80, y: 240, color: dk ? "#a855f7" : "#7c3aed" }, { x: 240, y: 440, color: "#10b981" },
      ].map((p, i) => (
        <g key={`plant-${i}`}>
          <rect x={p.x - 5} y={p.y - 2} width={10} height={8} rx={1} fill={dk ? "#0a0a18" : "#f8fafc"} stroke={p.color} strokeWidth={0.3} opacity={dk ? 0.4 : 0.5} />
          <motion.circle cx={p.x} cy={p.y - 8} r={7} fill={p.color} opacity={dk ? 0.06 : 0.08}
            animate={{ opacity: dk ? [0.04, 0.1, 0.04] : [0.06, 0.12, 0.06], r: [6, 8, 6] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity }} />
          <circle cx={p.x} cy={p.y - 8} r={5} fill={dk ? "none" : p.color} fillOpacity={dk ? 0 : 0.08} stroke={p.color} strokeWidth={0.5} opacity={dk ? 0.2 : 0.3} />
        </g>
      ))}

      {/* ── Whiteboard ── */}
      <rect x={76} y={278} width={4} height={50} fill={dk ? "rgba(0,240,255,0.1)" : "rgba(99,102,241,0.08)"} rx={1} />
      <motion.rect x={76} y={278} width={4} height={50} fill="none" stroke={dk ? "#00f0ff" : "#6366f1"} strokeWidth={0.5} rx={1}
        animate={{ opacity: dk ? [0.2, 0.5, 0.2] : [0.1, 0.25, 0.1] }} transition={{ duration: 2, repeat: Infinity }} />

      {/* ── Windows ── */}
      {[100, 200, 350, 500, 650, 750].map((wx, i) => (
        <g key={`win-${wx}`}>
          <rect x={wx} y={60} width={30} height={3} fill={dk ? (i % 2 === 0 ? "rgba(0,240,255,0.1)" : "rgba(255,0,255,0.08)") : (i % 2 === 0 ? "rgba(99,102,241,0.08)" : "rgba(236,72,153,0.06)")} rx={1} />
          <motion.rect x={wx + 2} y={60} width={26} height={1} fill={dk ? (i % 2 === 0 ? "#00f0ff" : "#ff00ff") : (i % 2 === 0 ? "#6366f1" : "#ec4899")} opacity={dk ? 0.15 : 0.1} rx={0.5}
            animate={{ opacity: dk ? [0.05, 0.2, 0.05] : [0.03, 0.1, 0.03] }} transition={{ duration: 3 + i * 0.3, repeat: Infinity }} />
        </g>
      ))}
    </g>
  );
}

// ─── Cyberpunk Desk with Holographic Monitor ────────────────
function DeskWithComputer({ x, y, isActive, agentColor, neonColor }: {
  x: number; y: number; facing: string; isActive: boolean; agentColor: string; neonColor: string;
}) {
  const dk = useContext(OfficeThemeCtx);
  const dw = 60;
  const dh = 30;
  const deskFill = dk ? "#0a0a18" : "#f1f5f9";
  const inactiveStroke = dk ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
  const monitorFill = dk ? "#050510" : "#e2e8f0";
  const kbFill = dk ? "#0a0a18" : "#e2e8f0";

  return (
    <g>
      {/* Desk surface */}
      <rect x={x - dw / 2} y={y - dh / 2} width={dw} height={dh} rx={3}
        fill={deskFill} stroke={isActive ? neonColor : inactiveStroke} strokeWidth={isActive ? 1 : 0.5} />
      {/* Desk neon underglow */}
      {isActive && (
        <motion.rect x={x - dw / 2 + 2} y={y + dh / 2 - 1} width={dw - 4} height={2} rx={1}
          fill={neonColor} opacity={0.3}
          animate={{ opacity: [0.15, 0.4, 0.15] }} transition={{ duration: 2, repeat: Infinity }} />
      )}

      {/* Monitor */}
      <rect x={x - 14} y={y - dh / 2 - 20} width={28} height={18} rx={2}
        fill={monitorFill} stroke={isActive ? neonColor : inactiveStroke} strokeWidth={isActive ? 1 : 0.5} />
      {/* Screen content */}
      <rect x={x - 12} y={y - dh / 2 - 18} width={24} height={14} rx={1}
        fill={isActive ? (dk ? `${neonColor}08` : `${neonColor}15`) : (dk ? "#030308" : "#f8fafc")} />
      {/* Screen lines */}
      {isActive && [0, 1, 2, 3].map((i) => (
        <motion.rect
          key={`sl-${i}`}
          x={x - 10} y={y - dh / 2 - 16 + i * 3.5}
          width={14} height={1.5} rx={0.5}
          fill={neonColor}
          opacity={0.4}
          animate={{ width: [8, 18, 8], opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      {/* Monitor holographic flicker */}
      {isActive && (
        <motion.rect x={x - 14} y={y - dh / 2 - 20} width={28} height={18} rx={2}
          fill={neonColor} opacity={0.03}
          animate={{ opacity: [0, 0.06, 0] }} transition={{ duration: 0.1, repeat: Infinity, repeatDelay: 3 + Math.random() * 5 }} />
      )}
      {/* Monitor stand */}
      <rect x={x - 2} y={y - dh / 2 - 2} width={4} height={4} fill={deskFill} stroke={inactiveStroke} strokeWidth={0.3} />

      {/* Keyboard */}
      <rect x={x - 10} y={y - 4} width={20} height={6} rx={1} fill={kbFill} stroke={isActive ? `${neonColor}40` : inactiveStroke} strokeWidth={0.3} />
      {isActive && (
        <motion.rect x={x - 9} y={y - 3} width={18} height={4} rx={0.5} fill={neonColor} opacity={0.05}
          animate={{ opacity: [0.03, 0.08, 0.03] }} transition={{ duration: 1, repeat: Infinity }} />
      )}

      {/* Mouse */}
      <ellipse cx={x + 18} cy={y - 1} rx={4} ry={3} fill={kbFill} stroke={isActive ? `${neonColor}30` : inactiveStroke} strokeWidth={0.3} />

      {/* Coffee mug */}
      <circle cx={x + 22} cy={y - 10} r={3.5} fill={dk ? "#0a0a12" : "#fef3c7"} stroke={isActive ? neonColor : inactiveStroke} strokeWidth={0.5} opacity={0.7} />
      {isActive && (
        <motion.path
          d={`M${x + 20},${y - 16} Q${x + 22},${y - 20} ${x + 24},${y - 16}`}
          fill="none" stroke={neonColor} strokeWidth={0.5} opacity={0.2}
          animate={{ opacity: [0, 0.3, 0], y: [-16, -20] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Chair */}
      <circle cx={x} cy={y + dh / 2 + 12} r={10} fill={dk ? "#0a0a18" : "#e2e8f0"}
        stroke={isActive ? `${neonColor}40` : inactiveStroke} strokeWidth={0.5} />
      <rect x={x - 8} y={y + dh / 2 + 18} width={16} height={6} rx={3}
        fill={dk ? "#0a0a18" : "#e2e8f0"} stroke={isActive ? `${neonColor}30` : inactiveStroke} strokeWidth={0.3} />
    </g>
  );
}

// ─── Cyberpunk Person Character ─────────────────────────────
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
  const dk = useContext(OfficeThemeCtx);
  const desk = DESK_POSITIONS[agent.desk];
  if (!desk) return null;

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
      <motion.g
        animate={isActive ? { y: [0, -1.5, 0] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Body/torso */}
        <ellipse cx={homeX} cy={homeY + 2} rx={8} ry={6} fill={agent.shirtColor} />
        
        {/* Neon outline when active */}
        {isActive && (
          <motion.ellipse cx={homeX} cy={homeY + 2} rx={9} ry={7} fill="none"
            stroke={agent.neonColor} strokeWidth={0.5} opacity={0.4}
            animate={{ opacity: [0.2, 0.5, 0.2] }} transition={{ duration: 1.5, repeat: Infinity }} />
        )}
        
        {/* Arms */}
        <line x1={homeX - 7} y1={homeY} x2={homeX - 12} y2={homeY - 8} stroke={agent.skinColor} strokeWidth={2.5} strokeLinecap="round" />
        <line x1={homeX + 7} y1={homeY} x2={homeX + 12} y2={homeY - 8} stroke={agent.skinColor} strokeWidth={2.5} strokeLinecap="round" />

        {/* Head */}
        <circle cx={homeX} cy={homeY - 6} r={7} fill={agent.skinColor} />
        
        {/* Visor/glasses */}
        <rect x={homeX - 6} y={homeY - 8.5} width={12} height={4} rx={2} fill={dk ? "#0a0a18" : "#1e293b"} stroke={agent.neonColor} strokeWidth={0.6} opacity={0.8} />
        <motion.rect x={homeX - 5} y={homeY - 8} width={10} height={3} rx={1.5} fill={agent.neonColor} opacity={isActive ? 0.3 : 0.1}
          animate={isActive ? { opacity: [0.15, 0.35, 0.15] } : {}} transition={{ duration: 1.5, repeat: Infinity }} />

        {/* Hair */}
        <ellipse cx={homeX} cy={homeY - 10} rx={7} ry={4} fill={agent.shirtColor === "#1e3a5f" ? "#1a1a2e" : "#2d1b0e"} />

        {/* Typing animation */}
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
        cx={homeX + 12} cy={homeY - 14} r={3.5}
        fill={isActive ? agent.neonColor : status === "completed" ? "#3b82f6" : (dk ? "#1e1e2e" : "#cbd5e1")}
        stroke={dk ? "#050510" : "#f8fafc"} strokeWidth={1}
        animate={isActive ? { scale: [1, 1.3, 1] } : {}}
        transition={isActive ? { duration: 1.2, repeat: Infinity } : {}}
      />
      {/* Status glow ring */}
      {isActive && (
        <motion.circle cx={homeX + 12} cy={homeY - 14} r={6} fill="none"
          stroke={agent.neonColor} strokeWidth={0.5} opacity={0.3}
          animate={{ r: [4, 8, 4], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }} />
      )}

      {/* Name label */}
      <g>
        <rect x={homeX - 24} y={homeY - 24} width={48} height={13} rx={2}
          fill={dk ? "rgba(5,5,16,0.9)" : "rgba(255,255,255,0.92)"} stroke={isSelected ? agent.neonColor : (dk ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)")} strokeWidth={isSelected ? 1.5 : 0.5} />
        <rect x={homeX - 24} y={homeY - 12} width={48} height={1} fill={agent.neonColor} opacity={isSelected ? 0.4 : 0.1} rx={0.5} />
        <text x={homeX} y={homeY - 15} textAnchor="middle" fontSize={7} fontWeight="bold"
          fill={isActive ? agent.neonColor : (dk ? "#4a5568" : "#64748b")} fontFamily="monospace">
          {agent.name}
        </text>
      </g>

      {/* Speech bubble — holographic */}
      <AnimatePresence>
        {(isSelected || isActive) && (
          <motion.g
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
          >
            <rect x={homeX - 52} y={homeY - 42} width={104} height={15} rx={3}
              fill={dk ? "rgba(5,5,16,0.92)" : "rgba(255,255,255,0.95)"} stroke={agent.neonColor} strokeWidth={0.5} opacity={0.8} />
            {/* Scan line */}
            <motion.rect x={homeX - 52} y={homeY - 42} width={104} height={1} rx={0.5}
              fill={agent.neonColor} opacity={dk ? 0.1 : 0.05}
              animate={{ y: [homeY - 42, homeY - 28, homeY - 42] }}
              transition={{ duration: 2, repeat: Infinity }} />
            <text x={homeX} y={homeY - 32} textAnchor="middle" fontSize={6.5}
              fill={agent.neonColor} fontFamily="monospace" opacity={0.9}>
              {speechText.slice(0, 30)}{speechText.length > 30 ? "…" : ""}
            </text>
            <polygon points={`${homeX - 3},${homeY - 27} ${homeX + 3},${homeY - 27} ${homeX},${homeY - 23}`}
              fill={dk ? "rgba(5,5,16,0.92)" : "rgba(255,255,255,0.95)"} />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.g>
  );
}

// ─── Tom the Cyber Cat 🐱 ───────────────────────────────────
const TOM_SPOTS = [
  { x: 450, y: 200, action: "walking" },
  { x: 180, y: 390, action: "sleeping" },
  { x: 340, y: 450, action: "sitting" },
  { x: 600, y: 170, action: "walking" },
  { x: 760, y: 290, action: "sleeping" },
  { x: 130, y: 180, action: "sitting" },
  { x: 500, y: 310, action: "walking" },
  { x: 700, y: 420, action: "sitting" },
];

function OfficeCat() {
  const dk = useContext(OfficeThemeCtx);
  const [spotIndex, setSpotIndex] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpotIndex((prev) => (prev + 1) % TOM_SPOTS.length);
    }, 10000 + Math.random() * 8000);
    return () => clearInterval(interval);
  }, []);

  const spot = TOM_SPOTS[spotIndex];
  const isSleeping = spot.action === "sleeping";
  const isSitting = spot.action === "sitting";

  return (
    <motion.g
      animate={{ x: spot.x, y: spot.y }}
      transition={{ duration: 3, ease: "easeInOut" }}
      style={{ cursor: "pointer" }}
      onHoverStart={() => setShowTooltip(true)}
      onHoverEnd={() => setShowTooltip(false)}
    >
      {/* Neon shadow */}
      <motion.ellipse cx={0} cy={8} rx={8} ry={3} fill="#ff6600" opacity={0.05}
        animate={{ opacity: [0.03, 0.08, 0.03] }} transition={{ duration: 2, repeat: Infinity }} />

      {isSleeping ? (
        <g>
          <ellipse cx={0} cy={0} rx={10} ry={6} fill="#f97316" />
          <ellipse cx={0} cy={0} rx={9} ry={5} fill="#fb923c" />
          <path d="M-4,-4 Q0,-6 4,-4" fill="none" stroke="#ea580c" strokeWidth={0.8} />
          <path d="M-3,-1 Q0,-3 3,-1" fill="none" stroke="#ea580c" strokeWidth={0.8} />
          <circle cx={-6} cy={-2} r={4} fill="#fb923c" />
          <polygon points="-9,-5 -7,-9 -5,-5" fill="#fb923c" stroke="#ea580c" strokeWidth={0.3} />
          <polygon points="-4,-5 -2,-8 -1,-4" fill="#fb923c" stroke="#ea580c" strokeWidth={0.3} />
          <path d="M-8,-2 Q-7,-3 -6,-2" fill="none" stroke="#7c2d12" strokeWidth={0.6} />
          <path d="M-5,-1 Q-4,-2 -3,-1" fill="none" stroke="#7c2d12" strokeWidth={0.6} />
          <path d="M8,0 Q12,-4 10,-8 Q8,-10 5,-8" fill="none" stroke="#fb923c" strokeWidth={2.5} strokeLinecap="round" />
          {/* Cyber Zzz */}
          <motion.text x={8} y={-10} fontSize={7} fill="#00f0ff" opacity={0.4} fontFamily="monospace"
            animate={{ opacity: [0, 0.6, 0], y: [-10, -16, -10] }}
            transition={{ duration: 2.5, repeat: Infinity }}>z</motion.text>
          <motion.text x={14} y={-14} fontSize={5} fill="#ff00ff" opacity={0.3} fontFamily="monospace"
            animate={{ opacity: [0, 0.5, 0], y: [-14, -18, -14] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}>z</motion.text>
        </g>
      ) : isSitting ? (
        <g>
          <ellipse cx={0} cy={2} rx={7} ry={6} fill="#f97316" />
          <ellipse cx={0} cy={2} rx={6} ry={5} fill="#fb923c" />
          <circle cx={0} cy={-7} r={5} fill="#fb923c" />
          <polygon points="-4,-11 -2,-16 0,-11" fill="#fb923c" stroke="#ea580c" strokeWidth={0.3} />
          <polygon points="0,-11 2,-16 4,-11" fill="#fb923c" stroke="#ea580c" strokeWidth={0.3} />
          <polygon points="-3,-11 -2,-14 -1,-11" fill="#fda4af" />
          <polygon points="1,-11 2,-14 3,-11" fill="#fda4af" />
          {/* Cyber eyes (green glow) */}
          <motion.g animate={{ scaleY: [1, 0.1, 1] }} transition={{ duration: 4, repeat: Infinity, repeatDelay: 3 }}>
            <circle cx={-2} cy={-7} r={1.2} fill="#00f0ff" />
            <circle cx={2} cy={-7} r={1.2} fill="#00f0ff" />
            <circle cx={-2} cy={-7} r={0.5} fill="#fff" />
            <circle cx={2} cy={-7} r={0.5} fill="#fff" />
          </motion.g>
          <polygon points="-0.5,-5 0.5,-5 0,-4.2" fill="#fda4af" />
          <line x1={-2} y1={-5} x2={-10} y2={-6} stroke="rgba(0,240,255,0.15)" strokeWidth={0.3} />
          <line x1={-2} y1={-4.5} x2={-10} y2={-4} stroke="rgba(0,240,255,0.15)" strokeWidth={0.3} />
          <line x1={2} y1={-5} x2={10} y2={-6} stroke="rgba(0,240,255,0.15)" strokeWidth={0.3} />
          <line x1={2} y1={-4.5} x2={10} y2={-4} stroke="rgba(0,240,255,0.15)" strokeWidth={0.3} />
          <motion.path d="M6,4 Q12,2 10,-4" fill="none" stroke="#fb923c" strokeWidth={2} strokeLinecap="round"
            animate={{ d: ["M6,4 Q12,2 10,-4", "M6,4 Q14,0 10,-4", "M6,4 Q12,2 10,-4"] }}
            transition={{ duration: 3, repeat: Infinity }} />
          <ellipse cx={-3} cy={7} rx={2.5} ry={1.5} fill="#fb923c" />
          <ellipse cx={3} cy={7} rx={2.5} ry={1.5} fill="#fb923c" />
        </g>
      ) : (
        <g>
          <ellipse cx={0} cy={0} rx={10} ry={5} fill="#f97316" />
          <ellipse cx={0} cy={0} rx={9} ry={4} fill="#fb923c" />
          <path d="M-3,-3 L-3,3" stroke="#ea580c" strokeWidth={0.6} />
          <path d="M0,-4 L0,4" stroke="#ea580c" strokeWidth={0.6} />
          <path d="M3,-3 L3,3" stroke="#ea580c" strokeWidth={0.6} />
          <circle cx={-10} cy={-2} r={5} fill="#fb923c" />
          <polygon points="-13,-6 -12,-11 -9,-6" fill="#fb923c" stroke="#ea580c" strokeWidth={0.3} />
          <polygon points="-9,-6 -8,-10 -6,-5" fill="#fb923c" stroke="#ea580c" strokeWidth={0.3} />
          <polygon points="-12,-6 -12,-9 -10,-6" fill="#fda4af" />
          <polygon points="-8,-6 -8,-9 -7,-5" fill="#fda4af" />
          {/* Cyber eyes */}
          <circle cx={-12} cy={-2} r={1} fill="#00f0ff" />
          <circle cx={-8} cy={-2} r={1} fill="#00f0ff" />
          <circle cx={-12} cy={-2} r={0.4} fill="#fff" />
          <circle cx={-8} cy={-2} r={0.4} fill="#fff" />
          <polygon points="-10.5,0 -9.5,0 -10,0.8" fill="#fda4af" />
          <motion.g animate={{ rotate: [0, 15, 0, -15, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>
            <rect x={-6} y={4} width={2} height={5} rx={1} fill="#fb923c" />
          </motion.g>
          <motion.g animate={{ rotate: [0, -15, 0, 15, 0] }} transition={{ duration: 0.6, repeat: Infinity }}>
            <rect x={4} y={4} width={2} height={5} rx={1} fill="#fb923c" />
          </motion.g>
          <rect x={-2} y={4} width={2} height={4} rx={1} fill="#ea580c" />
          <rect x={1} y={4} width={2} height={4} rx={1} fill="#ea580c" />
          <motion.path d="M9,0 Q14,-6 12,-10" fill="none" stroke="#fb923c" strokeWidth={2} strokeLinecap="round"
            animate={{ d: ["M9,0 Q14,-6 12,-10", "M9,0 Q16,-4 12,-10", "M9,0 Q14,-6 12,-10"] }}
            transition={{ duration: 1.5, repeat: Infinity }} />
        </g>
      )}

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.g initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <rect x={-22} y={-28} width={44} height={13} rx={3} fill={dk ? "rgba(5,5,16,0.9)" : "rgba(255,255,255,0.95)"} stroke="rgba(251,146,60,0.4)" strokeWidth={0.5} />
            <text x={0} y={-19} textAnchor="middle" fontSize={7} fill="#fb923c" fontFamily="monospace">🐱 Tom</text>
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
      {/* Floating data particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.circle
          key={`particle-${i}`}
          r={0.8 + Math.random()}
          fill={i % 3 === 0 ? "#00f0ff" : i % 3 === 1 ? "#ff00ff" : "#f59e0b"}
          opacity={0.2}
          animate={{
            cx: [100 + Math.random() * 700, 100 + Math.random() * 700],
            cy: [80 + Math.random() * 400, 80 + Math.random() * 400],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 6 + Math.random() * 8,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "linear",
          }}
        />
      ))}
      
      {/* Scan line effect (very subtle) */}
      <motion.rect x={60} y={60} width={770} height={2} fill="rgba(0,240,255,0.015)" rx={1}
        animate={{ y: [60, 490, 60] }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }} />
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
  const { isDark } = useTheme();
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
  const timeLabel = hour >= 21 || hour < 6 ? "🌙 NIGHT_OPS" : hour >= 18 ? "🌅 EVE_SHIFT" : "⚡ LIVE";

  return (
    <OfficeThemeCtx.Provider value={isDark}>
    <div className="relative w-full overflow-x-auto">
      <svg
        viewBox="0 0 880 520"
        className="w-full min-w-[700px]"
        style={{ maxHeight: "72vh" }}
      >
        <SvgDefs />

        {/* Background */}
        <rect x={0} y={0} width={880} height={520} fill={isDark ? "#020208" : "#f8fafc"} />
        <rect x={0} y={0} width={880} height={520} fill="url(#spotlightCenter)" />

        {/* Office layout */}
        <OfficeLayout />
        <AmbientEffects />

        {/* Desks */}
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
              neonColor={agent.neonColor}
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

        {/* Tom the cyber cat 🐱 */}
        <OfficeCat />

        {/* Header */}
        <text x={440} y={28} textAnchor="middle" fontSize={14} fontWeight="bold" fill={isDark ? "rgba(0,240,255,0.6)" : "rgba(79,70,229,0.7)"} fontFamily="monospace" letterSpacing="4">
          2FLY DIGITAL HQ
        </text>
        <motion.text x={440} y={28} textAnchor="middle" fontSize={14} fontWeight="bold" fill={isDark ? "#00f0ff" : "#6366f1"} fontFamily="monospace" letterSpacing="4" opacity={0.1}
          animate={{ opacity: [0.05, 0.15, 0.05] }} transition={{ duration: 3, repeat: Infinity }}>
          2FLY DIGITAL HQ
        </motion.text>
        <text x={440} y={44} textAnchor="middle" fontSize={8} fill={isDark ? "rgba(0,240,255,0.3)" : "rgba(79,70,229,0.4)"} fontFamily="monospace">
          {timeLabel} · {activeCount} AGENT{activeCount !== 1 ? "S" : ""} ONLINE · SYS_OK
        </text>
        <line x1={340} y1={48} x2={540} y2={48} stroke={isDark ? "rgba(0,240,255,0.1)" : "rgba(99,102,241,0.1)"} strokeWidth={0.5} />
        <motion.rect x={340} y={47} width={30} height={2} fill={isDark ? "#00f0ff" : "#6366f1"} opacity={isDark ? 0.3 : 0.2} rx={1}
          animate={{ x: [340, 510, 340] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }} />
      </svg>
    </div>
    </OfficeThemeCtx.Provider>
  );
}
