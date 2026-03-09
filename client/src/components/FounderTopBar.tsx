"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MOCK_TASKS } from "@/lib/founderData";
import { MOCK_INVOICES } from "@/lib/founderData";
import { getAtRiskMrr } from "@/lib/founderData";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/founderConfig";
import { buildClientLanes } from "@/lib/clientLanes";
import { useClients } from "@/contexts/ClientsContext";

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
    <header className="bg-slate-900 text-white px-4 py-3 flex items-stretch gap-6 shrink-0 border-b border-slate-700">
      {/* Left: Today's 5 */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Today&apos;s 5</h2>
        <div className="flex flex-wrap gap-2">
          {tasks.map((t) => (
            <Link
              key={t.id}
              href={`/clients/${t.clientId}`}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm"
            >
              <span className="font-medium">{t.title}</span>
              <span className="text-slate-400">· {t.clientName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}
              >
                {PRIORITY_LABELS[t.priority]}
              </span>
              <span
                className={`text-[10px] ${
                  t.isOverdue ? "text-red-400" : t.isToday ? "text-amber-400" : "text-slate-500"
                }`}
              >
                {formatDue(t.dueDate, t.isOverdue, t.isToday)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Center: Today's Cash Impact */}
      <div className="w-48 shrink-0 border-l border-slate-700 pl-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          Cash Impact
        </h2>
        <div className="space-y-0.5 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">In today</span>
            <span className="text-emerald-400 font-medium">{formatCurrency(cashInToday)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Overdue</span>
            <span className={invoicesOverdue > 0 ? "text-red-400 font-medium" : "text-slate-500"}>
              {formatCurrency(invoicesOverdue)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Out today</span>
            <span className="text-slate-500">$0</span>
          </div>
        </div>
      </div>

      {/* Right: At-Risk Revenue */}
      <div className="w-44 shrink-0 border-l border-slate-700 pl-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
          At-Risk Revenue
        </h2>
        <div className="text-2xl font-bold text-amber-400">{formatCurrency(atRiskMrr)}</div>
        <div className="text-xs text-slate-400">
          {atRiskIds.length} client{atRiskIds.length !== 1 ? "s" : ""} in yellow/red
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center gap-2 shrink-0 border-l border-slate-700 pl-4">
        <Link
          href="/"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            pathname === "/" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/founder"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            pathname === "/founder" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          Founder Mode
        </Link>
        <Link
          href="/clients"
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            pathname === "/clients" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
          }`}
        >
          All Clients
        </Link>
      </div>
    </header>
  );
}
