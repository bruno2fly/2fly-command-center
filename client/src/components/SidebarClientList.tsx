"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { buildClientLanes } from "@/lib/clientLanes";
import { ClientFormModal } from "./ClientFormModal";
import { api, type ApiClient } from "@/lib/api";

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function SidebarClientList() {
  const pathname = usePathname() ?? "";
  const { clients } = useClients();
  const { isDark } = useTheme();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<ApiClient | null>(null);
  const lanes = buildClientLanes(clients);
  const airplaneMode = isDark;

  return (
    <aside
      className={`w-64 flex flex-col min-h-full shrink-0 ${
        airplaneMode ? "bg-[#08080c] border-r border-[#1a1810]" : "bg-slate-800"
      }`}
    >
      <div className="p-4 flex flex-col gap-2 flex-shrink-0">
        <Link
          href="/"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/"
              ? airplaneMode
                ? "bg-[#141210] text-emerald-400/90"
                : "bg-slate-700 text-white"
              : airplaneMode
                ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/clients"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/clients"
              ? airplaneMode
                ? "bg-[#141210] text-emerald-400/90"
                : "bg-slate-700 text-white"
              : airplaneMode
                ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          All Clients
        </Link>
        <Link
          href="/settings"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/settings"
              ? airplaneMode
                ? "bg-[#141210] text-emerald-400/90"
                : "bg-slate-700 text-white"
              : airplaneMode
                ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          Settings
        </Link>
        <Link
          href="/whatsapp"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/whatsapp" || pathname === "/whatsapp-inbox"
              ? airplaneMode
                ? "bg-[#141210] text-emerald-400/90"
                : "bg-slate-700 text-white"
              : airplaneMode
                ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          WhatsApp Inbox
        </Link>
        <Link
          href="/admin/whatsapp"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/admin/whatsapp"
              ? airplaneMode
                ? "bg-[#141210] text-emerald-400/90"
                : "bg-slate-700 text-white"
              : airplaneMode
                ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]"
                : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          WhatsApp Chat
        </Link>
        <h2 className={`text-xs font-semibold uppercase tracking-wider pt-2 px-3 ${airplaneMode ? "text-[#5a5040]" : "text-slate-500"}`}>
          Clients
        </h2>
      </div>
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-auto">
        {lanes.map((lane) => {
          const isActive = pathname === `/clients/${lane.clientId}`;

          return (
            <div
              key={lane.clientId}
              className={`group flex items-center gap-1 rounded-lg transition-colors ${
                isActive
                  ? airplaneMode
                    ? "bg-[#141210]"
                    : "bg-slate-700"
                  : airplaneMode
                    ? "hover:bg-[#141210]/50"
                    : "hover:bg-slate-700/50"
              }`}
            >
              <Link
                href={`/clients/${lane.clientId}`}
                className="flex-1 min-w-0 p-3"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[lane.health]}`} />
                  <span className={`font-medium truncate ${airplaneMode ? "text-[#c4b8a8]" : "text-white"}`}>{lane.clientName}</span>
                </div>
                <p className={`mt-1.5 text-xs truncate ${airplaneMode ? "text-[#5a5040]" : "text-slate-400"}`}>{lane.primaryCta}</p>
              </Link>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  api.getClient(lane.clientId).then(setEditClient).catch(() => {});
                }}
                className={`p-2 shrink-0 ${airplaneMode ? "text-[#5a5040] hover:text-emerald-400/80" : "text-slate-400 hover:text-white"}`}
                title="Edit client"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          );
        })}
      </nav>
      <div className={`p-4 flex-shrink-0 ${airplaneMode ? "border-t border-[#1a1810]" : "border-t border-slate-700"}`}>
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
            airplaneMode
              ? "bg-[#141210] text-emerald-400/90 hover:bg-[#1a1810] hover:text-emerald-400"
              : "bg-slate-600 text-white hover:bg-slate-500"
          }`}
        >
          + Add Client
        </button>
      </div>
      <ClientFormModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        mode="create"
      />
      <ClientFormModal
        isOpen={!!editClient}
        onClose={() => setEditClient(null)}
        mode="edit"
        client={editClient ?? undefined}
      />
    </aside>
  );
}
