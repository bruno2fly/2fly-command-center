"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { MOCK_INVOICES, MOCK_PAID_INVOICES, type Invoice } from "@/lib/founderData";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { CreateInvoiceModal } from "@/components/payments/CreateInvoiceModal";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type PaymentInvoice = {
  id: string;
  clientId: string;
  clientName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  paidDate?: string | null;
  status: string;
  daysOverdue?: number;
};

function daysOverdue(dueDate: string): number {
  const d = new Date(dueDate);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInvoiceNumber(inv: Invoice | PaymentInvoice): string {
  return "invoiceNumber" in inv && inv.invoiceNumber ? inv.invoiceNumber : `INV-${String(inv.id).replace(/^i/, "").padStart(3, "0")}`;
}

export default function PaymentsPage() {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [autoGenLoading, setAutoGenLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [overdue, setOverdue] = useState<PaymentInvoice[]>([]);
  const [dueSoon, setDueSoon] = useState<PaymentInvoice[]>([]);
  const [recentlyPaid, setRecentlyPaid] = useState<PaymentInvoice[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);
  const [totalDueSoon, setTotalDueSoon] = useState(0);
  const [totalMRR, setTotalMRR] = useState(0);

  const fetchPayments = useCallback(async () => {
    try {
      const [invoicesRes, revenueRes] = await Promise.all([
        fetch(`${API}/api/agent-tools/invoices`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/api/agent-tools/revenue`).then((r) => (r.ok ? r.json() : null)),
      ]);

      const invoices = invoicesRes?.invoices || [];
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const overdueList: PaymentInvoice[] = [];
      const dueSoonList: PaymentInvoice[] = [];
      const paidList: PaymentInvoice[] = [];

      for (const inv of invoices) {
        const due = new Date(inv.dueDate);
        const isOverdue = inv.status === "overdue" || (inv.status === "sent" && due < today);
        const isDueSoon = inv.status === "sent" && due >= today && due <= weekEnd;
        const isPaid = inv.status === "paid";

        const item: PaymentInvoice = {
          id: inv.id,
          clientId: inv.clientId,
          clientName: inv.client?.name || "Unknown",
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          dueDate: inv.dueDate,
          paidDate: inv.paidDate,
          status: inv.status,
          daysOverdue: isOverdue ? daysOverdue(inv.dueDate) : undefined,
        };

        if (isOverdue) overdueList.push(item);
        else if (isDueSoon) dueSoonList.push(item);
        else if (isPaid) paidList.push(item);
      }

      paidList.sort((a, b) => (new Date(b.paidDate || 0).getTime() - new Date(a.paidDate || 0).getTime()));
      const recentPaid = paidList.slice(0, 10);

      const totOverdue = overdueList.reduce((s, i) => s + i.amount, 0);
      const totDueSoon = dueSoonList.reduce((s, i) => s + i.amount, 0);

      setOverdue(overdueList);
      setDueSoon(dueSoonList);
      setRecentlyPaid(recentPaid);
      setTotalOverdue(totOverdue);
      setTotalDueSoon(totDueSoon);
      setTotalOutstanding(totOverdue + totDueSoon);
      setTotalMRR(revenueRes?.totalMRR ?? 0);
    } catch {
      const mockOverdue = MOCK_INVOICES.filter((i) => i.status === "overdue").map((i) => ({
        id: i.id,
        clientId: i.clientId,
        clientName: i.clientName,
        invoiceNumber: i.invoiceNumber || `INV-${i.id}`,
        amount: i.amount,
        dueDate: i.dueDate,
        status: i.status,
        daysOverdue: daysOverdue(i.dueDate),
      }));
      const mockDueSoon = MOCK_INVOICES.filter(
        (i) =>
          (i.status === "due_today" || i.status === "expected_today" || i.status === "upcoming") &&
          new Date(i.dueDate) <= new Date(Date.now() + 7 * 86400000)
      ).map((i) => ({
        id: i.id,
        clientId: i.clientId,
        clientName: i.clientName,
        invoiceNumber: i.invoiceNumber || `INV-${i.id}`,
        amount: i.amount,
        dueDate: i.dueDate,
        status: i.status,
      }));
      const mockPaid = MOCK_PAID_INVOICES.map((i) => ({
        id: i.id,
        clientId: i.clientId,
        clientName: i.clientName,
        invoiceNumber: i.invoiceNumber || `INV-${i.id}`,
        amount: i.amount,
        dueDate: i.dueDate,
        paidDate: i.dueDate,
        status: "paid",
      }));

      setOverdue(mockOverdue);
      setDueSoon(mockDueSoon);
      setRecentlyPaid(mockPaid);
      setTotalOverdue(mockOverdue.reduce((s, i) => s + i.amount, 0));
      setTotalDueSoon(mockDueSoon.reduce((s, i) => s + i.amount, 0));
      setTotalOutstanding(
        mockOverdue.reduce((s, i) => s + i.amount, 0) + mockDueSoon.reduce((s, i) => s + i.amount, 0)
      );
      setTotalMRR(9300);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleChase = async (inv: PaymentInvoice) => {
    setActionLoading(`chase-${inv.id}`);
    try {
      await api.postRequest({
        clientId: inv.clientId,
        title: `Chase payment — ${inv.invoiceNumber}`,
        type: "other",
        priority: "urgent",
      });
      toast.success(`Task created for ${inv.clientName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPdf = (inv: PaymentInvoice) => {
    window.open(`${API}/api/agent-tools/invoices/${inv.id}/pdf`, "_blank");
  };

  const handleSendEmail = async (inv: PaymentInvoice) => {
    setActionLoading(`email-${inv.id}`);
    try {
      await api.postInvoiceSendEmail(inv.id, false);
      toast.success(`Invoice sent to ${inv.clientName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (inv: PaymentInvoice) => {
    setActionLoading(`paid-${inv.id}`);
    try {
      await api.patchInvoice(inv.id, { status: "paid" });
      toast.success(`${inv.invoiceNumber} marked as paid`);
      fetchPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async (inv: PaymentInvoice) => {
    setActionLoading(`reminder-${inv.id}`);
    try {
      await api.postInvoiceSendEmail(inv.id, true);
      toast.success(`Reminder sent to ${inv.clientName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reminder");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoGenerate = async () => {
    setAutoGenLoading(true);
    try {
      const res = await api.postInvoiceAutoGenerate();
      toast.success(`Generated ${res.generated} invoices`);
      fetchPayments();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setAutoGenLoading(false);
    }
  };

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const btnDisabled = (id: string) => actionLoading === id;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className={`text-2xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
            💰 Payments
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => setCreateModalOpen(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-blue-600 text-white hover:bg-blue-500"
              }`}
            >
              + Create Invoice
            </button>
            <button
              onClick={handleAutoGenerate}
              disabled={autoGenLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50`}
            >
              {autoGenLoading ? "..." : "🔄 Generate Monthly Invoices"}
            </button>
          </div>
        </div>

        {loading ? (
          <p className={`p-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Loading payments…</p>
        ) : (
          <>
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
                  <p className="text-xl font-bold text-red-500">${totalOverdue.toLocaleString()}</p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                    Due Soon
                  </p>
                  <p className={`text-xl font-bold ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                    ${totalDueSoon.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className={`text-xs uppercase tracking-wider ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                    Total MRR
                  </p>
                  <p className={`text-xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
                    ${totalMRR.toLocaleString()}/mo
                  </p>
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
              <div className={`divide-y ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
                {overdue.length === 0 ? (
                  <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No overdue invoices</p>
                ) : (
                  overdue.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      inv={inv}
                      isDark={isDark}
                      variant="overdue"
                      onChase={() => handleChase(inv)}
                      onDownloadPdf={() => handleDownloadPdf(inv)}
                      onSendEmail={() => handleSendEmail(inv)}
                      onMarkPaid={() => handleMarkPaid(inv)}
                      loading={btnDisabled(`chase-${inv.id}`) || btnDisabled(`email-${inv.id}`) || btnDisabled(`paid-${inv.id}`)}
                      getInvoiceNumber={getInvoiceNumber}
                      formatDate={formatDate}
                      daysOverdue={daysOverdue}
                    />
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
              <div className={`divide-y ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
                {dueSoon.length === 0 ? (
                  <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>Nothing due this week</p>
                ) : (
                  dueSoon.map((inv) => (
                    <InvoiceRow
                      key={inv.id}
                      inv={inv}
                      isDark={isDark}
                      variant="dueSoon"
                      onSendReminder={() => handleSendReminder(inv)}
                      onDownloadPdf={() => handleDownloadPdf(inv)}
                      onSendEmail={() => handleSendEmail(inv)}
                      onMarkPaid={() => handleMarkPaid(inv)}
                      loading={btnDisabled(`reminder-${inv.id}`) || btnDisabled(`email-${inv.id}`) || btnDisabled(`paid-${inv.id}`)}
                      getInvoiceNumber={getInvoiceNumber}
                      formatDate={formatDate}
                      daysOverdue={daysOverdue}
                    />
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
              <div className={`divide-y ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
                {recentlyPaid.length === 0 ? (
                  <p className={`p-4 text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No recent payments</p>
                ) : (
                  recentlyPaid.map((inv) => (
                    <div
                      key={inv.id}
                      className={`flex items-center justify-between gap-4 px-4 py-3 ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"}`}
                    >
                      <p className={`font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                        ✅ {inv.clientName} · {inv.invoiceNumber} · ${inv.amount.toLocaleString()} · paid
                      </p>
                      <InvoiceActionsDropdown
                        inv={inv}
                        isDark={isDark}
                        onDownloadPdf={() => handleDownloadPdf(inv)}
                        onSendEmail={() => handleSendEmail(inv)}
                        loading={btnDisabled(`email-${inv.id}`)}
                      />
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <CreateInvoiceModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchPayments();
          setCreateModalOpen(false);
        }}
      />
    </div>
  );
}

function InvoiceRow({
  inv,
  isDark,
  variant,
  onChase,
  onSendReminder,
  onDownloadPdf,
  onSendEmail,
  onMarkPaid,
  loading,
  getInvoiceNumber,
  formatDate,
  daysOverdue,
}: {
  inv: PaymentInvoice;
  isDark: boolean;
  variant: "overdue" | "dueSoon";
  onChase?: () => void;
  onSendReminder?: () => void;
  onDownloadPdf: () => void;
  onSendEmail: () => void;
  onMarkPaid: () => void;
  loading: boolean;
  getInvoiceNumber: (i: PaymentInvoice) => string;
  formatDate: (d: string) => string;
  daysOverdue: (d: string) => number;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"}`}
    >
      <div>
        <p className={`font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
          {variant === "overdue" ? "🔴" : "🟡"} {inv.clientName} · {getInvoiceNumber(inv)} · ${inv.amount.toLocaleString()}
        </p>
        <p className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          {variant === "overdue" ? `${inv.daysOverdue ?? daysOverdue(inv.dueDate)} days overdue` : `due ${formatDate(inv.dueDate)}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {variant === "overdue" && onChase && (
          <button
            onClick={onChase}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              isDark ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-red-100 text-red-700 hover:bg-red-200"
            } disabled:opacity-50`}
          >
            {loading ? "…" : "Chase"}
          </button>
        )}
        {variant === "dueSoon" && onSendReminder && (
          <button
            onClick={onSendReminder}
            disabled={loading}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              isDark ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" : "bg-amber-100 text-amber-700 hover:bg-amber-200"
            } disabled:opacity-50`}
          >
            {loading ? "…" : "Send reminder"}
          </button>
        )}
        <Link
          href={`/clients/${inv.clientId}`}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Go
        </Link>
        <InvoiceActionsDropdown
          inv={inv}
          isDark={isDark}
          onDownloadPdf={onDownloadPdf}
          onSendEmail={onSendEmail}
          onMarkPaid={onMarkPaid}
          loading={loading}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
      </div>
    </div>
  );
}

function InvoiceActionsDropdown({
  inv,
  isDark,
  onDownloadPdf,
  onSendEmail,
  onMarkPaid,
  loading,
  menuOpen,
  setMenuOpen,
}: {
  inv: PaymentInvoice;
  isDark: boolean;
  onDownloadPdf: () => void;
  onSendEmail: () => void;
  onMarkPaid?: () => void;
  loading: boolean;
  menuOpen?: boolean;
  setMenuOpen?: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const isOpen = menuOpen ?? open;
  const setIsOpen = setMenuOpen ?? setOpen;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg ${isDark ? "text-[#5a5040] hover:bg-[#141210]" : "text-gray-500 hover:bg-gray-100"}`}
        title="More actions"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden />
          <div
            className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[160px] ${
              isDark ? "bg-[#0a0a0e] border border-[#1a1810]" : "bg-white border border-gray-200"
            }`}
          >
            <button
              onClick={() => {
                onDownloadPdf();
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-2 text-sm ${isDark ? "text-[#c4b8a8] hover:bg-[#141210]" : "text-gray-700 hover:bg-gray-50"}`}
            >
              Download PDF
            </button>
            <button
              onClick={() => {
                onSendEmail();
                setIsOpen(false);
              }}
              disabled={loading}
              className={`block w-full text-left px-4 py-2 text-sm ${isDark ? "text-[#c4b8a8] hover:bg-[#141210]" : "text-gray-700 hover:bg-gray-50"} disabled:opacity-50`}
            >
              Send Email
            </button>
            {onMarkPaid && (
              <button
                onClick={() => {
                  onMarkPaid();
                  setIsOpen(false);
                }}
                disabled={loading}
                className={`block w-full text-left px-4 py-2 text-sm ${isDark ? "text-emerald-400 hover:bg-[#141210]" : "text-emerald-600 hover:bg-gray-50"} disabled:opacity-50`}
              >
                Mark as Paid
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
