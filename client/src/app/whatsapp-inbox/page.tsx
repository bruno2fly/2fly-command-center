"use client";

/**
 * WhatsApp Inbox — 2-panel layout: Inbox list (left) + Action panel (right)
 */

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getInboxItems } from "@/lib/client/mockClientControlData";
import { useClients } from "@/contexts/ClientsContext";
import { toast } from "sonner";

const API_BASE = "/api/whatsapp";

type Filter = "all" | "needs_reply" | "requests" | "fyi" | "archived";

type MessageItem = {
  id: string;
  clientId: string;
  clientName: string;
  summary: string;
  body: string;
  type: string;
  confidence?: number;
  timestamp: string;
  tags: string[];
};

function useWhatsAppMessages() {
  const { clients } = useClients();
  const [apiRequests, setApiRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/requests?status=pending`);
      const data = await res.json();
      setApiRequests(data.requests || []);
    } catch {
      setApiRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getClientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "Unknown";

  const fromApi = apiRequests.map((r: any) => ({
    id: r.id,
    clientId: r.senderId || "1",
    clientName: r.senderName || "Unknown",
    summary: r.classification?.summary || r.rawMessage?.slice(0, 60) || "",
    body: r.rawMessage || "",
    type: r.classification?.intent || "task_request",
    confidence: r.classification?.confidence ? Math.round(r.classification.confidence * 100) : 85,
    timestamp: r.timestamp ? new Date(r.timestamp).toISOString() : new Date().toISOString(),
    tags: r.classification?.isRequest ? ["urgent"] : ["content"],
  }));

  const fromMock = clients.flatMap((c) =>
    getInboxItems(c.id).map((i) => ({
      id: i.id,
      clientId: c.id,
      clientName: c.name,
      summary: i.summary,
      body: i.body,
      type: i.type,
      confidence: 85,
      timestamp: i.createdAt,
      tags: i.tags,
    }))
  );

  const all = fromApi.length > 0 ? fromApi : fromMock;
  return { messages: all, loading };
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffM < 60) return `${diffM}m ago`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

export default function WhatsAppInboxPage() {
  const { isDark } = useTheme();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<MessageItem | null>(null);
  const { messages, loading } = useWhatsAppMessages();

  const filtered = messages.filter((m) => {
    if (filter === "all") return true;
    if (filter === "needs_reply") return m.tags.includes("urgent") || m.type === "message";
    if (filter === "requests") return m.type === "request" || m.tags.includes("content");
    if (filter === "fyi") return m.tags.includes("approval") === false && m.tags.includes("urgent") === false;
    return false;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <div className={`flex h-[calc(100vh-120px)] ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      {/* Left: Inbox list */}
      <div className={`w-1/2 flex flex-col border-r ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        <div className={`p-4 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
          <h1 className={`text-xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
            WhatsApp Inbox
          </h1>
          <div className="flex gap-2 mt-3 flex-wrap">
            {(["all", "needs_reply", "requests", "fyi"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  filter === f
                    ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                    : isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-600"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Loading...</p>
          ) : sorted.length === 0 ? (
            <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No messages</p>
          ) : (
            sorted.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={`w-full text-left p-4 border-b ${
                  selected?.id === m.id
                    ? isDark ? "bg-[#141210] border-[#1a1810]" : "bg-blue-50 border-blue-100"
                    : isDark ? "border-[#1a1810] hover:bg-[#0c0c10]" : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={m.tags.includes("urgent") ? "text-red-500" : "text-amber-500"}>
                    {m.tags.includes("urgent") ? "🔴" : "🟡"}
                  </span>
                  <span className={`font-medium truncate ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                    {m.clientName}
                  </span>
                  <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                    {formatTime(m.timestamp)}
                  </span>
                </div>
                <p className={`text-sm mt-1 truncate ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
                  {m.summary}
                </p>
                <span className={`text-[10px] mt-1 inline-block ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                  AI: {m.type} ({m.confidence ?? 85}%)
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: Action panel */}
      <div className={`w-1/2 flex flex-col ${baseCls}`}>
        {selected ? (
          <>
            <div className={`p-4 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
              <h2 className={`font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                {selected.clientName}
              </h2>
              <p className={`text-sm mt-1 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
                &quot;{selected.summary}&quot;
              </p>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              <div className={`p-3 rounded-lg ${isDark ? "bg-amber-500/10 border border-amber-500/20" : "bg-amber-50 border border-amber-100"}`}>
                <p className={`text-xs font-semibold uppercase ${isDark ? "text-amber-400" : "text-amber-700"}`}>
                  AI Suggestion
                </p>
                <p className={`text-sm mt-1 ${isDark ? "text-[#c4b8a8]" : "text-gray-700"}`}>
                  → Create content task + schedule design
                </p>
              </div>
              <p className={`text-sm whitespace-pre-wrap ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
                {selected.body}
              </p>
            </div>
            <div className={`p-4 border-t flex gap-2 flex-wrap ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
              <button
                onClick={() => toast.success("✓ Task created")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "bg-emerald-600/80 text-white" : "bg-blue-600 text-white"
                }`}
              >
                Create Task
              </button>
              <button
                onClick={() => toast.success("Reply opened")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-700"
                }`}
              >
                Reply on WhatsApp
              </button>
              <button
                onClick={() => toast.success("Dismissed")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-700"
                }`}
              >
                Dismiss
              </button>
              <button
                onClick={() => toast.success("Snoozed 24h")}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-700"
                }`}
              >
                Snooze 24h
              </button>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
            <p className="text-sm">Select a message</p>
          </div>
        )}
      </div>
    </div>
  );
}
