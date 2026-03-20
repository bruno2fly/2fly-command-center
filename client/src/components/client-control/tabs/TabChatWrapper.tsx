"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { InlineAgentChat } from "./InlineAgentChat";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type TabChatConfig = {
  clientId: string;
  tab: string;
  agentId: string;
  agentLabel: string;
  agentEmoji: string;
  placeholder?: string;
  emptyHint?: string;
  // Optional extra context to append (e.g., strategy-specific data)
  extraContext?: string;
  // Called when user accepts an agent response
  onAccept?: (content: string) => void;
};

/**
 * Wraps any tab content with an optional inline agent chat.
 * Provides a header with "💬 Ask Agent" button and auto-fetches tab context from the server.
 *
 * Usage:
 *   <TabChatWrapper
 *     clientId={clientId}
 *     tab="ads"
 *     agentId="meta-traffic"
 *     agentLabel="Ads Agent"
 *     agentEmoji="🎯"
 *   >
 *     {existingTabContent}
 *   </TabChatWrapper>
 */
export function TabChatWrapper({
  clientId,
  tab,
  agentId,
  agentLabel,
  agentEmoji,
  placeholder,
  emptyHint,
  extraContext,
  onAccept,
  children,
}: TabChatConfig & { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const [showChat, setShowChat] = useState(false);
  const [context, setContext] = useState<string>("");

  // Fetch context when chat is opened
  useEffect(() => {
    if (!showChat) return;
    let cancelled = false;
    fetch(`${API}/api/agents/context/${clientId}/${tab}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setContext(d.context + (extraContext ? `\n\n${extraContext}` : ""));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [showChat, clientId, tab, extraContext]);

  const defaultOnAccept = useCallback(async (content: string) => {
    // Default: append to client notes
    try {
      const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      await fetch(`${API}/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes_append: `\n\n---\n### 🤖 ${agentLabel} (${timestamp}) — ✅ Accepted\n${content}`,
        }),
      });
    } catch (err) {
      console.error("Failed to save accepted response:", err);
    }
  }, [clientId, agentLabel]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat toggle header */}
      <div className={`shrink-0 flex items-center justify-end px-4 py-2 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
        <button
          onClick={() => setShowChat((v) => !v)}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
            showChat
              ? isDark ? "bg-purple-500/30 text-purple-300 ring-1 ring-purple-500/40" : "bg-purple-100 text-purple-700 ring-1 ring-purple-300"
              : isDark
                ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 hover:from-blue-500/30 hover:to-purple-500/30"
                : "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 hover:from-blue-100 hover:to-purple-100"
          }`}
        >
          {showChat ? "✕ Close Chat" : "💬 Ask Agent"}
        </button>
      </div>

      {/* Inline chat (when open) */}
      {showChat && context && (
        <div className="shrink-0 px-4 pb-3">
          <InlineAgentChat
            clientId={clientId}
            agent={{ id: agentId, label: agentLabel, emoji: agentEmoji }}
            context={context}
            onAccept={onAccept || defaultOnAccept}
            placeholder={placeholder}
            emptyHint={emptyHint}
          />
        </div>
      )}

      {/* Original tab content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
