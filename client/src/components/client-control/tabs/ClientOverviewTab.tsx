"use client";

import { useMemo, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getClientHealth,
  getBriefOfTheDay,
  getContentQualityOverview,
  get2FlyFlowOverview,
  getInsights,
  getIdeas,
} from "@/lib/client/mockClientControlData";
import { getKpis, getTasks } from "@/lib/client/mockClientTabData";
import { getRequests } from "@/lib/client/mockClientTabData";
import type { TaskItem } from "@/lib/client/mockClientTabData";
import type { RequestItem } from "@/lib/client/mockClientTabData";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseBrief(text: string): { summary: string; items: Array<{ text: string; priority: "red" | "yellow" | "green" }> } {
  const redKeywords = ["overdue", "urgent", "bug", "not working", "blocker"];
  const yellowKeywords = ["pending", "in progress", "follow up", "requested", "investigating"];
  const match = text.match(/^([^.(]+\.)/);
  const summary = match ? match[1].trim() : text.split(".")[0] ?? text;
  const items: Array<{ text: string; priority: "red" | "yellow" | "green" }> = [];
  const itemRegex = /\((\d+)\)\s*([^.(]+(?:\.|$))/g;
  let m;
  while ((m = itemRegex.exec(text)) !== null) {
    const itemText = m[2].trim().replace(/\.$/, "");
    const lower = itemText.toLowerCase();
    let priority: "red" | "yellow" | "green" = "green";
    if (redKeywords.some((k) => lower.includes(k))) priority = "red";
    else if (yellowKeywords.some((k) => lower.includes(k))) priority = "yellow";
    items.push({ text: itemText, priority });
  }
  return { summary, items };
}

type UnifiedTask = {
  id: string;
  title: string;
  source: "task" | "request";
  sourceLabel?: string;
  priority: "high" | "medium" | "low";
  status: string;
  assignee?: string;
  dueAt: string | null;
  sortOrder: number;
};

function buildUnifiedTasks(tasks: TaskItem[], requests: RequestItem[]): UnifiedTask[] {
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const taskStatusOrder: Record<string, number> = {
    in_progress: 0,
    todo: 1,
    review: 2,
    backlog: 3,
    done: 4,
  };
  const requestStageOrder: Record<string, number> = {
    in_progress: 0,
    in_review: 1,
    new: 2,
    done: 3,
  };

  const fromTasks: UnifiedTask[] = tasks.map((t) => ({
    id: `task-${t.id}`,
    title: t.title,
    source: "task" as const,
    priority: t.priority,
    status: t.status,
    assignee: t.assignee,
    dueAt: t.dueAt,
    sortOrder: priorityOrder[t.priority] * 10 + (taskStatusOrder[t.status] ?? 5),
  }));

  const fromRequests: UnifiedTask[] = requests.map((r) => {
    const priority: "high" | "medium" | "low" = r.dueAt ? "high" : "medium";
    return {
      id: `req-${r.id}`,
      title: r.title,
      source: "request" as const,
      sourceLabel: r.source,
      priority,
      status: r.stage,
      dueAt: r.dueAt,
      sortOrder: (requestStageOrder[r.stage] ?? 5) + 50,
    };
  });

  return [...fromTasks, ...fromRequests].sort((a, b) => a.sortOrder - b.sortOrder);
}

const ACTIVITY_MOCK = [
  { id: "a1", text: "M. Tanaka linked creative to Slack", time: "1m ago" },
  { id: "a2", text: "Ad copy approved by client", time: "12m ago" },
  { id: "a3", text: "Invoice reminder sent", time: "1h ago" },
  { id: "a4", text: "Hero image draft uploaded", time: "2h ago" },
  { id: "a5", text: "Spring campaign brief updated", time: "3h ago" },
  { id: "a6", text: "UGC testimonial in review", time: "5h ago" },
  { id: "a7", text: "Contact form fix deployed", time: "6h ago" },
  { id: "a8", text: "Weekly sync completed", time: "1d ago" },
];

const QUICK_ACTIONS = [
  { id: "q1", label: "WhatsApp templates", icon: "💬", color: "text-emerald-400" },
  { id: "q2", label: "Specific Google Drive Folder", icon: "📁", color: "text-amber-400" },
  { id: "q3", label: "Ad Platform Login", icon: "🔗", color: "text-blue-400" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" },
  }),
};

const dotColor = (p: string) =>
  p === "green" ? "bg-emerald-500" : p === "red" ? "bg-red-500" : "bg-amber-500";

function ATCSectionCard({
  title,
  subtitle,
  badge,
  badgeColor = "emerald",
  children,
  custom,
  isDark,
}: {
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: "emerald" | "amber" | "blue";
  children: ReactNode;
  custom: number;
  isDark: boolean;
}) {
  const badgeCls =
    badgeColor === "emerald"
      ? isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200"
      : badgeColor === "amber"
        ? isDark ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-amber-50 text-amber-700 border-amber-200"
        : isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-50 text-blue-700 border-blue-200";
  const borderCls =
    badgeColor === "emerald"
      ? isDark ? "border-emerald-500/30" : "border-emerald-200"
      : badgeColor === "amber"
        ? isDark ? "border-amber-500/30" : "border-amber-200"
        : isDark ? "border-blue-500/30" : "border-blue-200";
  const titleCls =
    badgeColor === "emerald"
      ? isDark ? "text-emerald-400/90" : "text-emerald-700"
      : badgeColor === "amber"
        ? isDark ? "text-amber-400/90" : "text-amber-700"
        : isDark ? "text-blue-400/90" : "text-blue-700";
  const dotCls =
    badgeColor === "emerald"
      ? "bg-emerald-500"
      : badgeColor === "amber"
        ? "bg-amber-500"
        : "bg-blue-500";

  const cardBg = isDark ? "bg-zinc-900/90" : "bg-white";
  const subtitleCls = isDark ? "text-zinc-500" : "text-gray-500";

  return (
    <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={custom}>
      <div className={`relative rounded-xl border-2 ${borderCls} ${cardBg} overflow-hidden`}>
        {isDark && (
          <>
            <div
              className="absolute inset-0 opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(16, 185, 129, 0.3) 2px, rgba(16, 185, 129, 0.3) 4px)`,
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.04] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.2) 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
          </>
        )}
        <div className="relative p-6 min-h-[120px]">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${dotCls} animate-pulse`} />
              <h2 className={`text-sm font-mono font-semibold uppercase tracking-widest ${titleCls}`}>
                {title}
              </h2>
              {subtitle && (
                <span className={`text-[10px] font-mono ${subtitleCls}`}>{subtitle}</span>
              )}
            </div>
            {badge && (
              <span className={`px-2 py-1 rounded text-[10px] font-mono border ${badgeCls}`}>
                {badge}
              </span>
            )}
          </div>
          {children}
        </div>
      </div>
    </motion.div>
  );
}

type Props = {
  clientId: string;
};

export function ClientOverviewTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const brief = getBriefOfTheDay(clientId);
  const contentQuality = getContentQualityOverview(clientId);
  const flyflow = get2FlyFlowOverview(clientId);
  const health = getClientHealth(clientId);
  const kpis = getKpis(clientId);
  const insights = getInsights(clientId);
  const ideas = getIdeas(clientId);
  const tasks = getTasks(clientId);
  const requests = getRequests(clientId);

  const parsedBrief = useMemo(() => (brief?.text ? parseBrief(brief.text) : null), [brief?.text]);

  const headerCls = isDark ? "text-[10px] uppercase tracking-widest font-semibold text-zinc-500" : "text-[10px] uppercase tracking-widest font-semibold text-gray-500";
  const cardCls = isDark ? "rounded-xl border border-zinc-700/50 bg-zinc-900 p-4" : "rounded-xl border border-gray-200 bg-white p-4";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-zinc-300" : "text-gray-600";
  const textSub = isDark ? "text-zinc-500" : "text-gray-500";
  const ideaCardCls = isDark ? "p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30 hover:border-zinc-600/50 transition-colors" : "p-2.5 rounded-lg bg-gray-50 border border-gray-200 hover:border-gray-300 transition-colors";
  const ideaTextCls = isDark ? "text-xs text-zinc-300 line-clamp-2" : "text-xs text-gray-700 line-clamp-2";
  const ideaTagCls = isDark ? "inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] bg-zinc-700 text-zinc-400 capitalize" : "inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] bg-gray-200 text-gray-600 capitalize";
  const taskLowCls = isDark ? "bg-zinc-800/30 border-zinc-700/50 hover:bg-zinc-800/50" : "bg-gray-50 border-gray-200 hover:bg-gray-100";
  const taskBtnCls = isDark ? "px-2 py-1 rounded text-[10px] border border-zinc-600 text-zinc-400 hover:bg-zinc-700" : "px-2 py-1 rounded text-[10px] border border-gray-300 text-gray-600 hover:bg-gray-100";
  const taskLowBadgeCls = isDark ? "bg-zinc-600 text-zinc-400" : "bg-gray-200 text-gray-600";
  const quickActionCls = isDark ? "w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-800 text-left text-sm text-zinc-300 transition-colors" : "w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-left text-sm text-gray-700 transition-colors";
  const velocityBarCls = isDark ? "h-2 rounded-full bg-zinc-800 overflow-hidden" : "h-2 rounded-full bg-gray-200 overflow-hidden";
  const contentBriefParsed = useMemo(() => {
    if (!contentQuality?.text) return null;
    const parts = contentQuality.text.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
    const summary = parts[0] ? (parts[0].endsWith(".") ? parts[0] : parts[0] + ".") : null;
    const items = parts.slice(1, 6).map((s) => (s.endsWith(".") ? s : s + "."));
    return { summary, items };
  }, [contentQuality?.text]);
  const unifiedTasks = useMemo(() => buildUnifiedTasks(tasks, requests), [tasks, requests]);

  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const taskVelocityPct = tasks.length > 0 ? Math.round((doneTasks / tasks.length) * 100) : 0;

  const activityEntries = insights.length > 0
    ? insights.slice(0, 8).map((s) => ({ id: s.id, text: s.text, time: formatTime(s.createdAt) }))
    : ACTIVITY_MOCK;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${isDark ? "bg-zinc-950" : "bg-gray-50"}`}>
      {/* Three ATC-style sections side by side */}
      <div className="flex-shrink-0 mx-3 mt-3 mb-2 grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto">
        {/* Brief of the Day */}
        <ATCSectionCard
          title="Brief of the Day"
          subtitle={`AI Agent · ${brief ? formatTime(brief.updatedAt) : "—"}`}
          badge={`Buffer ${health?.deliveryBufferDays ?? 0}d`}
          badgeColor="emerald"
          custom={0}
          isDark={isDark}
        >
          {parsedBrief ? (
            <div className="space-y-3">
              <p className={`text-base font-semibold leading-snug ${textPrimary}`}>
                {parsedBrief.summary}
              </p>
              <ul className="space-y-1.5">
                {parsedBrief.items.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-mono">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor(item.priority)}`} />
                    <span className={textMuted}>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className={`text-sm ${textSub}`}>No brief yet for today.</p>
          )}
        </ATCSectionCard>

        {/* Content Brief */}
        <ATCSectionCard
          title="Content Brief"
          subtitle={contentQuality ? `AI Agent · ${formatTime(contentQuality.updatedAt)}` : undefined}
          badge={contentBriefParsed?.items.length ? `${contentBriefParsed.items.length} items` : undefined}
          badgeColor="amber"
          custom={1}
          isDark={isDark}
        >
          {contentBriefParsed ? (
            <div className="space-y-3">
              {contentBriefParsed.summary && (
                <p className={`text-base font-semibold leading-snug ${textPrimary}`}>
                  {contentBriefParsed.summary}
                </p>
              )}
              {contentBriefParsed.items.length > 0 ? (
                <ul className="space-y-1.5">
                  {contentBriefParsed.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-mono">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
                      <span className={textMuted}>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : (
            <p className={`text-sm ${textSub}`}>No content brief yet.</p>
          )}
        </ATCSectionCard>

        {/* 2FlyFlow Notifications */}
        <ATCSectionCard
          title="2FlyFlow Notifications"
          badge={flyflow.pendingApproval > 0 ? `${flyflow.pendingApproval} awaiting` : `${flyflow.pendingPosts} total`}
          badgeColor="blue"
          custom={2}
          isDark={isDark}
        >
          {flyflow.items.length > 0 ? (
            <ul className="space-y-1.5">
              {flyflow.items.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-4 text-sm font-mono">
                  <span className={`${textMuted} truncate`}>{i.title}</span>
                  <span
                    className={`shrink-0 px-2 py-0.5 rounded text-[10px] ${
                      i.stage === "Awaiting approval"
                        ? "bg-amber-500/20 text-amber-400"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {i.stage}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${textSub}`}>No 2FlyFlow notifications for this client.</p>
          )}
        </ATCSectionCard>
      </div>

      {/* Main 3-column grid */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[220px_1fr_260px] gap-3 p-3 overflow-hidden">
        {/* Left — New Ideas */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={3}
            className={cardCls}
          >
            <h3 className={headerCls}>New Ideas</h3>
            <p className={`text-[10px] mt-0.5 mb-3 ${textSub}`}>
              Brainstorm & opportunities
            </p>
            <ul className="space-y-2">
              {ideas.length > 0 ? (
                ideas.map((idea) => (
                  <li key={idea.id} className={ideaCardCls}>
                    <p className={ideaTextCls}>{idea.text}</p>
                    <span className={ideaTagCls}>
                      {idea.tag}
                    </span>
                  </li>
                ))
              ) : (
                <li className={`text-xs py-4 ${textSub}`}>No ideas yet</li>
              )}
            </ul>
          </motion.div>

          {/* Compact Health + KPIs */}
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={4}
            className={`${cardCls} mt-auto`}
          >
            <h3 className={headerCls}>At a glance</h3>
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className={textSub}>MQLs</span>
                <span className="text-emerald-400 font-medium">{kpis.find((k) => k.name === "MQLs")?.value ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className={textSub}>ROAS</span>
                <span className="text-amber-400 font-medium">{kpis.find((k) => k.name === "ROAS")?.value ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className={textSub}>Website</span>
                <span className={health?.websiteStatus === "up" ? "text-emerald-400" : "text-red-400"}>
                  {health?.websiteStatus === "up" ? "Up" : "Down"}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Center — Tasks (urgent to not urgent) */}
        <div className="flex flex-col gap-3 overflow-y-auto min-w-0">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={5}
            className="flex items-center justify-between"
          >
            <h3 className={headerCls}>Tasks</h3>
            <span className={`text-xs ${textSub}`}>{unifiedTasks.length} total</span>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={6}
            className={`${cardCls} flex-1 min-h-0 overflow-y-auto`}
          >
            <ul className="space-y-2">
              {unifiedTasks.map((t, i) => (
                <li
                  key={t.id}
                  className={`flex items-center justify-between gap-4 p-3 rounded-lg border transition-colors ${
                    t.priority === "high"
                      ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10"
                      : t.priority === "medium"
                        ? "bg-amber-500/5 border-amber-500/20 hover:bg-amber-500/10"
                        : taskLowCls
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        t.priority === "high" ? "bg-red-500" : t.priority === "medium" ? "bg-amber-500" : "bg-zinc-500"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${textPrimary}`}>{t.title}</p>
                      <p className={`text-[10px] mt-0.5 ${textSub}`}>
                        {t.source === "task" ? t.assignee : t.sourceLabel ?? "Request"} · Due {formatDate(t.dueAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-medium capitalize ${
                        t.priority === "high"
                          ? "bg-red-500/20 text-red-400"
                          : t.priority === "medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : taskLowBadgeCls
                      }`}
                    >
                      {t.priority}
                    </span>
                    <button className={taskBtnCls}>
                      Do it
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {unifiedTasks.length === 0 && (
              <p className={`text-sm py-8 text-center ${textSub}`}>No tasks for this client.</p>
            )}
          </motion.div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-3 overflow-y-auto">
          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={7}
            className={`${cardCls} flex-shrink-0`}
          >
            <h3 className={headerCls}>Activity Log</h3>
            <ul className="mt-3 space-y-2">
              {activityEntries.map((a) => (
                <li key={a.id} className="flex items-start gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <span className={`${textMuted} flex-1 truncate`}>
                    {a.text} · {a.time}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            custom={8}
            className={`${cardCls} flex-shrink-0`}
          >
            <h3 className={headerCls}>Quick Actions</h3>
            <p className={`text-[10px] mt-0.5 mb-3 ${textSub}`}>
              One-click access to WhatsApp templates.
            </p>
            <ul className="space-y-1">
              {QUICK_ACTIONS.map((q) => (
                <li key={q.id}>
                  <button className={quickActionCls}>
                    <span className={q.color}>{q.icon}</span>
                    {q.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>

      {/* Task Velocity bar */}
      <motion.div
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        custom={9}
        className="flex-shrink-0 px-3 pb-3"
      >
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-1">
            <span className={headerCls}>Task Velocity</span>
            <span className={`text-xs ${textSub}`}>{taskVelocityPct}%</span>
          </div>
          <div className={velocityBarCls}>
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${taskVelocityPct}%` }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
