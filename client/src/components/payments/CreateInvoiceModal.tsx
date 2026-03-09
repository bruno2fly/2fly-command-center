"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import { toast } from "sonner";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const INVOICE_TYPES = ["retainer", "ad_spend", "project", "one_time"] as const;
const STATUS_OPTIONS = ["draft", "sent"] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateInvoiceModal({ isOpen, onClose, onSuccess }: Props) {
  const { isDark } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<{ id: string; name: string; monthlyRetainer: number }[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);

  const [clientId, setClientId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"retainer" | "ad_spend" | "project" | "one_time">("retainer");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"draft" | "sent">("sent");

  useEffect(() => {
    if (isOpen) {
      setClientsLoading(true);
      Promise.all([
        fetch(`${API}/api/agent-tools/clients`).then((r) => (r.ok ? r.json() : null)),
        fetch(`${API}/api/agent-tools/invoices`).then((r) => (r.ok ? r.json() : null)),
      ]).then(([clientsData, invoicesData]) => {
        if (clientsData?.clients?.length) {
          setClients(clientsData.clients.map((c: { id: string; name: string; monthlyRetainer?: number }) => ({
            id: c.id,
            name: c.name,
            monthlyRetainer: c.monthlyRetainer ?? 0,
          })));
        }
        let nextNum = 100;
        if (invoicesData?.invoices?.length) {
          const nums = invoicesData.invoices
            .map((inv: { invoiceNumber: string }) => parseInt((inv.invoiceNumber || "").replace(/\D/g, ""), 10))
            .filter((n: number) => !isNaN(n));
          if (nums.length) nextNum = Math.max(...nums) + 1;
        }
        setInvoiceNumber(`INV-${nextNum}`);
      }).finally(() => setClientsLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDueDate(endOfMonth.toISOString().slice(0, 10));
  }, [isOpen]);

  useEffect(() => {
    if (clientId && clients.length) {
      const client = clients.find((c) => c.id === clientId);
      if (client) {
        setAmount(String(client.monthlyRetainer || ""));
        const now = new Date();
        const month = now.toLocaleString("en-US", { month: "long", year: "numeric" });
        setDescription(`${month} retainer — ${client.name}`);
      }
    }
  }, [clientId, clients]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !invoiceNumber || !amount || !dueDate) {
      toast.error("Client, Invoice Number, Amount, and Due Date are required");
      return;
    }
    setSubmitting(true);
    try {
      await api.postInvoice({
        clientId,
        invoiceNumber: invoiceNumber.trim(),
        amount: parseFloat(amount),
        dueDate,
        description: description.trim() || undefined,
        type,
        status,
      });
      toast.success("Invoice created");
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) onClose();
  };

  if (!isOpen) return null;

  const inputClass = isDark
    ? "w-full px-4 py-2.5 rounded-lg border border-[#1a1810] bg-[#0a0a0e] text-[#c4b8a8] placeholder-[#5a5040] focus:outline-none focus:ring-2 focus:ring-blue-500"
    : "w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = isDark ? "block text-sm font-medium text-[#8a7e6d] mb-2" : "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={handleClose} aria-hidden />
      <div
        className={`relative rounded-xl shadow-xl border p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto ${
          isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200"
        }`}
        role="dialog"
        aria-labelledby="create-invoice-title"
      >
        <h2 id="create-invoice-title" className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
          Create Invoice
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invoice-client" className={labelClass}>
              Client *
            </label>
            <select
              id="invoice-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={inputClass}
              required
              disabled={submitting || clientsLoading}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="invoice-number" className={labelClass}>
              Invoice Number *
            </label>
            <input
              id="invoice-number"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="INV-101"
              className={inputClass}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="invoice-amount" className={labelClass}>
              Amount *
            </label>
            <input
              id="invoice-amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={inputClass}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="invoice-type" className={labelClass}>
              Type
            </label>
            <select
              id="invoice-type"
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className={inputClass}
              disabled={submitting}
            >
              {INVOICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === "retainer" ? "Retainer" : t === "ad_spend" ? "Ad Spend" : t === "project" ? "Project" : "One-time"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="invoice-due" className={labelClass}>
              Due Date *
            </label>
            <input
              id="invoice-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
              required
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="invoice-desc" className={labelClass}>
              Description
            </label>
            <input
              id="invoice-desc"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="March 2026 retainer — Client Name"
              className={inputClass}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="invoice-status" className={labelClass}>
              Status
            </label>
            <select
              id="invoice-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className={inputClass}
              disabled={submitting}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "draft" ? "Draft" : "Sent"}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className={`px-4 py-2 rounded-lg font-medium ${
                isDark ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-blue-600 text-white hover:bg-blue-500"
              } disabled:opacity-50`}
            >
              {submitting ? "Creating…" : "Create Invoice"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2 rounded-lg font-medium ${
                isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
