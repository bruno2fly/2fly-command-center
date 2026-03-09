"use client";

import { useState } from "react";
import Link from "next/link";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

type Section = "general" | "notifications" | "integrations" | "team" | "clients" | "data";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "integrations", label: "Integrations" },
  { id: "team", label: "Team" },
  { id: "clients", label: "Clients" },
  { id: "data", label: "Data" },
];

export default function SettingsPage() {
  const { isDark } = useTheme();
  const { clients, deleteClient } = useClients();
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteModal({ id, name });
    setDeleteConfirmText("");
  };

  const handleDeleteConfirm = () => {
    if (!deleteModal) return;
    if (deleteConfirmText !== deleteModal.name) {
      toast.error("Type the client name exactly to confirm");
      return;
    }
    deleteClient(deleteModal.id);
    toast.success(`Client "${deleteModal.name}" deleted`);
    setDeleteModal(null);
    setDeleteConfirmText("");
  };

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <div className={`flex min-h-[calc(100vh-120px)] ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      {/* Sidebar nav */}
      <aside className={`w-56 flex-shrink-0 border-r p-4 ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        <h1 className={`text-lg font-bold mb-4 ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
          Settings
        </h1>
        <nav className="space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                activeSection === s.id
                  ? isDark ? "bg-[#141210] text-emerald-400" : "bg-gray-100 text-gray-900"
                  : isDark ? "text-[#8a7e6d] hover:bg-[#141210]" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          {activeSection === "general" && (
            <section className={`rounded-xl border p-6 ${baseCls}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                General
              </h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>
                    Agency name
                  </label>
                  <input
                    type="text"
                    defaultValue="2Fly Marketing"
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8]" : "border-gray-200"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>
                    Default work capacity (minutes)
                  </label>
                  <input
                    type="number"
                    defaultValue={480}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8]" : "border-gray-200"
                    }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1 ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>
                    Time zone
                  </label>
                  <select
                    className={`w-full px-3 py-2 rounded-lg border ${
                      isDark ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8]" : "border-gray-200"
                    }`}
                  >
                    <option>America/New_York</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {activeSection === "notifications" && (
            <section className={`rounded-xl border p-6 ${baseCls}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                Notifications
              </h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className={isDark ? "text-[#c4b8a8]" : "text-gray-700"}>Email: Urgent alerts</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className={isDark ? "text-[#c4b8a8]" : "text-gray-700"}>Email: Overdue payments</span>
                </label>
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="rounded" />
                  <span className={isDark ? "text-[#c4b8a8]" : "text-gray-700"}>Browser push notifications</span>
                </label>
              </div>
            </section>
          )}

          {activeSection === "integrations" && (
            <section className={`rounded-xl border p-6 ${baseCls}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                Integrations
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium">WhatsApp</p>
                    <p className="text-xs text-gray-500">Connection status</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium">Meta Ads</p>
                    <p className="text-xs text-gray-500">Connection status</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-gray-400" title="Not configured" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                  <div>
                    <p className="font-medium">Payment system</p>
                    <p className="text-xs text-gray-500">Connection status</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-gray-400" title="Not configured" />
                </div>
              </div>
            </section>
          )}

          {activeSection === "team" && (
            <section className={`rounded-xl border p-6 ${baseCls}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                Team
              </h2>
              <p className={`text-sm ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                Team members and role permissions — coming soon.
              </p>
            </section>
          )}

          {activeSection === "clients" && (
            <section className={`rounded-xl border p-6 ${baseCls}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                Clients
              </h2>
              <p className={`text-sm mb-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                Manage clients. Delete requires confirmation.
              </p>
              {clients.length === 0 ? (
                <p className={`text-sm py-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>No clients</p>
              ) : (
                <ul className="space-y-2">
                  {clients.map((client) => (
                    <li
                      key={client.id}
                      className={`flex items-center justify-between py-3 px-4 rounded-lg ${
                        isDark ? "bg-[#0c0c10] border border-[#1a1810]" : "bg-gray-50"
                      }`}
                    >
                      <span className={`font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                        {client.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(client.id, client.name)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
                          isDark ? "text-red-400 bg-red-500/20 hover:bg-red-500/30" : "text-red-600 bg-red-50 hover:bg-red-100"
                        }`}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {activeSection === "data" && (
            <section className={`rounded-xl border p-6 ${baseCls}`}>
              <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                Data
              </h2>
              <div className="space-y-4">
                <button
                  onClick={() => toast.success("Export started")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Export all data
                </button>
              </div>
              <div className={`mt-6 p-4 rounded-lg border ${isDark ? "border-red-500/30 bg-red-500/5" : "border-red-200 bg-red-50"}`}>
                <h3 className={`font-semibold text-red-600 mb-2`}>Danger zone</h3>
                <p className={`text-sm mb-2 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
                  Account deletion is permanent and cannot be undone.
                </p>
                <button
                  disabled
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-400 cursor-not-allowed"
                >
                  Delete account
                </button>
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Delete confirmation modal */}
      {deleteModal && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setDeleteModal(null)} />
          <div className={`fixed inset-0 z-50 flex items-center justify-center p-4`}>
            <div className={`max-w-md w-full rounded-xl p-6 ${baseCls}`}>
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
                Delete client
              </h3>
              <p className={`text-sm mb-4 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
                Type <strong>{deleteModal.name}</strong> to confirm deletion. This cannot be undone.
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Client name"
                className={`w-full px-3 py-2 rounded-lg border mb-4 ${
                  isDark ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8]" : "border-gray-200"
                }`}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleteConfirmText !== deleteModal.name}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    deleteConfirmText === deleteModal.name
                      ? "bg-red-600 text-white hover:bg-red-500"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Delete
                </button>
                <button
                  onClick={() => setDeleteModal(null)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    isDark ? "bg-[#141210] text-[#8a7e6d]" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
