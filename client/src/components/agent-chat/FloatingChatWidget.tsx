"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useAgentChat, AGENTS, type AgentId } from "@/contexts/AgentChatContext";
import { useClients } from "@/contexts/ClientsContext";
import { api, type ApiDirective } from "@/lib/api";
import { DirectiveResult } from "@/components/directives/DirectiveResult";

const CHAT_STATE_KEY = "2fly-chat-state";
const CHAT_AGENT_KEY = "2fly-chat-agent";

type ChatState = { isOpen?: boolean; selectedAgent?: string };

function loadChatState(): ChatState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CHAT_STATE_KEY);
    if (raw) return JSON.parse(raw) as ChatState;
  } catch {}
  return {};
}

function saveChatState(state: ChatState) {
  try {
    localStorage.setItem(CHAT_STATE_KEY, JSON.stringify(state));
  } catch {}
}

export function FloatingChatWidget() {
  const { isDark } = useTheme();
  const { panelOpen, openPanel, closePanel, activeAgent, setActiveAgent } = useAgentChat();
  const { clients } = useClients();

  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<ApiDirective | null>(null);
  const [recentDirectives, setRecentDirectives] = useState<ApiDirective[]>([]);

  // Persist and restore chat state
  useEffect(() => {
    const state = loadChatState();
    if (state.selectedAgent && AGENTS.some((a) => a.id === state.selectedAgent)) {
      setActiveAgent(state.selectedAgent as AgentId);
    }
    if (state.isOpen) openPanel();
  }, [setActiveAgent, openPanel]);

  useEffect(() => {
    saveChatState({ isOpen: panelOpen, selectedAgent: activeAgent });
    if (typeof window !== "undefined") {
      localStorage.setItem(CHAT_AGENT_KEY, activeAgent);
    }
  }, [panelOpen, activeAgent]);

  useEffect(() => {
    api.getDirectives().then((r) => setRecentDirectives((r.directives ?? []).slice(0, 5))).catch(() => {});
  }, [lastResult]);

  async function handleSend() {
    const text = input.trim();
    if (!text || processing) return;
    setInput("");
    setLastResult(null);
    setProcessing(true);
    try {
      const created = await api.createDirective({
        message: text,
        agentId: activeAgent,
        clientId: selectedClientId ?? undefined,
      });
      const updated = await api.processDirective(created.id);
      setLastResult(updated);
      setRecentDirectives((prev) => [updated, ...prev.filter((d) => d.id !== updated.id)].slice(0, 5));
    } catch (err) {
      setLastResult({
        id: "",
        message: text,
        agentId: activeAgent,
        agentName: AGENTS.find((a) => a.id === activeAgent)?.name ?? "Agent",
        clientId: null,
        clientName: null,
        status: "failed",
        result: err instanceof Error ? err.message : "Failed",
        tasksCreated: 0,
        contentCreated: 0,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } finally {
      setProcessing(false);
    }
  }

  function handleMinimize() {
    setMinimized(true);
  }

  function handleExpand() {
    setMinimized(false);
  }

  function handleClose() {
    closePanel();
    setMinimized(false);
  }

  const panelBg = isDark ? "bg-[#0f172a]" : "bg-white";
  const panelBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-[rgba(226,232,240,1)]";

  // Portal to body ensures fixed positioning works regardless of parent transforms
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating bubble — always visible when panel is closed or minimized */}
      <AnimatePresence>
        {(!panelOpen || minimized) && (
          <motion.button
            type="button"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={panelOpen && minimized ? handleExpand : openPanel}
            className="w-14 h-14 rounded-full bg-[#013E99] text-white shadow-lg hover:scale-110 transition-transform flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#0f172a] relative"
            style={{
              position: "fixed",
              bottom: "1.5rem",
              right: "2rem",
              left: "auto",
              zIndex: 9999,
              boxShadow: "0 4px 20px rgba(1,62,153,0.4)",
            }}
          >
            <span className="absolute inset-0 rounded-full bg-[#013E99] animate-ping opacity-20" style={{ animationDuration: "2s" }} />
            <span className="relative text-2xl">💬</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {panelOpen && !minimized && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`fixed flex flex-col border shadow-2xl backdrop-blur-xl ${panelBg} ${panelBorder} inset-0 w-full h-full sm:inset-auto sm:bottom-6 sm:right-8 sm:w-[380px] sm:h-[500px] sm:rounded-2xl`}
            style={{
              zIndex: 9999,
              left: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            {/* Header */}
            <div className={`shrink-0 px-4 py-3 border-b ${panelBorder} flex items-center justify-between`}>
              <span className={`text-sm font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                💬 Agent Chat
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleMinimize}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-500"
                  title="Minimize"
                >
                  <span className="text-sm font-mono">−</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-500"
                  title="Close"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Agent selector */}
            <div className="shrink-0 px-3 py-2 border-b overflow-x-auto flex gap-2">
              {AGENTS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setActiveAgent(a.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeAgent === a.id
                      ? "bg-[#013E99] text-white"
                      : isDark ? "bg-gray-800 text-gray-400 hover:text-gray-200" : "bg-gray-100 text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {a.emoji} {a.name.length > 8 ? a.name.slice(0, 6) + "…" : a.name}
                </button>
              ))}
            </div>

            {/* Client context (optional) */}
            <div className="shrink-0 px-3 py-1.5 border-b flex items-center gap-2 flex-wrap">
              <select
                value={selectedClientId ?? ""}
                onChange={(e) => setSelectedClientId(e.target.value || null)}
                className={`text-xs rounded-lg px-2 py-1 ${isDark ? "bg-gray-800 text-gray-200" : "bg-gray-100 text-gray-800"}`}
              >
                <option value="">All clients / auto-detect</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {selectedClientId && (
                <span className="text-[10px] text-gray-500">
                  {clients.find((c) => c.id === selectedClientId)?.name}
                </span>
              )}
            </div>

            {/* Result card or processing */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {processing && (
                <div className={`rounded-xl border p-4 ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"}`}>
                  <p className="text-sm">⏳ Processing...</p>
                </div>
              )}
              {lastResult && !processing && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <DirectiveResult directive={lastResult} />
                </motion.div>
              )}

              {/* Recent directives */}
              {recentDirectives.length > 0 && (
                <div className="pt-2">
                  <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    Recent
                  </p>
                  <div className="space-y-1">
                    {recentDirectives.slice(0, 5).map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setLastResult(d)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs ${isDark ? "hover:bg-gray-800" : "hover:bg-gray-100"}`}
                      >
                        <span>{d.status === "completed" ? "✅" : d.status === "failed" ? "❌" : "⏳"}</span>{" "}
                        {d.message.slice(0, 30)}…
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Directive input */}
            <div className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
              <div className={`flex gap-2 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Give a directive... e.g. 'Create Easter content for Casa Nova'"
                  className={`flex-1 bg-transparent px-4 py-3 text-sm outline-none rounded-xl ${isDark ? "text-gray-200 placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"}`}
                  disabled={processing}
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={processing || !input.trim()}
                  className="self-center p-2 rounded-lg bg-[#013E99] text-white hover:opacity-90 shrink-0 disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>,
    document.body
  );
}
