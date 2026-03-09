"use client";

/**
 * WhatsApp-style chat dashboard for admin.
 * Route: /admin/whatsapp
 */

import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = "/api/whatsapp/chat";
const POLL_INTERVAL = 3000;

interface Conversation {
  id: string;
  contactNumber: string;
  contactName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  fromNumber: string;
  toNumber: string;
  body: string;
  direction: "inbound" | "outbound";
  status: string;
  timestamp: string;
  twilioSid: string | null;
}

function getAuthHeaders(): Record<string, string> {
  const p = typeof window !== "undefined" ? sessionStorage.getItem("admin_pwd") : null;
  if (p) return { "x-admin-password": p };
  return {};
}

function authFetch(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: { ...getAuthHeaders(), ...init?.headers, "Content-Type": "application/json" },
  });
}

export default function AdminWhatsAppPage() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [search, setSearch] = useState("");
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  const checkAuth = useCallback(async () => {
    const p = sessionStorage.getItem("admin_pwd");
    if (p) {
      const r = await authFetch(`${API_BASE}/auth`, {
        method: "POST",
        body: JSON.stringify({ password: p }),
      });
      if (r.ok) {
        setAuthenticated(true);
        return true;
      }
      sessionStorage.removeItem("admin_pwd");
    }
    setAuthenticated(false);
    return false;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const r = await fetch(`${API_BASE}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.ok) {
      sessionStorage.setItem("admin_pwd", password);
      setAuthenticated(true);
    } else {
      setAuthError(data.error || "Invalid password");
    }
  };

  const fetchConversations = useCallback(async () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const r = await authFetch(`${API_BASE}/conversations${q}`);
    if (r.status === 401) {
      sessionStorage.removeItem("admin_pwd");
      setAuthenticated(false);
      return;
    }
    if (r.ok) {
      const data = await r.json();
      setConversations(data.conversations || []);
    }
  }, [search]);

  const fetchMessages = useCallback(
    async (convId: string) => {
      const r = await authFetch(`${API_BASE}/conversations/${convId}/messages`);
      if (r.status === 401) {
        sessionStorage.removeItem("admin_pwd");
        setAuthenticated(false);
        return;
      }
      if (r.ok) {
        const data = await r.json();
        setMessages(data.messages || []);
      }
    },
    []
  );

  const sendMessage = async () => {
    if (!selected || !inputText.trim()) return;
    setSending(true);
    try {
      const url = `${API_BASE}/conversations/${selected.id}/messages`;
      const r = await authFetch(url, {
        method: "POST",
        body: JSON.stringify({ body: inputText.trim() }),
      });
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/7216fa17-c4d1-41d0-8943-72a3a3b824fe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/whatsapp:sendMessage',message:'send response',data:{status:r.status,ok:r.ok,convId:selected.id},timestamp:Date.now(),hypothesisId:'send1'})}).catch(()=>{});
      // #endregion
      if (r.ok) {
        setInputText("");
        await fetchMessages(selected.id);
        await fetchConversations();
      } else {
        const err = await r.json().catch(() => ({}));
        const msg = err.detail ? `${err.error}: ${err.detail}` : (err.error || r.statusText);
        alert(`Failed to send: ${r.status} ${msg}`);
      }
    } finally {
      setSending(false);
    }
  };

  const markRead = useCallback(
    async (convId: string) => {
      await authFetch(`${API_BASE}/conversations/${convId}/read`, { method: "PATCH" });
      await fetchConversations();
    },
    [fetchConversations]
  );

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authenticated) return;
    fetchConversations();
    const t = setInterval(fetchConversations, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [authenticated, fetchConversations]);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.id);
    markRead(selected.id);
    const t = setInterval(() => fetchMessages(selected.id), POLL_INTERVAL);
    return () => clearInterval(t);
  }, [selected?.id, fetchMessages, markRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (authenticated === null) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#e5ddd5]">
        <p className="text-slate-600">Loading…</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center bg-[#075E54]">
        <form
          onSubmit={handleLogin}
          className="w-80 rounded-xl bg-white p-6 shadow-xl"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-800">Admin Login</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2"
            autoFocus
          />
          {authError && <p className="mb-2 text-sm text-red-600">{authError}</p>}
          <button
            type="submit"
            className="w-full rounded-lg bg-[#075E54] px-4 py-2 text-white hover:bg-[#064d44]"
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  const displayName = (c: Conversation) =>
    c.contactName || c.contactNumber.replace(/^whatsapp:/, "") || "Unknown";
  const lastPreview = (c: Conversation) =>
    c.lastMessage ? (c.lastMessage.length > 40 ? c.lastMessage.slice(0, 40) + "…" : c.lastMessage) : "No messages";

  return (
    <div
      className="flex h-[calc(100vh-4rem)] overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #e5ddd5 0%, #e5ddd5 100%)",
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0v60M0 30h60' stroke='%23d4cac0' stroke-width='0.5' fill='none'/%3E%3C/svg%3E\")",
      }}
    >
      {/* Left sidebar - conversations */}
      <aside className="flex w-96 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="bg-[#075E54] p-4">
          <h1 className="text-lg font-semibold text-white">WhatsApp</h1>
          <p className="text-xs text-[#a8d5ca]">+1 363 777 0337</p>
          <input
            type="text"
            placeholder="Search conversations"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-3 w-full rounded-lg bg-white/20 px-3 py-2 text-sm text-white placeholder:text-white/70"
          />
        </div>
        <div className="flex-1 overflow-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`flex w-full flex-col gap-0.5 border-b border-slate-100 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                selected?.id === c.id ? "bg-[#e5ddd5]" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate font-medium text-slate-800">{displayName(c)}</span>
                {c.lastMessageAt && (
                  <span className="text-xs text-slate-500">
                    {new Date(c.lastMessageAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-slate-600">{lastPreview(c)}</span>
                {c.unreadCount > 0 && (
                  <span className="shrink-0 rounded-full bg-[#25D366] px-2 py-0.5 text-xs font-medium text-white">
                    {c.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-500">No conversations yet</p>
          )}
        </div>
      </aside>

      {/* Right panel - chat */}
      <section className="flex flex-1 flex-col bg-[#efeae2]">
        {selected ? (
          <>
            <header className="flex items-center gap-3 border-b border-slate-200 bg-[#f0f2f5] px-4 py-3">
              <div className="h-10 w-10 rounded-full bg-[#075E54] flex items-center justify-center text-white font-medium">
                {displayName(selected).charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-slate-800">{displayName(selected)}</p>
                <p className="text-xs text-slate-500">{selected.contactNumber.replace(/^whatsapp:/, "")}</p>
              </div>
            </header>

            <div className="flex-1 overflow-auto p-4 space-y-2">
              {messages.map((m) => {
                const isOut = m.direction === "outbound";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isOut ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
                        isOut
                          ? "bg-[#DCF8C6] rounded-tr-none"
                          : "bg-white rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm text-slate-800">
                        {m.body}
                      </p>
                      <div className={`mt-1 flex items-center gap-1 ${isOut ? "justify-end" : ""}`}>
                        <span className="text-[10px] text-slate-500">
                          {new Date(m.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {isOut && (
                          <span className="text-[10px] text-slate-500" title={m.status}>
                            {m.status === "delivered" || m.status === "read" ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-slate-200 bg-[#f0f2f5] p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder="Type a message"
                  className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#075E54]"
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputText.trim() || sending}
                  className="rounded-lg bg-[#075E54] px-4 py-2 text-white hover:bg-[#064d44] disabled:opacity-50"
                >
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-slate-500">
            <div className="rounded-full bg-slate-200 p-8">
              <svg
                className="h-16 w-16 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium">Select a conversation</p>
            <p className="text-sm">Choose a contact from the list to start chatting</p>
          </div>
        )}
      </section>
    </div>
  );
}
