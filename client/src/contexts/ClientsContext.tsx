"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createClient, MOCK_CLIENTS, type Client, type ClientRaw } from "@/lib/mockData";

const STORAGE_KEY = "2fly-clients";

function loadClients(): Client[] {
  if (typeof window === "undefined") return MOCK_CLIENTS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return MOCK_CLIENTS;
    const raw = JSON.parse(stored) as ClientRaw[];
    return raw.map(createClient);
  } catch {
    return MOCK_CLIENTS;
  }
}

function toRaw(c: Client): ClientRaw {
  return {
    id: c.id,
    name: c.name,
    contentBufferDays: c.contentBufferDays,
    adsRoas: c.adsRoas,
    openRequests: c.openRequests,
    websiteBacklog: c.websiteBacklog,
    performanceTrend: c.performanceTrend,
  };
}

type ClientsContextValue = {
  clients: Client[];
  addClient: (raw: ClientRaw) => void;
  deleteClient: (id: string) => void;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);

  useEffect(() => {
    setClients(loadClients());
  }, []);

  const persist = useCallback((next: Client[]) => {
    setClients(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(toRaw)));
    }
  }, []);

  const addClient = useCallback(
    (raw: ClientRaw) => {
      const next = [...clients, createClient(raw)];
      persist(next);
    },
    [clients, persist]
  );

  const deleteClient = useCallback(
    (id: string) => {
      persist(clients.filter((c) => c.id !== id));
    },
    [clients, persist]
  );

  const value = useMemo(
    () => ({ clients, addClient, deleteClient }),
    [clients, addClient, deleteClient]
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used within ClientsProvider");
  return ctx;
}
