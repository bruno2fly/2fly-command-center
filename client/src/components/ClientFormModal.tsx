"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api, type ApiClient, type ClientPayload } from "@/lib/api";
import { toast } from "sonner";

const PLATFORMS = ["meta", "instagram", "google", "tiktok", "linkedin"] as const;
const STATUS_OPTIONS = ["active", "paused", "offboarded"] as const;
const HEALTH_OPTIONS = ["green", "yellow", "red"] as const;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  client?: ApiClient | null;
};

function parsePlatforms(platforms: string): string[] {
  try {
    const parsed = JSON.parse(platforms);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ClientFormModal({ isOpen, onClose, mode, client }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { refreshClients } = useClients();
  const { isDark } = useTheme();
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [monthlyRetainer, setMonthlyRetainer] = useState("");
  const [adBudget, setAdBudget] = useState("");
  const [roasTarget, setRoasTarget] = useState("3");
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [status, setStatus] = useState<"active" | "paused" | "offboarded">("active");
  const [healthStatus, setHealthStatus] = useState<"green" | "yellow" | "red">("green");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (mode === "edit" && client) {
      setName(client.name);
      setContactName(client.contactName ?? "");
      setContactEmail(client.contactEmail ?? "");
      setMonthlyRetainer(String(client.monthlyRetainer ?? ""));
      setAdBudget(String(client.adBudget ?? ""));
      setRoasTarget(String(client.roasTarget ?? 3));
      setPlatforms(parsePlatforms(client.platforms ?? "[]"));
      setStatus((client.status as "active" | "paused" | "offboarded") || "active");
      setHealthStatus((client.healthStatus as "green" | "yellow" | "red") || "green");
      setNotes(client.notes ?? "");
    } else {
      setName("");
      setContactName("");
      setContactEmail("");
      setMonthlyRetainer("");
      setAdBudget("");
      setRoasTarget("3");
      setPlatforms([]);
      setStatus("active");
      setHealthStatus("green");
      setNotes("");
    }
    setShowDeleteConfirm(false);
  }, [mode, client, isOpen]);

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Client name is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: ClientPayload = {
        name: trimmed,
        contactName: contactName.trim() || null,
        contactEmail: contactEmail.trim() || null,
        monthlyRetainer: parseFloat(monthlyRetainer) || 0,
        adBudget: parseFloat(adBudget) || 0,
        roasTarget: parseFloat(roasTarget) || 3,
        platforms: platforms.length ? platforms : ["meta"],
        status,
        healthStatus,
        notes: notes.trim() || null,
      };
      if (mode === "create") {
        await api.postClient(payload);
        toast.success(`Client "${trimmed}" added`);
      } else if (client) {
        await api.patchClient(client.id, payload);
        toast.success(`Client "${trimmed}" updated`);
      }
      refreshClients();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!client) return;
    setDeleting(true);
    try {
      await api.deleteClient(client.id);
      toast.success(`Client "${client.name}" deleted`);
      onClose();
      await refreshClients();
      if (pathname.startsWith("/clients/") && pathname.includes(client.id)) {
        router.push("/clients");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    if (!submitting && !deleting) {
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  const inputClass = isDark
    ? "w-full px-4 py-2.5 rounded-lg border border-[#1a1810] bg-[#0a0a0e] text-[#c4b8a8] placeholder-[#5a5040] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    : "w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
  const labelClass = isDark ? "block text-sm font-medium text-[#8a7e6d] mb-2" : "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className={`relative rounded-xl shadow-xl border p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto ${
          isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200"
        }`}
        role="dialog"
        aria-labelledby="client-form-title"
      >
        <h2
          id="client-form-title"
          className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}
        >
          {mode === "create" ? "Add client" : "Edit client"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="client-name" className={labelClass}>
              Name *
            </label>
            <input
              id="client-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corp"
              className={inputClass}
              autoFocus
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="contact-name" className={labelClass}>
              Contact Name
            </label>
            <input
              id="contact-name"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className={inputClass}
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="contact-email" className={labelClass}>
              Contact Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="e.g. jane@acme.com"
              className={inputClass}
              disabled={submitting}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="monthly-retainer" className={labelClass}>
                Monthly Retainer (USD)
              </label>
              <input
                id="monthly-retainer"
                type="number"
                min="0"
                step="0.01"
                value={monthlyRetainer}
                onChange={(e) => setMonthlyRetainer(e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="ad-budget" className={labelClass}>
                Ad Budget (USD, 0 = no ads)
              </label>
              <input
                id="ad-budget"
                type="number"
                min="0"
                step="0.01"
                value={adBudget}
                onChange={(e) => setAdBudget(e.target.value)}
                placeholder="0"
                className={inputClass}
                disabled={submitting}
              />
            </div>
          </div>
          <div>
            <label htmlFor="roas-target" className={labelClass}>
              ROAS Target
            </label>
            <input
              id="roas-target"
              type="number"
              min="0"
              step="0.1"
              value={roasTarget}
              onChange={(e) => setRoasTarget(e.target.value)}
              placeholder="3.0"
              className={inputClass}
              disabled={submitting}
            />
          </div>
          <div>
            <span className={labelClass}>Platforms</span>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={platforms.includes(p)}
                    onChange={() => togglePlatform(p)}
                    disabled={submitting}
                    className="rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500"
                  />
                  <span className={`text-sm capitalize ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>{p}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="status" className={labelClass}>
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "active" | "paused" | "offboarded")
                }
                className={inputClass}
                disabled={submitting}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s} className={isDark ? "bg-[#0a0a0e]" : "bg-white"}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="health-status" className={labelClass}>
                Health Status
              </label>
              <select
                id="health-status"
                value={healthStatus}
                onChange={(e) =>
                  setHealthStatus(e.target.value as "green" | "yellow" | "red")
                }
                className={inputClass}
                disabled={submitting}
              >
                {HEALTH_OPTIONS.map((h) => (
                  <option key={h} value={h} className={isDark ? "bg-[#0a0a0e]" : "bg-white"}>
                    {h.charAt(0).toUpperCase() + h.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="notes" className={labelClass}>
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes..."
              className={inputClass}
              disabled={submitting}
            />
          </div>

          {mode === "edit" && client && (
            <div className={`pt-2 border-t ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-400 hover:text-red-300"
                  disabled={submitting}
                >
                  Delete client
                </button>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">
                    Delete &quot;{client.name}&quot;? This cannot be undone.
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-sm text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-sm px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-60"
                  >
                    {deleting ? "Deleting..." : "Yes, delete"}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                isDark ? "text-[#8a7e6d] bg-[#141210] hover:bg-[#1a1810]" : "text-gray-700 bg-gray-100 hover:bg-gray-200"
              }`}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-60 ${
                isDark ? "bg-emerald-600 hover:bg-emerald-500" : "bg-blue-600 hover:bg-blue-500"
              }`}
              disabled={submitting}
            >
              {submitting ? "Saving..." : mode === "create" ? "Add client" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
