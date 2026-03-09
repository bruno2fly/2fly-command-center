"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOCK_TASKS } from "@/lib/founderData";
import { MOCK_INVOICES } from "@/lib/founderData";
import { getAtRiskMrr } from "@/lib/founderData";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/founderConfig";
import { buildClientLanes } from "@/lib/clientLanes";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  CASH_NOW: "bg-amber-100 text-amber-800",
  PREVENT_FIRE: "bg-red-100 text-red-800",
  STRATEGIC: "bg-blue-100 text-blue-800",
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDue(dueDate: string, isOverdue: boolean, isToday: boolean) {
  if (isOverdue) return "Overdue";
  if (isToday) return "Today";
  const d = new Date(dueDate);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FounderTopBar() {
  const pathname = usePathname() ?? "";
  const { isDark } = useTheme();
  const { clients, invoices } = useClients();
  const tasks = MOCK_TASKS.slice(0, 8);
  const expectedToday = MOCK_INVOICES.filter(
    (i) => i.status === "expected_today" || i.status === "due_today"
  );
  const overdue = MOCK_INVOICES.filter((i) => i.status === "overdue");
  const cashInToday = expectedToday.reduce((s, i) => s + i.amount, 0);
  const invoicesOverdue = overdue.reduce((s, i) => s + i.amount, 0);

  const lanes = buildClientLanes(clients, invoices);
  const atRiskIds = lanes.filter((l) => l.health === "yellow" || l.health === "red").map((l) => l.clientId);
  const atRiskMrr = getAtRiskMrr(atRiskIds);

  return (
    <header
      className={`px-4 py-3 flex items-stretch gap-6 shrink-0 border-b ${
        isDark ? "bg-slate-900 text-white border-slate-700" : "bg-white text-gray-900 border-gray-200 shadow-sm"
      }`}
    >
      {/* Left: Today's 5 */}
      <div className="flex-1 min-w-0">
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Today&apos;s 5
        </h2>
        <div className="flex flex-wrap gap-2">
          {tasks.map((t) => (
            <Link
              key={t.id}
              href={`/clients/${t.clientId}`}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm ${
                isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              <span className={isDark ? "font-medium text-white" : "font-medium text-gray-900"}>{t.title}</span>
              <span className={isDark ? "text-slate-400" : "text-gray-500"}>· {t.clientName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}
              >
                {PRIORITY_LABELS[t.priority]}
              </span>
              <span
                className={`text-[10px] ${
                  t.isOverdue ? "text-red-400" : t.isToday ? "text-amber-400" : isDark ? "text-slate-500" : "text-gray-400"
                }`}
              >
                {formatDue(t.dueDate, t.isOverdue, t.isToday)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Center: Today's Cash Impact */}
      <div className={`w-48 shrink-0 border-l pl-4 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Cash Impact
        </h2>
        <div className="space-y-0.5 text-sm">
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-400" : "text-gray-500"}>In today</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(cashInToday)}</span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-400" : "text-gray-500"}>Overdue</span>
            <span className={invoicesOverdue > 0 ? "text-red-400 font-medium" : isDark ? "text-slate-500" : "text-gray-400"}>
              {formatCurrency(invoicesOverdue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDark ? "text-slate-400" : "text-gray-500"}>Out today</span>
            <span className={isDark ? "text-slate-500" : "text-gray-400"}>$0</span>
          </div>
        </div>
      </div>

      {/* Right: At-Risk Revenue */}
      <div className={`w-44 shrink-0 border-l pl-4 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          At-Risk Revenue
        </h2>
        <div className="text-2xl font-bold text-amber-400">{formatCurrency(atRiskMrr)}</div>
        <div className={`text-xs ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          {atRiskIds.length} client{atRiskIds.length !== 1 ? "s" : ""} in yellow/red
        </div>
      </div>

      {/* Nav */}
      <div className={`flex items-center gap-2 shrink-0 border-l pl-4 ${isDark ? "border-slate-700" : "border-gray-200"}`}>
        <Link
          href="/"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            pathname === "/"
              ? isDark
                ? "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-900"
              : isDark
                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/founder"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            pathname === "/founder"
              ? isDark
                ? "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-900"
              : isDark
                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          Founder Mode
        </Link>
        <Link
          href="/clients"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            pathname === "/clients"
              ? isDark
                ? "bg-slate-800 text-white"
                : "bg-gray-100 text-gray-900"
              : isDark
                ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          }`}
        >
          All Clients
        </Link>
      </div>
    </header>
  );
}
