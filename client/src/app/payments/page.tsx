"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { MOCK_INVOICES, MOCK_PAID_INVOICES, type Invoice } from "@/lib/founderData";
import { toast } from "sonner";

function daysOverdue(dueDate: string): number {
  const d = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInvoiceNumber(inv: Invoice): string {
  return `INV-${String(inv.id).replace(/^i/, "").padStart(3, "0")}`;
}

export default function PaymentsPage() {
  const { isDark } = useTheme();

  const overdue = MOCK_INVOICES.filter((i) => i.status === "overdue");
  const dueSoon = MOCK_INVOICES.filter(
    (i) =>
      (i.status === "due_today" || i.status === "expected_today" || i.status === "upcoming") &&
      new Date(i.dueDate) <= new Date(Date.now() + 7 * 86400000)
  );
  const recentlyPaid = MOCK_PAID_INVOICES;

  const totalOutstanding = overdue.reduce((s, i) => s + i.amount, 0) + dueSoon.reduce((s, i) => s + i.amount, 0);
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0);
  const totalDueSoon = dueSoon.reduce((s, i) => s + i.amount, 0);

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  const handleChase = (inv: Invoice) => {
    toast.success(`Task created for ${inv.clientName}`);
    // Could navigate to client or open WhatsApp
  };

  const handleSendReminder = (inv: Invoice) => {
    toast.success(`Reminder sent to ${inv.clientName}`);
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
            💰 Payments
          </h1>
          <div className={`mt-4 p-4 rounded-xl border ${baseCls}`}>
            <div className="flex flex-wrap gap-6">
              <div>
                <p className={`text-xs uppercase tracking-wider ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                  Total Outstanding
                </p>
                <p className={`text-xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
                  ${totalOutstanding.toLocaleString()}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                  Overdue
                </p>
                <p className={`text-xl font-bold text-red-500`}>
                  ${totalOverdue.toLocaleString()}
                </p>
              </div>
              <div>
                <p className={`text-xs uppercase tracking-wider ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                  Due Soon
                </p>
                <p className={`text-xl font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                  ${totalDueSoon.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Overdue */}
        <section className={`rounded-xl border overflow-hidden ${baseCls}`}>
          <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-red-400" : "text-red-600"}`}>
              🔴 Overdue
            </h2>
          </div>
          <div className="divide-y divide-[#1a1810]">
            {overdue.length === 0 ? (
              <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No overdue invoices</p>
            ) : (
              overdue.map((inv) => (
                <div
                  key={inv.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"}`}
                >
                  <div>
                    <p className={`font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                      🔴 {inv.clientName} · {getInvoiceNumber(inv)} · ${inv.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                      {daysOverdue(inv.dueDate)} days overdue
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleChase(inv)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-100 text-red-700 hover:bg-red-200"
                      }`}
                    >
                      Chase
                    </button>
                    <Link
                      href={`/clients/${inv.clientId}`}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                        isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      Go
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Due This Week */}
        <section className={`rounded-xl border overflow-hidden ${baseCls}`}>
          <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-amber-400" : "text-amber-600"}`}>
              🟡 Due This Week
            </h2>
          </div>
          <div className="divide-y divide-[#1a1810]">
            {dueSoon.length === 0 ? (
              <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Nothing due this week</p>
            ) : (
              dueSoon.map((inv) => (
                <div
                  key={inv.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"}`}
                >
                  <div>
                    <p className={`font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                      🟡 {inv.clientName} · {getInvoiceNumber(inv)} · ${inv.amount.toLocaleString()}
                    </p>
                    <p className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                      due {formatDate(inv.dueDate)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSendReminder(inv)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                    }`}
                  >
                    Send reminder
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recently Paid */}
        <section className={`rounded-xl border overflow-hidden ${baseCls}`}>
          <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
              ✅ Recently Paid
            </h2>
          </div>
          <div className="divide-y divide-[#1a1810]">
            {recentlyPaid.length === 0 ? (
              <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                No recent payments (mock data has overdue/due only)
              </p>
            ) : (
              recentlyPaid.map((inv) => (
                <div
                  key={inv.id}
                  className={`flex items-center justify-between gap-4 px-4 py-3 ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"}`}
                >
                  <p className={`font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                    ✅ {inv.clientName} · {getInvoiceNumber(inv)} · ${inv.amount.toLocaleString()} · paid
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
