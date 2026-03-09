"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { MOCK_INVOICES } from "@/lib/founderData";
import { getGlobalAlerts, getGlobalApprovals } from "@/lib/client/mockClientControlData";

type CriticalItem = {
  id: string;
  type: "invoice" | "alert" | "approval";
  title: string;
  clientName: string;
  clientId: string;
  amount?: number;
  actionLabel: string;
};

function getTopCriticalItem(): CriticalItem | null {
  const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === "overdue");
  if (overdueInvoices.length > 0) {
    const inv = overdueInvoices[0]!;
    return {
      id: `inv-${inv.id}`,
      type: "invoice",
      title: "Chase invoice",
      clientName: inv.clientName,
      clientId: inv.clientId,
      amount: inv.amount,
      actionLabel: "Do it",
    };
  }

  const alerts = getGlobalAlerts();
  if (alerts.length > 0) {
    const a = alerts[0]!;
    return {
      id: a.id,
      type: "alert",
      title: a.title,
      clientName: a.clientName,
      clientId: a.clientId,
      actionLabel: "Do it",
    };
  }

  const approvals = getGlobalApprovals();
  if (approvals.length > 0) {
    const a = approvals[0]!;
    return {
      id: `approval-${a.id}`,
      type: "approval",
      title: "Approve",
      clientName: a.clientName,
      clientId: a.clientId,
      actionLabel: "Do it",
    };
  }

  return null;
}

export function CriticalAlertChip() {
  const { isDark } = useTheme();
  const item = getTopCriticalItem();

  if (!item) return null;

  const label =
    item.type === "invoice"
      ? `Chase invoice · ${item.clientName} · $${item.amount?.toLocaleString()} overdue`
      : `${item.title} · ${item.clientName}`;

  return (
    <Link
      href={`/clients/${item.clientId}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
        isDark
          ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
          : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
      }`}
    >
      <span className="text-red-500">🔴</span>
      <span className="truncate max-w-[200px]">{label}</span>
      <span
        className={`shrink-0 px-2 py-0.5 rounded text-xs font-semibold ${
          isDark ? "bg-red-500/20 text-red-300" : "bg-red-100 text-red-700"
        }`}
      >
        {item.actionLabel}
      </span>
    </Link>
  );
}
