"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";

const CACHE_KEY_PREFIX = "daily-summary-";
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const COLLAPSE_KEY_PREFIX = "daily-summary-collapsed-";

type ClientMain = Awaited<ReturnType<typeof api.getClientMain>>;
type Bullet = { key: string; text: string; urgent?: boolean; critical?: boolean };

function buildBullets(client: ClientMain | null, clientName: string): Bullet[] {
  if (!client) return [];

  const bullets: Bullet[] = [];
  const c = client as ClientMain & {
    tasks?: Array<{ status: string; dueDate?: string; title?: string }>;
    contentItems?: Array<{ status: string; scheduledDate?: string }>;
    invoices?: Array<{ status: string; dueDate: string; amount: number; invoiceNumber?: string }>;
    adReports?: Array<{ spend?: number; conversions?: number }>;
    health?: { status?: string; summary?: string };
    pendingAgentActionsCount?: number;
    requests?: Array<{ status: string; slaBreach?: boolean }>;
  };

  const pendingActions = c.pendingAgentActionsCount ?? 0;
  if (pendingActions > 0) {
    bullets.push({
      key: "agent",
      text: `🤖 ${pendingActions} agent proposal${pendingActions !== 1 ? "s" : ""} awaiting your review`,
      urgent: true,
    });
  }

  const contentItems = c.contentItems ?? [];
  const now = new Date();
  const scheduled = contentItems.filter((x) => x.status === "scheduled" || x.status === "approved");
  const withDate = scheduled
    .map((x) => (x.scheduledDate ? new Date(x.scheduledDate) : null))
    .filter((d): d is Date => d != null && d >= now)
    .sort((a, b) => a.getTime() - b.getTime());
  const nextScheduled = withDate[0];
  const thisWeek = withDate.filter((d) => {
    const end = new Date(now); end.setDate(end.getDate() + 7);
    return d <= end;
  });
  if (scheduled.length > 0) {
    const nextStr = nextScheduled
      ? nextScheduled.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : "—";
    bullets.push({
      key: "content",
      text: `📅 ${thisWeek.length} post${thisWeek.length !== 1 ? "s" : ""} scheduled this week (next: ${nextStr})`,
    });
  }

  const tasks = c.tasks ?? [];
  const openTasks = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const overdueTasks = openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  if (overdueTasks.length > 0) {
    const first = overdueTasks[0];
    bullets.push({
      key: "overdue",
      text: `⚠️ ${overdueTasks.length} task${overdueTasks.length !== 1 ? "s" : ""} overdue${first?.title ? `: "${first.title.slice(0, 40)}${first.title.length > 40 ? "…" : ""}"` : ""}`,
      critical: true,
    });
  }

  const invoices = c.invoices ?? [];
  const overdueInvoices = invoices.filter(
    (i) => i.status === "overdue" || (new Date(i.dueDate) < now && i.status !== "paid" && i.status !== "void")
  );
  if (overdueInvoices.length > 0) {
    const inv = overdueInvoices[0];
    const days = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
    const num = (inv as { invoiceNumber?: string }).invoiceNumber ?? "Invoice";
    bullets.push({
      key: "invoice",
      text: `💰 ${num} overdue ${days} day${days !== 1 ? "s" : ""} ($${inv.amount.toLocaleString()})`,
      critical: true,
    });
  }

  const reports = c.adReports ?? [];
  const latest = reports[0];
  if (latest && (latest.spend ?? 0) > 0 && (latest.conversions ?? 0) === 0) {
    bullets.push({
      key: "ads",
      text: `📈 Meta Ads: $${(latest.spend ?? 0).toFixed(2)} spent, 0 leads — needs attention`,
      urgent: true,
    });
  }

  const requests = c.requests ?? [];
  const breached = requests.filter((r) => (r as { slaBreach?: boolean }).slaBreach);
  if (breached.length > 0) {
    bullets.push({
      key: "sla",
      text: `🚨 ${breached.length} request${breached.length !== 1 ? "s" : ""} breached SLA`,
      critical: true,
    });
  }

  const health = c.health as { status?: string; summary?: string } | undefined;
  if (health && (health.status === "yellow" || health.status === "red")) {
    bullets.push({
      key: "health",
      text: `🏥 Health: ${health.status} — ${health.summary ?? "needs attention"}`,
      urgent: health.status === "red",
      critical: health.status === "red",
    });
  }

  // Sort: critical first, then urgent, then rest; keep max 5
  bullets.sort((a, b) => {
    if (a.critical && !b.critical) return -1;
    if (!a.critical && b.critical) return 1;
    if (a.urgent && !b.urgent) return -1;
    if (!a.urgent && b.urgent) return 1;
    return 0;
  });
  return bullets.slice(0, 5);
}

function getBorderClass(bullets: Bullet[], isDark: boolean): string {
  const hasCritical = bullets.some((b) => b.critical);
  const hasUrgent = bullets.some((b) => b.urgent);
  if (hasCritical) return "border-l-4 border-l-red-500";
  if (hasUrgent || bullets.length > 0) return "border-l-4 border-l-amber-500";
  return "border-l-4 border-l-emerald-500";
}

type Props = {
  clientId: string;
  clientName?: string;
};

export function DailyClientSummary({ clientId, clientName }: Props) {
  const { isDark } = useTheme();
  const [client, setClient] = useState<ClientMain | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const storageKey = `${CACHE_KEY_PREFIX}${clientId}`;
  const collapseKey = `${COLLAPSE_KEY_PREFIX}${clientId}`;

  const fetchSummary = useCallback(() => {
    if (!clientId) return;
    const cached = typeof window !== "undefined" ? sessionStorage.getItem(storageKey) : null;
    if (cached) {
      try {
        const { data, at } = JSON.parse(cached) as { data: ClientMain; at: number };
        if (Date.now() - at < CACHE_TTL_MS) {
          setClient(data);
          setCachedAt(at);
          setLoading(false);
          return;
        }
      } catch {
        // ignore
      }
    }
    setLoading(true);
    api
      .getClientMain(clientId)
      .then((data) => {
        setClient(data);
        const at = Date.now();
        setCachedAt(at);
        try {
          sessionStorage.setItem(storageKey, JSON.stringify({ data, at }));
        } catch {
          // ignore
        }
      })
      .catch(() => setClient(null))
      .finally(() => setLoading(false));
  }, [clientId, storageKey]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(collapseKey);
    setCollapsed(raw === "true");
  }, [collapseKey]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(collapseKey, String(next));
    } catch {
      // ignore
    }
  };

  const displayName = clientName ?? (client as { name?: string } | null)?.name ?? "Client";
  const bullets = buildBullets(client, displayName);
  const allClear = bullets.length === 0 && !loading;
  const borderClass = getBorderClass(bullets, isDark);
  const cardBg = isDark ? "bg-[rgba(30,41,59,0.6)] border-gray-700/50" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  if (loading && !client) {
    return (
      <div className={`rounded-xl border ${cardBg} p-4 ${borderClass}`}>
        <p className={`text-sm ${mutedCls}`}>Loading summary…</p>
      </div>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`rounded-xl border ${cardBg} ${borderClass} overflow-hidden`}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        className="w-full flex items-center justify-between gap-2 p-4 text-left hover:opacity-90 transition-opacity"
        aria-expanded={!collapsed}
      >
        <span className={`text-sm font-semibold ${textCls}`}>
          📋 Today's Summary — {displayName}
        </span>
        <span className={`text-xs ${mutedCls}`}>
          {dateStr}
          {cachedAt != null && (
            <span className="ml-1">· {new Date(cachedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
          )}
        </span>
        <span className="text-gray-400" aria-hidden>
          {collapsed ? "▶" : "▼"}
        </span>
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 space-y-1.5">
              {allClear ? (
                <p className={`text-sm ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>
                  ✅ All clear — no urgent items today
                </p>
              ) : (
                bullets.map((b) => (
                  <p
                    key={b.key}
                    className={`text-sm ${
                      b.critical
                        ? "text-red-400 dark:text-red-400"
                        : b.urgent
                          ? "text-amber-600 dark:text-amber-400"
                          : mutedCls
                    }`}
                  >
                    • {b.text}
                  </p>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
