"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClients } from "@/contexts/ClientsContext";
import { buildClientLanes } from "@/lib/clientLanes";
import { AddClientModal } from "./AddClientModal";

const HEALTH_DOT: Record<string, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function SidebarClientList() {
  const pathname = usePathname() ?? "";
  const { clients } = useClients();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const lanes = buildClientLanes(clients);

  return (
    <aside className="w-64 bg-slate-800 flex flex-col min-h-full shrink-0">
      <div className="p-4 flex flex-col gap-2">
        <Link
          href="/"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/"
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/clients"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/clients"
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          All Clients
        </Link>
        <Link
          href="/settings"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/settings"
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          Settings
        </Link>
        <Link
          href="/whatsapp"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/whatsapp" || pathname === "/whatsapp-inbox"
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          WhatsApp Inbox
        </Link>
        <Link
          href="/admin/whatsapp"
          className={`text-sm font-medium rounded-lg px-3 py-2 transition-colors ${
            pathname === "/admin/whatsapp"
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
          }`}
        >
          WhatsApp Chat
        </Link>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider pt-2 px-3">
          Clients
        </h2>
      </div>
      <nav className="flex-1 px-3 pb-4 space-y-1 overflow-auto">
        {lanes.map((lane) => {
          const isActive = pathname === `/clients/${lane.clientId}`;

          return (
            <Link
              key={lane.clientId}
              href={`/clients/${lane.clientId}`}
              className={`block rounded-lg p-3 transition-colors ${
                isActive ? "bg-slate-700" : "hover:bg-slate-700/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${HEALTH_DOT[lane.health]}`} />
                <span className="font-medium text-white truncate">{lane.clientName}</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-400 truncate">{lane.primaryCta}</p>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="w-full py-3 px-4 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition-colors"
        >
          + Add Client
        </button>
      </div>
      <AddClientModal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} />
    </aside>
  );
}
