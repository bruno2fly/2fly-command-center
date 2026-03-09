"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ─── Types ───────────────────────────────────────────

export type AgentId =
  | "inbox-triage"
  | "client-memory"
  | "project-manager"
  | "approval-feedback"
  | "content-system"
  | "founder-boss"
  | "research-intel";

export interface AgentInfo {
  id: AgentId;
  name: string;
  description: string;
  emoji: string;
}

export interface ToolCallDisplay {
  toolName: string;
  toolInput: Record<string, unknown>;
  success: boolean;
  resultSummary: string;
}

export interface PendingConfirmation {
  confirmId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentId: AgentId;
  timestamp: string;
  // Tool-use metadata
  toolCalls?: ToolCallDisplay[];
  pendingConfirmation?: PendingConfirmation;
  isConfirmation?: boolean; // UI-only: this is a confirmation result message
}

export interface AgentStatus {
  id: AgentId;
  name: string;
  emoji: string;
  description: string;
  online: boolean;
  lastChecked: string;
}

// ─── Constants ───────────────────────────────────────

export const AGENTS: AgentInfo[] = [
  { id: "inbox-triage", name: "Inbox Triage", description: "Routes and categorizes requests", emoji: "📬" },
  { id: "client-memory", name: "Client Memory", description: "Client knowledge keeper", emoji: "🧠" },
  { id: "project-manager", name: "Project Manager", description: "Task lifecycle management", emoji: "📋" },
  { id: "approval-feedback", name: "Approval & Feedback", description: "Review gate for deliverables", emoji: "✅" },
  { id: "content-system", name: "Content System", description: "Content pipeline management", emoji: "📝" },
  { id: "founder-boss", name: "Founder Boss", description: "Strategic decisions & overrides", emoji: "👑" },
  { id: "research-intel", name: "Research Intelligence", description: "Weekly market research & competitive intel", emoji: "🛰️" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ─── Context Value ───────────────────────────────────

type AgentChatContextValue = {
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
  togglePanel: () => void;

  activeAgent: AgentId;
  setActiveAgent: (id: AgentId) => void;

  activeClientId: string | null;
  setActiveClientId: (id: string | null) => void;

  messages: ChatMessage[];
  sending: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;

  // Tool confirmation
  confirmAction: (confirmId: string) => Promise<void>;
  cancelAction: (confirmId: string) => Promise<void>;

  agentStatuses: AgentStatus[];
  gatewayOnline: boolean;
  refreshStatus: () => Promise<void>;
};

const AgentChatContext = createContext<AgentChatContextValue | null>(null);

// ─── Helpers ─────────────────────────────────────────

let msgCounter = 0;
function msgId(): string {
  return `msg-${Date.now()}-${++msgCounter}`;
}

// ─── Provider ────────────────────────────────────────

export function AgentChatProvider({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentId>("inbox-triage");
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [gatewayOnline, setGatewayOnline] = useState(false);
  const [agentStatuses, setAgentStatuses] = useState<AgentStatus[]>([]);
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});

  const messages = useMemo(
    () => messagesByAgent[activeAgent] || [],
    [messagesByAgent, activeAgent]
  );

  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);
  const togglePanel = useCallback(() => setPanelOpen((p) => !p), []);

  // Add a message to the active agent's thread
  const addMessage = useCallback(
    (msg: ChatMessage) => {
      setMessagesByAgent((prev) => ({
        ...prev,
        [msg.agentId]: [...(prev[msg.agentId] || []), msg],
      }));
    },
    []
  );

  // Process API response into chat messages
  const processResponse = useCallback(
    (data: Record<string, unknown>, agent: AgentId) => {
      const assistantMsg: ChatMessage = {
        id: msgId(),
        role: "assistant",
        content: (data.response as string) || "",
        agentId: agent,
        timestamp: (data.timestamp as string) || new Date().toISOString(),
        toolCalls: data.toolCalls as ToolCallDisplay[] | undefined,
        pendingConfirmation: data.pendingConfirmation as PendingConfirmation | undefined,
      };
      addMessage(assistantMsg);
    },
    [addMessage]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || sending) return;

      const userMsg: ChatMessage = {
        id: msgId(),
        role: "user",
        content: content.trim(),
        agentId: activeAgent,
        timestamp: new Date().toISOString(),
      };
      addMessage(userMsg);
      setSending(true);

      try {
        const recentHistory = (messagesByAgent[activeAgent] || [])
          .filter((m) => !m.pendingConfirmation && !m.isConfirmation) // skip confirmation UI messages
          .slice(-10)
          .map((m) => ({ role: m.role, content: m.content }));

        const res = await fetch(`${API_BASE}/api/agents/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent: activeAgent,
            message: content.trim(),
            history: recentHistory,
            clientId: activeClientId,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        processResponse(data, activeAgent);
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : "Unknown error";
        addMessage({
          id: msgId(),
          role: "assistant",
          content: `Error: ${errorText}`,
          agentId: activeAgent,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setSending(false);
      }
    },
    [activeAgent, activeClientId, messagesByAgent, sending, addMessage, processResponse]
  );

  // ─── Confirmation handlers ─────────────────────────

  const confirmAction = useCallback(
    async (confirmId: string) => {
      setSending(true);
      try {
        const res = await fetch(`${API_BASE}/api/agents/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmId, approved: true }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Confirm failed" }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const confirmMsg: ChatMessage = {
          id: msgId(),
          role: "assistant",
          content: data.response || "Action confirmed and executed.",
          agentId: activeAgent,
          timestamp: data.timestamp || new Date().toISOString(),
          toolCalls: data.toolCalls,
          pendingConfirmation: data.pendingConfirmation,
          isConfirmation: true,
        };
        addMessage(confirmMsg);
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : "Unknown error";
        addMessage({
          id: msgId(),
          role: "assistant",
          content: `Confirmation error: ${errorText}`,
          agentId: activeAgent,
          timestamp: new Date().toISOString(),
        });
      } finally {
        setSending(false);
      }
    },
    [activeAgent, addMessage]
  );

  const cancelAction = useCallback(
    async (confirmId: string) => {
      try {
        await fetch(`${API_BASE}/api/agents/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmId, approved: false }),
        });
        addMessage({
          id: msgId(),
          role: "assistant",
          content: "Action cancelled.",
          agentId: activeAgent,
          timestamp: new Date().toISOString(),
          isConfirmation: true,
        });
      } catch {
        // Silent cancel is fine
      }
    },
    [activeAgent, addMessage]
  );

  const clearMessages = useCallback(() => {
    setMessagesByAgent((prev) => ({ ...prev, [activeAgent]: [] }));
  }, [activeAgent]);

  const refreshStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/agents/status`);
      if (res.ok) {
        const data = await res.json();
        setGatewayOnline(data.gateway?.online ?? false);
        setAgentStatuses(data.agents || []);
      } else {
        setGatewayOnline(false);
      }
    } catch {
      setGatewayOnline(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      panelOpen, openPanel, closePanel, togglePanel,
      activeAgent, setActiveAgent,
      activeClientId, setActiveClientId,
      messages, sending, sendMessage, clearMessages,
      confirmAction, cancelAction,
      agentStatuses, gatewayOnline, refreshStatus,
    }),
    [
      panelOpen, openPanel, closePanel, togglePanel,
      activeAgent, activeClientId,
      messages, sending, sendMessage, clearMessages,
      confirmAction, cancelAction,
      agentStatuses, gatewayOnline, refreshStatus,
    ]
  );

  return <AgentChatContext.Provider value={value}>{children}</AgentChatContext.Provider>;
}

export function useAgentChat() {
  const ctx = useContext(AgentChatContext);
  if (!ctx) throw new Error("useAgentChat must be used within AgentChatProvider");
  return ctx;
}
