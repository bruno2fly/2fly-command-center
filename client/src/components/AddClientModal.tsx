"use client";

import { useState } from "react";
import { useClients } from "@/contexts/ClientsContext";
import type { ClientRaw } from "@/lib/mockData";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

function generateId(): string {
  return String(Date.now());
}

export function AddClientModal({ isOpen, onClose }: Props) {
  const { addClient } = useClients();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Client name is required");
      return;
    }
    setSubmitting(true);
    const raw: ClientRaw = {
      id: generateId(),
      name: trimmed,
      contentBufferDays: 14,
      adsRoas: null,
      openRequests: 0,
      websiteBacklog: 0,
      performanceTrend: "flat",
    };
    addClient(raw);
    toast.success(`Client "${trimmed}" added`);
    setName("");
    setSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    if (!submitting) {
      setName("");
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
        aria-hidden
      />
      <div
        className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
        role="dialog"
        aria-labelledby="add-client-title"
      >
        <h2 id="add-client-title" className="text-lg font-semibold text-gray-900 mb-4">
          Add client
        </h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="client-name" className="block text-sm font-medium text-gray-700 mb-2">
            Client name
          </label>
          <input
            id="client-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corp"
            className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            autoFocus
            disabled={submitting}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-60"
              disabled={submitting}
            >
              Add client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
