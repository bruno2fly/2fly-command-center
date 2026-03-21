/**
 * 2FLY Flow Sync Service
 * 
 * Authenticates to api.2flyflow.com and pulls real production data:
 * - Portal state (approvals, requests, KPIs, activity)
 * - Production tasks (designer workflow)
 * - Scheduled posts
 * 
 * Data is cached in memory with TTL to avoid hammering the API.
 */

const FLOW_API = process.env.FLOW_API_URL || 'https://api.2flyflow.com';
const FLOW_EMAIL = process.env.FLOW_EMAIL || '';
const FLOW_PASSWORD = process.env.FLOW_PASSWORD || '';
const FLOW_AGENCY_ID = process.env.FLOW_AGENCY_ID || '';
const FLOW_TOKEN = process.env.FLOW_TOKEN || ''; // Pre-authenticated JWT (optional, skips login)
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let sessionToken: string | null = FLOW_TOKEN || null;
let tokenExpiresAt = FLOW_TOKEN ? Date.now() + 6 * 24 * 60 * 60 * 1000 : 0; // 6 days if pre-set

// In-memory cache
const cache: Record<string, { data: unknown; expiresAt: number }> = {};

function getCached<T>(key: string): T | null {
  const entry = cache[key];
  if (entry && entry.expiresAt > Date.now()) return entry.data as T;
  return null;
}

function setCache(key: string, data: unknown, ttl = CACHE_TTL_MS) {
  cache[key] = { data, expiresAt: Date.now() + ttl };
}

/**
 * Authenticate to 2FLY Flow API and get a session token
 */
async function authenticate(): Promise<string> {
  if (sessionToken && tokenExpiresAt > Date.now()) return sessionToken;

  if (!FLOW_EMAIL || !FLOW_PASSWORD || !FLOW_AGENCY_ID) {
    throw new Error('2FLY Flow credentials not configured (FLOW_EMAIL, FLOW_PASSWORD, FLOW_AGENCY_ID)');
  }

  const res = await fetch(`${FLOW_API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: FLOW_EMAIL,
      password: FLOW_PASSWORD,
      agencyId: FLOW_AGENCY_ID,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Flow auth failed (${res.status}): ${err}`);
  }

  // Extract JWT from Set-Cookie header
  const cookies = res.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find(c => c.startsWith('2fly_session='));
  if (sessionCookie) {
    sessionToken = sessionCookie.split('=')[1].split(';')[0];
  } else {
    // Fallback: check response body
    const body = await res.json() as { token?: string };
    sessionToken = body.token || null;
  }

  if (!sessionToken) throw new Error('No session token received from Flow');

  // Token valid for 23 hours (refresh before 24h expiry)
  tokenExpiresAt = Date.now() + 23 * 60 * 60 * 1000;
  console.log('[FLOW-SYNC] Authenticated to 2FLY Flow API');
  return sessionToken;
}

/**
 * Make an authenticated request to 2FLY Flow API
 */
async function flowFetch<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
  const token = await authenticate();
  const fetchOpts: RequestInit = {
    method: options?.method || 'GET',
    headers: {
      'Cookie': `2fly_session=${token}`,
      'Authorization': `Bearer ${token}`,
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(options?.body ? { body: JSON.stringify(options.body) } : {}),
  };
  const res = await fetch(`${FLOW_API}${path}`, fetchOpts);

  if (!res.ok) {
    // If 401, clear token and retry once
    if (res.status === 401) {
      sessionToken = null;
      tokenExpiresAt = 0;
      const retryToken = await authenticate();
      const retryRes = await fetch(`${FLOW_API}${path}`, {
        ...fetchOpts,
        headers: {
          ...fetchOpts.headers as Record<string, string>,
          'Cookie': `2fly_session=${retryToken}`,
          'Authorization': `Bearer ${retryToken}`,
        },
      });
      if (!retryRes.ok) throw new Error(`Flow API error (${retryRes.status}): ${await retryRes.text()}`);
      return retryRes.json() as Promise<T>;
    }
    throw new Error(`Flow API error (${res.status}): ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

// ─── Public API ──────────────────────────────────────────

export interface FlowPortalState {
  client: { id: string; name: string; whatsapp?: string; logoUrl?: string };
  kpis: { scheduled: number; waitingApproval: number; missingAssets: number; frustration: number };
  approvals: Array<{
    id: string;
    contentId?: string;
    title?: string;
    caption?: string;
    status: string;
    media?: string[];
    type?: string;
    createdAt?: string;
    updatedAt?: string;
  }>;
  needs: unknown[];
  requests: Array<{
    id: string;
    text?: string;
    type?: string;
    status?: string;
    files?: string[];
    createdAt?: string;
  }>;
  assets: unknown[];
  activity: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
}

export interface FlowProductionTask {
  id: string;
  clientId: string;
  contentId: string;
  designerId: string;
  title: string;
  caption: string;
  copyText: string;
  status: string;
  priority: string;
  deadline: string;
  finalArt: string[];
  comments?: Array<{ id: string; authorName: string; message: string; createdAt: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface FlowScheduledPost {
  id: string;
  clientId: string;
  caption: string;
  mediaUrl: string;
  platforms: string[];
  scheduledAt: string;
  status: string;
  publishedAt?: string;
  error?: string;
}

export interface FlowClient {
  id: string;
  name: string;
  status: string;
  category?: string;
  primaryContactName?: string;
  primaryContactEmail?: string;
  platformsManaged?: string[];
}

/**
 * Get all clients from 2FLY Flow
 */
export async function getFlowClients(): Promise<FlowClient[]> {
  const cached = getCached<FlowClient[]>('flow:clients');
  if (cached) return cached;

  const raw = await flowFetch<{ success?: boolean; clients?: FlowClient[] } | FlowClient[]>('/api/agency/clients');
  const clients = Array.isArray(raw) ? raw : ((raw as { clients?: FlowClient[] }).clients || []);
  setCache('flow:clients', clients);
  return clients;
}

/**
 * Get portal state for a specific Flow client
 */
export async function getFlowPortalState(flowClientId: string): Promise<FlowPortalState | null> {
  const cacheKey = `flow:portal:${flowClientId}`;
  const cached = getCached<FlowPortalState>(cacheKey);
  if (cached) return cached;

  try {
    const raw = await flowFetch<{ success?: boolean; data?: FlowPortalState; portalState?: FlowPortalState } & FlowPortalState>(
      `/api/agency/portal-state?clientId=${flowClientId}`
    );
    // API wraps in { success, data } or { portalState } or direct
    const state = raw.data || raw.portalState || (raw.client ? raw as FlowPortalState : null);
    if (state) setCache(cacheKey, state);
    return state;
  } catch {
    return null;
  }
}

/**
 * Get production tasks for a specific Flow client
 */
export async function getFlowTasks(flowClientId: string): Promise<FlowProductionTask[]> {
  const cacheKey = `flow:tasks:${flowClientId}`;
  const cached = getCached<FlowProductionTask[]>(cacheKey);
  if (cached) return cached;

  const data = await flowFetch<FlowProductionTask[] | { tasks: FlowProductionTask[] }>(
    `/api/production/tasks?clientId=${flowClientId}`
  );
  const tasks = Array.isArray(data) ? data : (data.tasks || []);
  setCache(cacheKey, tasks);
  return tasks;
}

/**
 * Get scheduled posts for a specific Flow client
 */
export async function getFlowScheduledPosts(flowClientId: string): Promise<FlowScheduledPost[]> {
  const cacheKey = `flow:posts:${flowClientId}`;
  const cached = getCached<FlowScheduledPost[]>(cacheKey);
  if (cached) return cached;

  const data = await flowFetch<FlowScheduledPost[] | { posts: FlowScheduledPost[] }>(
    `/api/posts/scheduled?clientId=${flowClientId}`
  );
  const posts = Array.isArray(data) ? data : (data.posts || []);
  setCache(cacheKey, posts);
  return posts;
}

/**
 * Get complete Flow data for a client (portal state + tasks + posts)
 */
export async function getFlowClientData(flowClientId: string) {
  const [portalState, tasks, scheduledPosts] = await Promise.all([
    getFlowPortalState(flowClientId),
    getFlowTasks(flowClientId),
    getFlowScheduledPosts(flowClientId),
  ]);

  return { portalState, tasks, scheduledPosts };
}

/**
 * Clear all cached data (force fresh fetch)
 */
export function clearFlowCache() {
  Object.keys(cache).forEach(k => delete cache[k]);
  console.log('[FLOW-SYNC] Cache cleared');
}

/**
 * Check if Flow sync is configured
 */
export function isFlowConfigured(): boolean {
  return !!(FLOW_TOKEN || (FLOW_EMAIL && FLOW_PASSWORD && FLOW_AGENCY_ID));
}

/**
 * Create a production task in 2FLY Flow
 */
export async function createFlowTask(task: {
  clientId: string;
  title: string;
  caption: string;
  copyText?: string;
  briefNotes?: string;
  designerId: string;
  priority?: string;
  deadline?: string;
}) {
  return flowFetch<{ success: boolean; task: unknown }>('/api/production/tasks', {
    method: 'POST',
    body: task,
  });
}

/**
 * Get Flow team members (designers + staff, exclude owner and disabled)
 */
export async function getFlowTeam() {
  const cacheKey = 'flow:team';
  const cached = getCache<Array<{ id: string; name: string; email: string; role: string }>>(cacheKey);
  if (cached) return cached;

  try {
    const data = await flowFetch<{ users: Array<{ id: string; name: string; email: string; role: string; status: string }> }>('/api/users');
    const ROLE_LABELS: Record<string, string> = {
      'user_1771827214531_oazrbl0': 'SOCIAL_MEDIA', // Milena — admin account but role is social media manager
    };
    const NAME_OVERRIDES: Record<string, string> = {
      'user_1771827214531_oazrbl0': 'Milena',
    };
    const team = (data.users || [])
      .filter(u => u.status === 'ACTIVE' && u.role !== 'CLIENT')
      .map(u => ({
        id: u.id,
        name: NAME_OVERRIDES[u.id] || u.name,
        email: u.email,
        role: ROLE_LABELS[u.id] || u.role,
      }));
    setCache(cacheKey, team);
    return team;
  } catch {
    return [];
  }
}
