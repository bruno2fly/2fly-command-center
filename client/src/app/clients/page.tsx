"use client";

import Link from "next/link";
import { useClients } from "@/contexts/ClientsContext";
import { ClientCard } from "@/components/ClientCard";

export default function ClientsPage() {
  const { clients } = useClients();
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Client Overview</h2>
            <p className="text-sm text-gray-500 mt-1">
              All clients with content buffer, ads health, requests, backlog, and
              performance
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
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
