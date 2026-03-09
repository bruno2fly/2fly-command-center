const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchAPI<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/agent-tools${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ClientPayload = {
  name: string;
  contactName?: string | null;
  contactEmail?: string | null;
  monthlyRetainer?: number;
  adBudget?: number;
  roasTarget?: number;
  platforms?: string[] | string;
  status?: 'active' | 'paused' | 'offboarded';
  healthStatus?: 'green' | 'yellow' | 'red';
  notes?: string | null;
};

export const api = {
  getClients: () => fetchAPI<{ clients: ApiClient[]; total: number }>('/clients'),
  getClient: (id: string) => fetchAPI<ApiClient>(`/clients/${id}`),
  postClient: (payload: ClientPayload) =>
    fetchAPI<ApiClient>('/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  patchClient: (id: string, payload: Partial<ClientPayload>) =>
    fetchAPI<ApiClient>(`/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteClient: (id: string) =>
    fetchAPI<void>(`/clients/${id}`, { method: 'DELETE' }),
  getRequests: (clientId?: string) =>
    fetchAPI(`/requests${clientId ? `?clientId=${clientId}` : ''}`),
  getContent: (clientId?: string) =>
    fetchAPI(`/content${clientId ? `?clientId=${clientId}` : ''}`),
  getAds: (clientId?: string) =>
    fetchAPI(`/ads${clientId ? `?clientId=${clientId}` : ''}`),
  getHealth: () => fetchAPI<ApiHealthResponse>('/health'),
  getPulse: () => fetchAPI<ApiPulseResponse>('/pulse'),
  getBrief: () => fetchAPI<ApiBriefResponse>('/brief'),
  getRevenue: () => fetchAPI<ApiRevenueResponse>('/revenue'),
  getRequestsRaw: (clientId?: string) =>
    fetchAPI<ApiRequestsResponse>(`/requests${clientId ? `?clientId=${clientId}` : ''}`),
  getContentRaw: (clientId?: string) =>
    fetchAPI<ApiContentResponse>(`/content${clientId ? `?clientId=${clientId}` : ''}`),
};

// ─── API response types ─────────────────────────────────────────────────────

export type ApiClient = {
  id: string;
  name: string;
  status: string;
  healthStatus?: string;
  contactName: string | null;
  contactEmail: string | null;
  platforms: string;
  monthlyRetainer: number;
  adBudget: number;
  roasTarget: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  health?: {
    clientId: string;
    clientName: string;
    overall: 'green' | 'yellow' | 'red';
    modules: {
      contentBuffer?: { status: string; bufferDays: number };
      requests?: { status: string; pendingCount: number };
      ads?: { status: string; roas: number | null };
      [key: string]: unknown;
    };
  };
};

export type ApiHealthResponse = {
  timestamp: string;
  totalClients: number;
  green: number;
  yellow: number;
  red: number;
  clients: ApiClient['health'][];
};

export type ApiPulseResponse = {
  timestamp: string;
  health: {
    total: number;
    green: number;
    yellow: number;
    red: number;
    clients: {
      name: string;
      status: string;
      bufferDays?: number;
      openRequests?: number;
      roas?: number;
    }[];
  };
  requests: { total: number; breached: number };
  content: { scheduledNext7Days: number };
};

export type ApiBriefResponse = {
  greeting: string;
  health: {
    green: number;
    yellow: number;
    red: number;
    redClients: string[];
  };
  content: {
    dueToday: number;
    dueThisWeek: number;
    urgentItems: {
      title: string;
      client: string;
      scheduledDate: string;
      status: string;
    }[];
  };
  requests: {
    open: number;
    overdue: number;
    overdueItems: {
      title: string;
      client: string;
      priority: string;
      dueDate: string;
    }[];
  };
  revenue: {
    mrr: number;
    atRisk: number;
  };
};

export type ApiRevenueResponse = {
  mrr: number;
  atRiskRevenue: number;
  adSpend: number;
  clients: {
    name: string;
    retainer: number;
    adBudget: number;
  }[];
};

export type ApiRequestItem = {
  id: string;
  title: string;
  description?: string;
  clientId: string;
  client?: { name: string };
  priority: string;
  status: string;
  dueDate?: string;
  assignedTo?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiRequestsResponse = {
  requests: ApiRequestItem[];
  total: number;
};

export type ApiContentItem = {
  id: string;
  title: string;
  clientId: string;
  client?: { name: string };
  platform: string;
  status: string;
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiContentResponse = {
  content: ApiContentItem[];
  total: number;
};
