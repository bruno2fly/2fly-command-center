"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useAgentChat, AGENTS, type AgentId } from "@/contexts/AgentChatContext";
import { toast } from "sonner";

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

/** Pre-seeded mock conversations per agent */
const MOCK_CONVERSATIONS: Record<string, Array<{ role: "agent" | "user"; text: string; time: string }>> = {
  "founder-boss": [
    { role: "agent", text: "Morning brief: 🟢7 🟡1 🔴2 clients. Casa Nova needs attention — SLA breach on weekend specials. $4,400 in overdue invoices.", time: "9:00 AM" },
    { role: "user", text: "Show me Casa Nova status", time: "9:02 AM" },
    { role: "agent", text: "Casa Nova is red: SLA breach on weekend specials banner. Invoice 5d overdue. Top priority: chase payment and update creative.", time: "9:02 AM" },
  ],
  "content-system": [
    { role: "agent", text: "Content scan: 3 items due today (Shape SPA, Ardan, Super Crisp). 2 clients have no content scheduled this week: Hafiza, Pro Fortuna.", time: "10:00 AM" },
  ],
  "meta-traffic": [
    { role: "agent", text: "Ad performance: Shape SPA Miami ROAS 3.8x (+8% WoW) — strong. Super Crisp ROAS 1.9x declining — recommend creative refresh.", time: "11:00 AM" },
  ],
  "research-intel": [
    { role: "agent", text: "Weekly research: 3 new competitor campaigns in Miami med spa. Ardan's competitor running 40% off promo.", time: "Sun 8:00 PM" },
  ],
  "inbox-triage": [
    { role: "agent", text: "Inbox triage ready. Route and categorize on demand.", time: "—" },
  ],
  "project-manager": [
    { role: "agent", text: "SLA check runs hourly. No breaches right now.", time: "—" },
  ],
  "approval-feedback": [
    { role: "agent", text: "Review gate active. Send content for approval on demand.", time: "—" },
  ],
  "client-memory": [
    { role: "agent", text: "Client memory always listening. Ask me anything about clients.", time: "—" },
  ],
};

function getMessagesForAgent(agentId: string) {
  return MOCK_CONVERSATIONS[agentId] ?? [{ role: "agent" as const, text: "No messages yet.", time: "—" }];
}

export function FloatingChatWidget() {
  const { isDark } = useTheme();
  const {
    panelOpen,
    openPanel,
    closePanel,
    activeAgent,
    setActiveAgent,
  } = useAgentChat();

  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isOpen = panelOpen && !minimized;

  const messages = getMessagesForAgent(activeAgent);
  const agent = AGENTS.find((a) => a.id === activeAgent);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeAgent, messages]);

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    toast("Agent chat coming soon — use Discord #boss for now", {
      duration: 4000,
      position: "bottom-right",
    });
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

  return (
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
            className="fixed bottom-6 right-8 z-[9999] w-14 h-14 rounded-full bg-[#013E99] text-white shadow-lg hover:scale-110 transition-transform flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#0f172a] relative"
            style={{ boxShadow: "0 4px 20px rgba(1,62,153,0.4)", left: "auto" }}
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
            className={`fixed z-[9999] flex flex-col border shadow-2xl backdrop-blur-xl ${panelBg} ${panelBorder} inset-0 w-full h-full sm:inset-auto sm:bottom-6 sm:right-8 sm:w-[380px] sm:h-[500px] sm:rounded-2xl`}
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.3)", left: "auto" }}
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

            {/* Agent tabs */}
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={`${activeAgent}-${i}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "agent"
                        ? isDark ? "bg-gray-800 rounded-bl-sm" : "bg-gray-100 rounded-bl-sm"
                        : "bg-[#013E99] text-white rounded-br-sm"
                    }`}
                  >
                    <p className="text-xs whitespace-pre-wrap">{msg.text}</p>
                    <p className={`text-[10px] mt-1 ${msg.role === "user" ? "text-blue-200" : isDark ? "text-gray-500" : "text-gray-400"}`}>
                      {msg.time}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-3 border-t border-gray-200 dark:border-gray-700">
              <div className={`flex gap-2 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
                  placeholder="Type a message..."
                  className={`flex-1 bg-transparent px-4 py-3 text-sm outline-none rounded-xl ${isDark ? "text-gray-200 placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"}`}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  className="self-center p-2 rounded-lg bg-[#013E99] text-white hover:opacity-90 shrink-0"
                >
                  →
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </>
  );
}
