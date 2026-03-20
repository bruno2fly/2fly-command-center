"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import ReactMarkdown from "react-markdown";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  status?: "pending" | "accepted" | "rejected";
};

type AgentDef = {
  id: string;
  label: string;
  emoji: string;
};

type Props = {
  clientId: string;
  agent: AgentDef;
  context: string;
  onAccept: (content: string) => void;
  placeholder?: string;
  emptyHint?: string;
};

let counter = 0;
function msgId() { return `smsg-${Date.now()}-${++counter}`; }

export function InlineAgentChat({ clientId, agent, context, onAccept, placeholder, emptyHint }: Props) {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");

    const userMsg: Message = {
      id: msgId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${API}/api/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: agent.id,
          message: text,
          history,
          clientId,
          pageContext: context,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Handle async job polling
      if (data.jobId && !data.response) {
        const jobId = data.jobId;
        let attempts = 0;
        const poll = async (): Promise<string> => {
          const pollRes = await fetch(`${API}/api/agents/job/${jobId}`);
          const pollData = await pollRes.json();
          if (pollData.status === "done") return pollData.response || "No response.";
          if (pollData.status === "error") throw new Error(pollData.error || "Agent error");
          if (attempts++ > 60) throw new Error("Agent timeout");
          await new Promise((r) => setTimeout(r, 2000));
          return poll();
        };
        const response = await poll();
        setMessages((prev) => [...prev, {
          id: msgId(),
          role: "assistant",
          content: response,
          timestamp: new Date().toISOString(),
          status: "pending",
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: msgId(),
          role: "assistant",
          content: data.response || "No response.",
          timestamp: new Date().toISOString(),
          status: "pending",
        }]);
      }
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [...prev, {
        id: msgId(),
        role: "assistant",
        content: `Error: ${errorText}`,
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, clientId, strategyContext]);

  const handleAccept = (msg: Message) => {
    setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: "accepted" } : m));
    onAccept(msg.content);
  };

  const handleReject = (msgId: string) => {
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, status: "rejected" } : m));
  };

  return (
    <div className={`rounded-xl border overflow-hidden flex flex-col ${
      isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"
    }`} style={{ height: "420px" }}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${
        isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-100 bg-gray-50"
      }`}>
        <span className="text-sm">{agent.emoji}</span>
        <span className={`text-sm font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-800"}`}>{agent.label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-green-100 text-green-700"}`}>
          Online
        </span>
        <span className={`ml-auto text-xs ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
          📍 Has full strategy context
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
        {messages.length === 0 && (
          <div className={`text-center py-8 ${isDark ? "text-[#3a3020]" : "text-gray-300"}`}>
            <div className="text-3xl mb-2">🎯</div>
            <p className="text-sm">{emptyHint || "Ask me anything. I have full context on this page."}</p>
            <p className="text-xs mt-1">I can analyze, suggest, create, and refine.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] ${msg.role === "user" ? "" : "w-full"}`}>
              {/* Message bubble */}
              <div className={`rounded-xl px-3.5 py-2.5 text-sm ${
                msg.role === "user"
                  ? isDark
                    ? "bg-emerald-500/20 text-emerald-100"
                    : "bg-blue-600 text-white"
                  : msg.status === "accepted"
                    ? isDark ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-green-50 border border-green-200"
                    : msg.status === "rejected"
                      ? isDark ? "bg-red-500/5 border border-red-500/20 opacity-50" : "bg-red-50 border border-red-200 opacity-50"
                      : isDark ? "bg-[#0c0c10] border border-[#1a1810]" : "bg-white border border-gray-200"
              }`}>
                {msg.role === "assistant" ? (
                  <div className={`prose prose-sm max-w-none ${isDark ? "prose-invert" : ""}`}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>

              {/* Accept / Reject buttons for assistant messages */}
              {msg.role === "assistant" && msg.status === "pending" && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleAccept(msg)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isDark
                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                        : "bg-green-100 text-green-700 hover:bg-green-200"
                    }`}
                  >
                    ✅ Accept & Add to Plan
                  </button>
                  <button
                    onClick={() => handleReject(msg.id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isDark
                        ? "bg-[#1a1810] text-[#5a5040] hover:text-[#8a7e6d]"
                        : "bg-gray-100 text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    ❌ Reject
                  </button>
                  <button
                    onClick={() => { setInput("Refine this further: "); inputRef.current?.focus(); }}
                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                      isDark
                        ? "bg-[#1a1810] text-[#5a5040] hover:text-[#8a7e6d]"
                        : "bg-gray-100 text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    🔄 Refine
                  </button>
                </div>
              )}

              {/* Status badges */}
              {msg.status === "accepted" && (
                <span className={`inline-block mt-1.5 text-xs ${isDark ? "text-emerald-400" : "text-green-600"}`}>✅ Added to plan</span>
              )}
              {msg.status === "rejected" && (
                <span className={`inline-block mt-1.5 text-xs ${isDark ? "text-red-400" : "text-red-500"}`}>❌ Rejected</span>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className={`rounded-xl px-4 py-3 text-sm ${isDark ? "bg-[#0c0c10] border border-[#1a1810]" : "bg-white border border-gray-200"}`}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className={`shrink-0 px-3 py-2.5 border-t ${isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-100 bg-white"}`}>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={placeholder || "Ask anything..."}
            disabled={sending}
            className={`flex-1 text-sm rounded-lg px-3 py-2 border ${
              isDark
                ? "bg-[#06060a] border-[#1a1810] text-[#c4b8a8] placeholder-[#3a3020]"
                : "bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400"
            } focus:outline-none focus:ring-1 ${isDark ? "focus:ring-emerald-500/50" : "focus:ring-blue-500/50"}`}
          />
          <button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            className={`p-2 rounded-lg transition-colors ${
              sending || !input.trim()
                ? isDark ? "bg-[#1a1810] text-[#3a3020]" : "bg-gray-100 text-gray-300"
                : isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
