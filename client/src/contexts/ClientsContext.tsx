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
import { api, type ApiClient } from "@/lib/api";

const STORAGE_KEY = "2fly-clients";

/** Map an API client response to our frontend Client type */
function mapApiClient(ac: ApiClient): Client {
  const health = ac.health;
  const bufferDays = health?.modules?.contentBuffer?.bufferDays ?? 14;
  const pendingRequests = health?.modules?.requests?.pendingCount ?? 0;
  const roas = health?.modules?.ads?.roas ?? null;

  return createClient({
    id: ac.id,
    name: ac.name,
    contentBufferDays: bufferDays,
    adsRoas: roas,
    openRequests: pendingRequests,
    websiteBacklog: 0, // not tracked in API yet
    performanceTrend: "flat", // not tracked in API yet
    monthlyRetainer: ac.monthlyRetainer ?? null,
  });
}

function loadCachedClients(): Client[] | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const raw = JSON.parse(stored) as ClientRaw[];
    return raw.map(createClient);
  } catch {
    return null;
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
    monthlyRetainer: c.monthlyRetainer,
  };
}

type ClientsContextValue = {
  clients: Client[];
  loading: boolean;
  refreshClients: () => Promise<void>;
  addClient: (raw: ClientRaw) => void;
  deleteClient: (id: string) => void;
};

const ClientsContext = createContext<ClientsContextValue | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [loading, setLoading] = useState(true);

  // Fetch from API on mount, fall back to cache, then mock
  useEffect(() => {
    let cancelled = false;

    async function fetchClients() {
      try {
        const data = await api.getClients();
        if (!cancelled && data.clients && data.clients.length > 0) {
          const mapped = data.clients.map(mapApiClient);
          setClients(mapped);
          // Cache in localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped.map(toRaw)));
          }
        }
      } catch {
        // API down — try localStorage cache
        const cached = loadCachedClients();
        if (!cancelled && cached && cached.length > 0) {
          setClients(cached);
        }
        // else keep MOCK_CLIENTS default
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchClients();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback((next: Client[]) => {
    setClients(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.map(toRaw)));
    }
  }, []);

  const refreshClients = useCallback(async () => {
    try {
      const data = await api.getClients();
      if (data.clients && data.clients.length > 0) {
        const mapped = data.clients.map(mapApiClient);
        setClients(mapped);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped.map(toRaw)));
        }
      }
    } catch {
      const cached = loadCachedClients();
      if (cached && cached.length > 0) setClients(cached);
    }
  }, []);

  const addClient = useCallback(
    (raw: ClientRaw) => {
      const next = [...clients, createClient(raw)];
      persist(next);

      // Also POST to API (fire-and-forget)
      fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/agent-tools/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: raw.name }),
      }).catch(() => { /* API down, local state still updated */ });
    },
    [clients, persist]
  );

  const deleteClient = useCallback(
    (id: string) => {
      persist(clients.filter((c) => c.id !== id));
      // API doesn't have DELETE endpoint yet — only local
    },
    [clients, persist]
  );

  const value = useMemo(
    () => ({ clients, loading, refreshClients, addClient, deleteClient }),
    [clients, loading, refreshClients, addClient, deleteClient]
  );

  return <ClientsContext.Provider value={value}>{children}</ClientsContext.Provider>;
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used within ClientsProvider");
  return ctx;
}
