"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ApiDirective } from "@/lib/api";

const AGENT_ICON: Record<string, string> = {
  "Content System": "📝",
  "Meta Traffic": "📊",
  "Research Intel": "🔍",
  "Project Manager": "📋",
  "Founder Boss": "👔",
  default: "🤖",
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays}d ago`;
}

const LAST_READ_KEY = "2fly-overview-agent-read";

function getLastRead(clientId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = sessionStorage.getItem(`${LAST_READ_KEY}-${clientId}`);
    return raw ? new Date(raw).getTime() : 0;
  } catch {
    return 0;
  }
}

function setLastRead(clientId: string) {
  try {
    sessionStorage.setItem(`${LAST_READ_KEY}-${clientId}`, new Date().toISOString());
  } catch {}
}

type Props = {
  clientId: string;
  onScrollToRef?: () => void;
};

export function AgentUpdatesSection({ clientId, onScrollToRef }: Props) {
  const { isDark } = useTheme();
  const [directives, setDirectives] = useState<ApiDirective[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    api
      .getDirectives({ clientId, status: "completed" })
      .then((r) => setDirectives((r.directives ?? []).slice(0, 10)))
      .catch(() => setDirectives([]));
  }, [clientId]);

  const lastRead = getLastRead(clientId);
  const hasNew = directives.some(
    (d) => d.completedAt && new Date(d.completedAt).getTime() > lastRead
  );

  const markRead = () => setLastRead(clientId);

  if (directives.length === 0) return null;

  const sectionCls = isDark
    ? "bg-[rgba(30,41,59,0.4)] border-[rgba(51,65,85,0.5)]"
    : "bg-white border-gray-200";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";
  const newBg = hasNew ? (isDark ? "bg-blue-500/10" : "bg-blue-50") : "";

  return (
    <section
      className={`rounded-2xl border overflow-hidden ${sectionCls} ${newBg}`}
      onMouseLeave={hasNew ? markRead : undefined}
    >
      <div className={`px-4 py-3 border-b ${cardBorder} flex items-center justify-between gap-2`}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
          🤖 Recent Agent Updates
          {hasNew && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500 text-white">
              NEW
            </span>
          )}
        </h2>
      </div>
      <ul className="divide-y divide-inherit">
        {directives.map((d) => {
          const isExpanded = expandedId === d.id;
          const icon = AGENT_ICON[d.agentName] ?? AGENT_ICON.default;
          const summary =
            [d.contentCreated > 0 && `${d.contentCreated} content`, d.tasksCreated > 0 && `${d.tasksCreated} tasks`]
              .filter(Boolean)
              .join(" + ") || "Updated";
          const isNew = d.completedAt && new Date(d.completedAt).getTime() > lastRead;

          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isNew ? (isDark ? "bg-blue-500/5" : "bg-blue-50/80") : ""}`}
              >
                <span className="text-lg shrink-0" aria-hidden>
                  {icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${textCls}`}>
                    {d.agentName}: {summary}
                    {d.message.length > 0 && (
                      <span className={mutedCls}> — {d.message.slice(0, 40)}{d.message.length > 40 ? "…" : ""}</span>
                    )}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${mutedCls}`}>{timeAgo(d.completedAt ?? d.createdAt)}</p>
                </div>
                <span className={`shrink-0 text-gray-400 ${isExpanded ? "rotate-180" : ""} transition-transform`}>
                  ▼
                </span>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`overflow-hidden border-t ${cardBorder}`}
                  >
                    <div className={`px-4 py-3 pl-12 ${isDark ? "bg-black/20" : "bg-gray-50/80"}`}>
                      <p className={`text-xs ${mutedCls}`}>
                        {d.tasksCreated > 0 && (
                          <>✔️ {d.tasksCreated} task{d.tasksCreated !== 1 ? "s" : ""} created.</>
                        )}
                        {d.tasksCreated > 0 && d.contentCreated > 0 && " "}
                        {d.contentCreated > 0 && (
                          <>📝 {d.contentCreated} content item{d.contentCreated !== 1 ? "s" : ""} created.</>
                        )}
                      </p>
                      {d.result && (
                        <p className={`text-[11px] mt-1 ${mutedCls}`}>
                          {typeof d.result === "string" && d.result.startsWith("{")
                            ? (() => {
                                try {
                                  const o = JSON.parse(d.result);
                                  return o.summary ?? d.result;
                                } catch {
                                  return d.result;
                                }
                              })()
                            : d.result}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
