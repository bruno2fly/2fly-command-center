const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchAPI<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/agent-tools${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Briefs API — base path /api/briefs (not agent-tools) */
export async function fetchBriefsAPI<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/briefs${path}`, init);
  if (!res.ok) throw new Error(`Briefs API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Directives API — /api/directives */
export async function fetchDirectivesAPI<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api/directives${path}`, init);
  if (!res.ok) throw new Error(`Directives API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Main API (clients, tasks) — /api */
export async function fetchMainAPI<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ApiDirective = {
  id: string;
  message: string;
  agentId: string;
  agentName: string;
  clientId: string | null;
  clientName: string | null;
  status: string;
  result: string | null;
  tasksCreated: number;
  contentCreated: number;
  createdAt: string;
  completedAt: string | null;
};

export type ApiTask = {
  id: string;
  clientId: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  source: string;
  directiveId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiAction = {
  id: string;
  entityType: 'content' | 'task' | 'request';
  entityId: string;
  title: string;
  description: string | null;
  priority: string;
  source: string;
  sourceName: string;
  dueDate: string | null;
  isOverdue: boolean;
  createdAt: string;
  availableActions: string[];
};

export type ApiBrief = {
  id: string;
  type: string;
  title: string;
  agentId: string;
  agentName: string;
  summary: string;
  highlights: string | null;
  status: 'unread' | 'read' | 'archived';
  priority: string;
  healthSnapshot: string | null;
  createdAt: string;
  readAt: string | null;
};

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
  /** Client detail from main API (includes adReports, contentItems, tasks, requests, invoices) */
  getClientMain: (id: string) =>
    fetchMainAPI<ApiClient & {
      adReports?: Array<{ roas?: number; spend?: number; weekStart?: string }>;
      contentItems?: ApiContentItem[];
      tasks?: ApiTask[];
      requests?: ApiRequestItem[];
      invoices?: Array<{ status: string; dueDate: string; paidDate?: string | null; amount: number }>;
    }>(`/clients/${id}`),
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
  // Daily briefings (agent reports) — /api/briefs
  getBriefs: (params?: { status?: string; date?: string; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.date) q.set('date', params.date);
    if (params?.type) q.set('type', params.type);
    const query = q.toString();
    return fetchBriefsAPI<{ briefs: ApiBrief[]; total: number }>(query ? `?${query}` : '');
  },
  getBriefsToday: () =>
    fetchBriefsAPI<{ briefs: ApiBrief[]; total: number }>('/today'),
  getBriefById: (id: string) => fetchBriefsAPI<ApiBrief>(`/${id}`),
  patchBrief: (id: string, payload: { status?: 'read' | 'archived' }) =>
    fetchBriefsAPI<ApiBrief>(`/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  // Directives (Bruno → Agent)
  createDirective: (payload: { message: string; agentId: string; clientId?: string }) =>
    fetchDirectivesAPI<ApiDirective>('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  getDirectives: (params?: { status?: string; agentId?: string; clientId?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.agentId) q.set('agentId', params.agentId);
    if (params?.clientId) q.set('clientId', params.clientId);
    const query = q.toString();
    return fetchDirectivesAPI<{ directives: ApiDirective[]; total: number }>(query ? `?${query}` : '');
  },
  getDirectiveById: (id: string) => fetchDirectivesAPI<ApiDirective>(`/${id}`),
  processDirective: (id: string) =>
    fetchDirectivesAPI<ApiDirective>(`/${id}/process`, { method: 'POST' }),
  // Client tasks — main API /api/clients/:id/tasks
  getClientTasks: (clientId: string, params?: { status?: string; type?: string; source?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.type) q.set('type', params.type);
    if (params?.source) q.set('source', params.source);
    const query = q.toString();
    return fetchMainAPI<{ tasks: ApiTask[]; total: number }>(
      `/clients/${clientId}/tasks${query ? `?${query}` : ''}`
    );
  },
  postClientTask: (clientId: string, payload: Partial<ApiTask> & { title: string }) =>
    fetchMainAPI<ApiTask>(`/clients/${clientId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  patchClientTask: (clientId: string, taskId: string, payload: Partial<ApiTask>) =>
    fetchMainAPI<ApiTask>(`/clients/${clientId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  deleteClientTask: (clientId: string, taskId: string) =>
    fetchMainAPI<{ deleted: boolean }>(`/clients/${clientId}/tasks/${taskId}`, { method: 'DELETE' }),
  getClientActions: (clientId: string) =>
    fetchMainAPI<{ actions: ApiAction[]; total: number }>(`/clients/${clientId}/actions`),
  getRequestsRaw: (clientId?: string) =>
    fetchAPI<ApiRequestsResponse>(`/requests${clientId ? `?clientId=${clientId}` : ''}`),
  patchRequest: (id: string, payload: { status?: string }) =>
    fetchMainAPI<ApiRequestItem>(`/requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  getContentRaw: (clientId?: string) =>
    fetchAPI<ApiContentResponse>(`/content${clientId ? `?clientId=${clientId}` : ''}`),
  /** Returns content items for a client; handles server returning either .content or .items */
  getContentItems: async (clientId: string): Promise<ApiContentItem[]> => {
    const data = await fetchAPI<ApiContentResponse & { items?: ApiContentItem[] }>(
      `/content?clientId=${encodeURIComponent(clientId)}`
    );
    return (data as { content?: ApiContentItem[]; items?: ApiContentItem[] }).content ??
      (data as { content?: ApiContentItem[]; items?: ApiContentItem[] }).items ??
      [];
  },
  /** Content from main API (includes agent-created items with source/directiveId) */
  getContentItemsMain: async (clientId: string): Promise<ApiContentItem[]> => {
    const data = await fetchMainAPI<ApiContentItem[] | { content?: ApiContentItem[]; items?: ApiContentItem[] }>(
      `/content?clientId=${encodeURIComponent(clientId)}`
    );
    if (Array.isArray(data)) return data;
    return (data as { content?: ApiContentItem[] }).content ?? (data as { items?: ApiContentItem[] }).items ?? [];
  },
  /** PATCH content item (main API) — e.g. status: approved | cancelled */
  patchContent: (id: string, payload: Partial<Pick<ApiContentItem, 'status' | 'title' | 'scheduledDate'>>) =>
    fetchMainAPI<ApiContentItem>(`/content/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  getInvoicesRaw: () =>
    fetchAPI<ApiInvoicesResponse>('/invoices'),
  getPayments: () => fetchAPI<ApiPaymentsResponse>('/payments'),
  postInvoice: (payload: InvoiceCreatePayload) =>
    fetchAPI<{ success: boolean; invoice: unknown }>('/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  patchInvoice: (id: string, payload: { status?: string; paidDate?: string; paidAmount?: number }) =>
    fetchAPI<{ success: boolean; invoice: unknown }>(`/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  postRequest: (payload: { clientId: string; title: string; type?: string; priority?: string }) =>
    fetchAPI<unknown>('/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  postInvoiceSendEmail: (id: string, reminder?: boolean) =>
    fetchAPI<{ success: boolean; sentTo: string }>(`/invoices/${id}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminder ? { reminder: true } : {}),
    }),
  postInvoiceAutoGenerate: () =>
    fetchAPI<{ success: boolean; generated: number; invoices: { client: string; invoiceNumber: string; amount: number }[] }>('/invoices/auto-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  // Content Calendar
  getContentCalendar: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    const qs = params.toString();
    return fetchAPI<ApiContentCalendarResponse>(`/content-calendar${qs ? `?${qs}` : ''}`);
  },
  // Team
  getTeam: () => fetchAPI<{ members: ApiTeamMember[] }>('/team'),
  postTeamMember: (payload: { name: string; role: string; email?: string; phone?: string }) =>
    fetchAPI<{ success: boolean; member: ApiTeamMember }>('/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
  getTeamWorkload: (memberId: string) =>
    fetchAPI<ApiTeamWorkload>(`/team/${memberId}/workload`),

  // Meta Ads OAuth
  getMetaAuthUrl: (clientId: string) =>
    fetchAPI<{ url: string }>(`/meta/auth-url?clientId=${encodeURIComponent(clientId)}`),
  getMetaStatus: (clientId: string) =>
    fetchAPI<{
      connected: boolean;
      status: string;
      adAccountName?: string;
      adAccountId?: string;
      connectedAt?: string;
    }>(`/meta/status/${clientId}`),
  disconnectMeta: (clientId: string) =>
    fetchAPI<{ success: boolean }>(`/meta/disconnect/${clientId}`, { method: "POST" }),
  getMetaAdAccounts: (clientId: string) =>
    fetchAPI<{
      accounts: Array<{ id: string; name: string; status: number }>;
    }>(`/meta/ad-accounts?clientId=${encodeURIComponent(clientId)}`),
  selectMetaAccount: (data: {
    clientId: string;
    adAccountId: string;
    adAccountName: string;
  }) =>
    fetchAPI<{ success: boolean }>("/meta/select-account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
};

export type InvoiceCreatePayload = {
  clientId: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  description?: string;
  type?: string;
  status?: string;
};

export type ApiPaymentsResponse = {
  totalOutstanding: number;
  totalOverdue: number;
  totalDueSoon: number;
  overdueCount: number;
  overdue: { id: string; invoiceNumber: string; amount: number; dueDate: string; daysOverdue?: number; clientName?: string; clientId?: string }[];
  dueSoon: { id: string; invoiceNumber: string; amount: number; dueDate: string; clientName?: string; clientId?: string }[];
  recentlyPaid: { id: string; invoiceNumber: string; amount: number; paidDate: string | null; clientName?: string; clientId?: string }[];
};

export type ApiInvoiceItem = {
  id: string;
  clientId: string;
  client?: { name: string };
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  paidDate?: string | null;
  description?: string | null;
};

export type ApiInvoicesResponse = {
  invoices: ApiInvoiceItem[];
};

// ─── Content Calendar types ──────────────────────────────────────────────────

export type ApiContentCalendarItem = {
  id: string;
  title: string;
  platform: string;
  contentType: string;
  status: string;
  clientName: string;
  clientId: string;
  scheduledDate: string;
  assignedTo: string | null;
};

export type ApiContentCalendarResponse = {
  start: string;
  end: string;
  totalItems: number;
  byDate: Record<string, ApiContentCalendarItem[]>;
  items: ApiContentCalendarItem[];
};

// ─── Team types ─────────────────────────────────────────────────────────────

export type ApiTeamMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
  weeklyCapacity: number;
  notes: string | null;
};

export type ApiTeamWorkload = {
  member: { id: string; name: string; role: string };
  openRequests: number;
  openContent: number;
  requests: ApiRequestItem[];
  content: ApiContentItem[];
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
  slaBreach?: boolean;
  type?: string;
  source?: string;
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
  publishedDate?: string;
  createdAt: string;
  updatedAt: string;
  type?: string;
  contentType?: string;
  source?: string;
  directiveId?: string | null;
};

export type ApiContentResponse = {
  content: ApiContentItem[];
  total: number;
};
