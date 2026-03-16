"use client";

import { useCallback, useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ApiContentStrategy } from "@/lib/api";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { toast } from "sonner";

const STRATEGY_TYPES: { type: string; label: string; emoji: string }[] = [
  { type: "brand_profile", label: "Brand Intelligence Profile", emoji: "🔍" },
  { type: "audience_map", label: "Audience Psychology", emoji: "🧠" },
  { type: "competitor_analysis", label: "Competitor & Market Analysis", emoji: "📊" },
  { type: "review_mining", label: "Review Mining Insights", emoji: "⭐" },
  { type: "trend_intel", label: "Trend Intelligence", emoji: "🔥" },
  { type: "content_pillars", label: "Content Pillars", emoji: "📐" },
  { type: "hook_library", label: "Hook Library", emoji: "🎣" },
  { type: "local_intel", label: "Local Intelligence", emoji: "📍" },
  { type: "visual_direction", label: "Visual Direction", emoji: "🎨" },
  { type: "content_scores", label: "Content Scores", emoji: "📈" },
];

type Props = {
  clientId: string;
  clientName?: string;
};

function parseData(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function StrategyCard({
  item,
  isDark,
  onCopyHook,
}: {
  item: ApiContentStrategy;
  isDark: boolean;
  onCopyHook?: (text: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseData(item.data);
  const isHookLibrary = item.type === "hook_library";

  let hooks: string[] = [];
  if (isHookLibrary && parsed && typeof parsed === "object" && "hooks" in parsed) {
    const h = (parsed as { hooks?: unknown }).hooks;
    hooks = Array.isArray(h) ? h.filter((x): x is string => typeof x === "string") : [];
  }

  const cardBg = isDark ? "bg-[#0a0a0e]" : "bg-white";
  const borderCls = isDark ? "border-white/5" : "border-gray-200";
  const textCls = isDark ? "text-gray-200" : "text-gray-800";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  const meta = STRATEGY_TYPES.find((m) => m.type === item.type) ?? {
    type: item.type,
    label: item.type.replace(/_/g, " "),
    emoji: "📄",
  };

  return (
    <motion.div
      layout
      initial={false}
      className={`rounded-xl border ${borderCls} ${cardBg} overflow-hidden`}
    >
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${textCls}`}
      >
        <span className="font-medium">
          {meta.emoji} {meta.label}
        </span>
        <span className={`text-xs ${mutedCls}`}>
          v{item.version}
          {item.updatedAt && (
            <> · {new Date(item.updatedAt).toLocaleDateString()}</>
          )}
        </span>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-inherit overflow-hidden"
          >
            <div className={`px-4 py-3 ${isDark ? "bg-[#06060a]" : "bg-gray-50/80"}`}>
              {isHookLibrary && hooks.length > 0 ? (
                <ul className="space-y-2">
                  {hooks.map((hook, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 rounded-lg px-3 py-2 ${isDark ? "bg-white/5" : "bg-white"} border ${borderCls}`}
                    >
                      <span className={`flex-1 text-sm ${textCls}`}>{hook}</span>
                      <button
                        type="button"
                        onClick={() => onCopyHook?.(hook)}
                        className="shrink-0 text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        📋 Copy
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <pre
                  className={`text-xs overflow-auto max-h-64 whitespace-pre-wrap break-words ${mutedCls}`}
                >
                  {typeof parsed === "string"
                    ? parsed
                    : JSON.stringify(parsed, null, 2)}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Inline Agent Chat ──────────────────────────────────────
function InlineAgentChat({
  clientId,
  clientName,
  isDark,
  onComplete,
}: {
  clientId: string;
  clientName?: string;
  isDark: boolean;
  onComplete: () => void;
}) {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const name = clientName || "this client";

  const quickActions = [
    { label: "🔍 Full Strategy", prompt: `Run a full content strategy analysis for ${name}. Generate brand profile, audience psychology, content pillars, hook library, competitor analysis, and visual direction. Save each as a strategy document.` },
    { label: "🎣 Generate Hooks", prompt: `Generate 15 content hooks for ${name} across categories: curiosity, contrarian, story-driven, authority, and urgency. Save as hook_library strategy.` },
    { label: "📐 Content Pillars", prompt: `Define 5 content pillars for ${name} with emoji, purpose, audience reaction, and example topics. Save as content_pillars strategy.` },
    { label: "📊 Competitor Analysis", prompt: `Analyze the top 3-5 competitors for ${name}. Identify content gaps, what they do well, and differentiation opportunities. Save as competitor_analysis strategy.` },
    { label: "🔥 2-Week Calendar", prompt: `Generate a 2-week content calendar for ${name} with specific post ideas, hooks, best posting times, and content types. Include at least 10 content ideas.` },
    { label: "🧠 Audience Map", prompt: `Map the audience psychology for ${name}: desires, fears, triggers, objections, and purchase motivations. Save as audience_map strategy.` },
  ];

  async function sendMessage(msg: string) {
    setSending(true);
    setResponse(null);
    setMessage("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/agents/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent: "content-system",
            message: msg,
            clientId,
          }),
        }
      );
      const data = await res.json();
      setResponse(data.response || data.error || "No response");
      // Refresh strategies after agent responds
      setTimeout(onComplete, 2000);
    } catch {
      setResponse("Failed to reach Content Agent");
    } finally {
      setSending(false);
    }
  }

  const cardBg = isDark ? "bg-[#0a0a0e]" : "bg-white";
  const borderCls = isDark ? "border-white/5" : "border-gray-200";
  const textCls = isDark ? "text-gray-200" : "text-gray-800";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  return (
    <div className={`rounded-xl border ${borderCls} ${cardBg} p-5`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🧠</span>
        <h3 className={`font-semibold ${textCls}`}>Content Agent</h3>
        {sending && (
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="text-xs text-indigo-400 ml-2"
          >
            ⚡ Generating...
          </motion.span>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => sendMessage(qa.prompt)}
            disabled={sending}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
              isDark
                ? "border-white/10 bg-white/[0.03] text-gray-300 hover:bg-white/[0.08] hover:border-white/20"
                : "border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {qa.label}
          </button>
        ))}
      </div>

      {/* Custom Message */}
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !sending && message.trim() && sendMessage(message)}
          placeholder={`Ask anything about ${name}'s content strategy...`}
          disabled={sending}
          className={`flex-1 text-sm px-3 py-2 rounded-lg border ${
            isDark
              ? "border-white/10 bg-white/5 text-white placeholder-gray-600"
              : "border-gray-200 bg-white text-gray-900"
          } focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50`}
        />
        <button
          onClick={() => sendMessage(message)}
          disabled={sending || !message.trim()}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 disabled:opacity-40 transition-colors"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>

      {/* Response */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-sm p-4 rounded-lg max-h-60 overflow-y-auto ${
              isDark ? "bg-white/[0.03] text-gray-300 border border-white/5" : "bg-gray-50 text-gray-700 border border-gray-200"
            }`}
          >
            <pre className="whitespace-pre-wrap break-words font-sans">{response}</pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────
export function ContentStrategyView({ clientId, clientName }: Props) {
  const { isDark } = useTheme();
  const { openPanel, setActiveAgent } = useAgentChat();
  const [strategies, setStrategies] = useState<ApiContentStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStrategies = useCallback(() => {
    setLoading(true);
    api
      .getClientStrategies(clientId)
      .then(setStrategies)
      .catch(() => setStrategies([]))
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const openContentAgent = useCallback(() => {
    setActiveAgent("content-system");
    openPanel();
  }, [setActiveAgent, openPanel]);

  const copyHook = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("Hook copied to clipboard"),
      () => toast.error("Failed to copy")
    );
  }, []);

  const byType = new Map<string, ApiContentStrategy>();
  for (const s of strategies) {
    const existing = byType.get(s.type);
    if (!existing || s.version > existing.version) byType.set(s.type, s);
  }

  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const borderCls = isDark ? "border-white/5" : "border-gray-200";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  if (loading) {
    return (
      <div className={`p-6 ${bgBase}`}>
        <p className={mutedCls}>Loading strategy…</p>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className={`p-4 md:p-6 space-y-4 ${bgBase}`}>
        <InlineAgentChat
          clientId={clientId}
          clientName={clientName}
          isDark={isDark}
          onComplete={fetchStrategies}
        />
        <div className={`rounded-xl border ${borderCls} p-8 text-center`}
          style={{ backgroundColor: isDark ? "rgba(10,10,14,0.6)" : "rgba(255,255,255,0.8)" }}
        >
          <p className="text-2xl mb-2">🧠</p>
          <p className={`text-sm ${mutedCls}`}>
            No strategy documents yet. Use the quick actions above to generate brand profiles, content pillars, hooks, and more.
          </p>
        </div>
      </div>
    );
  }

  const predefinedTypes = new Set(STRATEGY_TYPES.map((t) => t.type));
  const ordered = STRATEGY_TYPES.map((t) => byType.get(t.type)).filter(Boolean) as ApiContentStrategy[];
  const otherItems = Array.from(byType.entries())
    .filter(([type]) => !predefinedTypes.has(type))
    .map(([, item]) => item);
  const allItems = [...ordered, ...otherItems];

  return (
    <div className={`p-4 md:p-6 space-y-4 ${bgBase}`}>
      {/* Inline Agent Chat — always visible */}
      <InlineAgentChat
        clientId={clientId}
        clientName={clientName}
        isDark={isDark}
        onComplete={fetchStrategies}
      />
      
      {/* Strategy Cards */}
      {allItems.map((item) => (
        <StrategyCard
          key={item.id}
          item={item}
          isDark={isDark}
          onCopyHook={item.type === "hook_library" ? copyHook : undefined}
        />
      ))}
    </div>
  );
}
