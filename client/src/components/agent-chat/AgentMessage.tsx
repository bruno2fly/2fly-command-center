"use client";

import { AGENTS, useAgentChat, type ChatMessage } from "@/contexts/AgentChatContext";

interface AgentMessageProps {
  message: ChatMessage;
}

// Tool name → friendly label
const TOOL_LABELS: Record<string, string> = {
  get_clients: "Fetching clients",
  get_client_detail: "Loading client details",
  get_requests: "Checking requests",
  get_content: "Checking content pipeline",
  get_ads: "Loading ad reports",
  get_health: "Running health check",
  get_pulse: "Getting pulse summary",
  create_request: "Creating request",
  update_request: "Updating request",
  create_content: "Creating content",
  update_content: "Updating content",
  update_client: "Updating client",
  web_search: "Searching the web",
};

export function AgentMessage({ message }: AgentMessageProps) {
  const { confirmAction, cancelAction, sending } = useAgentChat();
  const isUser = message.role === "user";
  const isError = !isUser && message.content.startsWith("Error:");
  const agent = AGENTS.find((a) => a.id === message.agentId);

  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── User message ──
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] space-y-1">
          <div className="bg-blue-600 text-white text-sm px-3.5 py-2 rounded-2xl rounded-br-md whitespace-pre-wrap">
            {message.content}
          </div>
          <p className="text-[10px] text-gray-500 text-right pr-1">{time}</p>
        </div>
      </div>
    );
  }

  // ── Agent message ──
  return (
    <div className="flex gap-2">
      <div className="shrink-0 w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-sm">
        {agent?.emoji || "🤖"}
      </div>
      <div className="max-w-[85%] space-y-2">
        {/* Tool calls executed (read-only) */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/50 border border-gray-700/50 rounded-lg px-2.5 py-1.5"
              >
                <span className={tc.success ? "text-emerald-400" : "text-red-400"}>
                  {tc.success ? "✓" : "✗"}
                </span>
                <span>{tc.resultSummary || TOOL_LABELS[tc.toolName] || tc.toolName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main response text */}
        {message.content && (
          <div
            className={`text-sm px-3.5 py-2 rounded-2xl rounded-bl-md whitespace-pre-wrap ${
              isError
                ? "bg-red-900/30 text-red-300 border border-red-800/40"
                : "bg-gray-800 text-gray-200"
            }`}
          >
            {message.content}
          </div>
        )}

        {/* Pending confirmation card */}
        {message.pendingConfirmation && (
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-3 space-y-2">
            <p className="text-xs font-medium text-amber-300">
              ⚠️ Action requires confirmation
            </p>
            <p className="text-sm text-gray-300">
              {message.pendingConfirmation.description}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => confirmAction(message.pendingConfirmation!.confirmId)}
                disabled={sending}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {sending ? "Executing..." : "Confirm"}
              </button>
              <button
                onClick={() => cancelAction(message.pendingConfirmation!.confirmId)}
                disabled={sending}
                className="px-3 py-1.5 text-xs font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-500 pl-1">
          {agent?.name || message.agentId} &middot; {time}
        </p>
      </div>
    </div>
  );
}
