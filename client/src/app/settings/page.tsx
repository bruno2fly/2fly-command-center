"use client";

import Link from "next/link";
import { useClients } from "@/contexts/ClientsContext";
import { toast } from "sonner";

export default function SettingsPage() {
  const { clients, deleteClient } = useClients();

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`Delete client "${name}"? This cannot be undone.`)) return;
    deleteClient(id);
    toast.success(`Client "${name}" deleted`);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          ← Back to Dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
      <p className="text-gray-500 text-sm mb-6">
        Manage clients and application preferences
      </p>

      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Delete clients
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Remove clients from the command center. Deleted clients will no longer
          appear in the sidebar or client list.
        </p>

        {clients.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">
            No clients. Add clients from the sidebar.
          </p>
        ) : (
          <ul className="space-y-2">
            {clients.map((client) => (
              <li
                key={client.id}
                className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <span className="font-medium text-gray-900">{client.name}</span>
                  <span className="text-gray-500 text-sm ml-2">
                    (ID: {client.id})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(client.id, client.name)}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
