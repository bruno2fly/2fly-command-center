"use client";

import Link from "next/link";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { ClientCard } from "@/components/ClientCard";

export default function ClientsPage() {
  const { clients } = useClients();
  const { isDark } = useTheme();

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>Client Overview</h2>
            <p className={`text-sm mt-1 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
              All clients with content buffer, ads health, requests, backlog, and
              performance
            </p>
          </div>
          <Link
            href="/"
            className={`text-sm font-medium ${isDark ? "text-emerald-400/90 hover:text-emerald-400" : "text-blue-600 hover:text-blue-700"}`}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => (
          <ClientCard key={client.id} client={client} />
        ))}
      </div>
    </div>
  );
}
