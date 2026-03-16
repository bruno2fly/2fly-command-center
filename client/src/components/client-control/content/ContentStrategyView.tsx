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

export function ContentStrategyView({ clientId }: Props) {
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
      <div className={`p-6 ${bgBase}`}>
        <div
          className={`rounded-xl border ${borderCls} p-8 text-center max-w-md mx-auto`}
          style={{ backgroundColor: isDark ? "rgba(10,10,14,0.6)" : "rgba(255,255,255,0.8)" }}
        >
          <p className={mutedCls}>
            No content strategy yet. Ask the Content Agent to generate brand profiles, audience maps, content pillars, hook libraries, and more.
          </p>
          <button
            type="button"
            onClick={openContentAgent}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10 transition-colors"
          >
            🧠 Ask Content Agent
          </button>
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
