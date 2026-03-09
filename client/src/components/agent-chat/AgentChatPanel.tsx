"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAgentChat, AGENTS } from "@/contexts/AgentChatContext";
import { AgentSelector } from "./AgentSelector";
import { AgentMessage } from "./AgentMessage";
import { AgentStatusBadge } from "./AgentStatusBadge";

const PANEL_WIDTH = 400;

export function AgentChatPanel() {
  const {
    panelOpen,
    closePanel,
    activeAgent,
    messages,
    sending,
    sendMessage,
    clearMessages,
    gatewayOnline,
    refreshStatus,
  } = useAgentChat();

  const [input, setInput] = useState("");
  const [showAgentList, setShowAgentList] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const agent = AGENTS.find((a) => a.id === activeAgent);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (panelOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      refreshStatus();
    }
  }, [panelOpen, refreshStatus]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && panelOpen) {
        closePanel();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [panelOpen, closePanel]);

  async function handleSend() {
    if (!input.trim() || sending) return;
    const msg = input;
    setInput("");
    await sendMessage(msg);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <AnimatePresence>
      {panelOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={closePanel}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: PANEL_WIDTH }}
            animate={{ x: 0 }}
            exit={{ x: PANEL_WIDTH }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex flex-col bg-gray-900 border-l border-gray-800 shadow-2xl"
            style={{ width: PANEL_WIDTH }}
          >
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAgentList(!showAgentList)}
                  className="flex items-center gap-2 hover:bg-gray-800 px-2 py-1 rounded-lg transition-colors"
                >
                  <span className="text-lg">{agent?.emoji}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">
                        {agent?.name}
                      </span>
                      <AgentStatusBadge online={gatewayOnline} size="sm" />
                    </div>
                    <p className="text-[10px] text-gray-500">{agent?.description}</p>
                  </div>
                  <svg
                    className={`w-3 h-3 text-gray-500 transition-transform ${
                      showAgentList ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearMessages}
                    className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
                    title="Clear chat"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={closePanel}
                  className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Agent list dropdown */}
            <AnimatePresence>
              {showAgentList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden border-b border-gray-800"
                >
                  <div className="p-3">
                    <AgentSelector />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <span className="text-4xl mb-3">{agent?.emoji}</span>
                  <p className="text-sm text-gray-400 font-medium mb-1">
                    Chat with {agent?.name}
                  </p>
                  <p className="text-xs text-gray-600 mb-4">{agent?.description}</p>
                  <div className="space-y-1.5 w-full">
                    {getQuickActions(activeAgent).map((action) => (
                      <button
                        key={action.cmd}
                        type="button"
                        onClick={() => sendMessage(action.cmd)}
                        className="w-full text-left px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 text-xs text-gray-400 hover:text-gray-200 transition-colors border border-gray-800 hover:border-gray-700"
                      >
                        <span className="text-blue-400 font-mono">{action.cmd}</span>
                        <span className="text-gray-600 ml-2">{action.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg) => <AgentMessage key={msg.id} message={msg} />)
              )}

              {sending && (
                <div className="flex gap-2">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-sm">
                    {agent?.emoji}
                  </div>
                  <div className="bg-gray-800 text-gray-400 text-sm px-3.5 py-2 rounded-2xl rounded-bl-md">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="shrink-0 p-3 border-t border-gray-800">
              {!gatewayOnline && (
                <div className="mb-2 px-3 py-1.5 bg-red-900/20 border border-red-800/30 rounded-lg text-[11px] text-red-400">
                  Gateway offline. Run <code className="bg-gray-800 px-1 rounded">openclaw gateway start</code>
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${agent?.name}...`}
                  rows={1}
                  className="flex-1 bg-gray-800 text-sm text-gray-200 rounded-xl px-3.5 py-2.5 resize-none border border-gray-700 focus:border-blue-500 focus:outline-none placeholder:text-gray-600"
                  style={{ maxHeight: 120 }}
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="self-end shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </div>
              <p className="text-[10px] text-gray-600 mt-1.5 px-1">
                Enter to send &middot; Shift+Enter for new line &middot; Esc to close
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Quick actions per agent ────────────────────────

function getQuickActions(agentId: string): Array<{ cmd: string; desc: string }> {
  const actions: Record<string, Array<{ cmd: string; desc: string }>> = {
    "inbox-triage": [
      { cmd: "!ping", desc: "Check if agent is alive" },
      { cmd: "!status", desc: "System status overview" },
      { cmd: "!help", desc: "List all commands" },
    ],
    "client-memory": [
      { cmd: "!client list", desc: "List all clients" },
      { cmd: "!client add", desc: "Add a new client" },
      { cmd: "!client search", desc: "Search clients" },
    ],
    "project-manager": [
      { cmd: "!task list", desc: "Show all tasks" },
      { cmd: "!overdue", desc: "Check overdue tasks" },
      { cmd: "!workload", desc: "Team workload overview" },
    ],
    "approval-feedback": [
      { cmd: "!pending", desc: "Show pending reviews" },
      { cmd: "!review", desc: "Start a review" },
    ],
    "content-system": [
      { cmd: "!content list", desc: "Content pipeline overview" },
      { cmd: "!calendar", desc: "Content calendar" },
      { cmd: "!due", desc: "Upcoming deadlines" },
    ],
    "founder-boss": [
      { cmd: "!pulse", desc: "Full business pulse" },
      { cmd: "!risk", desc: "Risk assessment" },
      { cmd: "!priority", desc: "Current priorities" },
    ],
  };

  return actions[agentId] || actions["inbox-triage"]!;
}
