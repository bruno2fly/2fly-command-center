/**
 * Mock data for client tab sections: Tasks, Requests, Plan, Ads, Content.
 */

// Minimal client name map for ads resolution (full map in mockClientControlData)
const MOCK_CLIENT_NAMES: Record<string, string> = {
  "1": "Acme Corp",
  "2": "Beta Labs",
  "3": "Gamma Inc",
  "4": "Delta Agency",
  "5": "Epsilon Studio",
  "cmmil114j0001j2tq80ty6zag": "The Shape SPA Miami",
  "cmmil114l0002j2tq3in1w0iz": "The Shape Spa FLL",
  "cmmil114m0003j2tq5q9mgpg4": "Sudbury Point Grill",
  "cmmil114m0004j2tqluvp06lw": "Pro Fortuna",
  "cmmil114n0005j2tqy0k2trgm": "Casa Nova",
  "cmmil114n0006j2tqy2ewcrd6": "Ardan Med Spa",
  "cmmil114o0007j2tq9mxw9a7x": "This is it Brazil",
  "cmmil114o0008j2tq3sviv4ed": "Super Crisp",
  "cmmil114p0009j2tqcmy06xrz": "Hafiza",
  "cmmil114p000aj2tq2hhn6euo": "Cristiane Amorim",
};

// —— Tasks & Requests ——

export type RequestStage = "new" | "in_review" | "in_progress" | "done";

export type RequestItem = {
  id: string;
  clientId: string;
  title: string;
  stage: RequestStage;
  source: string;
  createdAt: string;
  dueAt: string | null;
};

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";

export type TaskItem = {
  id: string;
  clientId: string;
  title: string;
  status: TaskStatus;
  assignee: string;
  dueAt: string | null;
  priority: "high" | "medium" | "low";
};

// —— Client Plan ——

export type ClientGoal = {
  id: string;
  clientId: string;
  text: string;
  status: "active" | "achieved" | "paused";
  targetDate: string | null;
};

export type RoadmapItem = {
  id: string;
  clientId: string;
  title: string;
  quarter: string;
  status: "planned" | "in_progress" | "done";
};

export type ClientKpi = {
  id: string;
  clientId: string;
  name: string;
  value: string;
  trend: "up" | "down" | "flat";
  target?: string;
};

// —— Ads ——

export type AdsCampaign = {
  id: string;
  clientId: string;
  name: string;
  spend: number;
  roas: number;
  status: "active" | "paused" | "completed";
};

export type AdsAlert = {
  id: string;
  clientId: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
};

// —— Content ——

export type ContentCalendarItem = {
  id: string;
  clientId: string;
  title: string;
  date: string;
  type: "post" | "video" | "story" | "ad";
  status: "draft" | "scheduled" | "review" | "published";
};

export type ContentPipelineItem = {
  id: string;
  clientId: string;
  title: string;
  stage: "ideation" | "creation" | "review" | "scheduled";
};

export type ContentIdea = {
  id: string;
  clientId: string;
  text: string;
  source: string;
  createdAt: string;
};

// —— Getters ——
// Fallback: API clients (CUIDs) get mock data from client "1" until backend endpoints exist.
const MOCK_IDS = new Set(["1", "2", "3", "4", "5"]);

function withClientId<T extends { clientId: string; id: string }>(items: T[], clientId: string): T[] {
  return items.map((i) => ({ ...i, id: `${i.id}-fb-${clientId.slice(0, 8)}`, clientId }));
}

export function getRequests(clientId: string): RequestItem[] {
  if (MOCK_IDS.has(clientId)) return MOCK_REQUESTS.filter((r) => r.clientId === clientId);
  return withClientId(MOCK_REQUESTS.filter((r) => r.clientId === "1"), clientId);
}

export function getTasks(clientId: string): TaskItem[] {
  if (MOCK_IDS.has(clientId)) return MOCK_TASKS.filter((t) => t.clientId === clientId);
  return withClientId(MOCK_TASKS.filter((t) => t.clientId === "1"), clientId);
}

export function getGoals(clientId: string): ClientGoal[] {
  if (MOCK_IDS.has(clientId)) return MOCK_GOALS.filter((g) => g.clientId === clientId);
  return withClientId(MOCK_GOALS.filter((g) => g.clientId === "1"), clientId);
}

export function getRoadmap(clientId: string): RoadmapItem[] {
  if (MOCK_IDS.has(clientId)) return MOCK_ROADMAP.filter((r) => r.clientId === clientId);
  return withClientId(MOCK_ROADMAP.filter((r) => r.clientId === "1"), clientId);
}

export function getKpis(clientId: string): ClientKpi[] {
  if (MOCK_IDS.has(clientId)) return MOCK_KPIS.filter((k) => k.clientId === clientId);
  return withClientId(MOCK_KPIS.filter((k) => k.clientId === "1"), clientId);
}

// Clients with active Meta ads (by name match since IDs change on reseed)
const CLIENTS_WITH_ADS = new Set([
  "The Shape SPA Miami",
  "The Shape Spa FLL",
  "Ardan Med Spa",
  "Super Crisp",
]);

// Map client names to ad profile data
const CLIENT_AD_PROFILES: Record<string, { spend: number; roasTrend: string; campaigns: AdsCampaign[]; alerts: AdsAlert[] }> = {
  "The Shape SPA Miami": {
    spend: 1250,
    roasTrend: "+8% WoW",
    campaigns: [
      { id: "c-sm1", clientId: "", name: "Body Sculpting - Leads", spend: 650, roas: 3.8, status: "active" },
      { id: "c-sm2", clientId: "", name: "Retargeting - IG Engagers", spend: 350, roas: 5.2, status: "active" },
      { id: "c-sm3", clientId: "", name: "New Client Promo", spend: 250, roas: 2.9, status: "paused" },
    ],
    alerts: [
      { id: "a-sm1", clientId: "", message: "ROAS 3.8x on body sculpting campaign — above 3.0 target", severity: "info", createdAt: new Date().toISOString() },
    ],
  },
  "The Shape Spa FLL": {
    spend: 1100,
    roasTrend: "+5% WoW",
    campaigns: [
      { id: "c-sf1", clientId: "", name: "Fort Lauderdale Awareness", spend: 600, roas: 2.5, status: "active" },
      { id: "c-sf2", clientId: "", name: "Service Highlight - Leads", spend: 500, roas: 3.1, status: "active" },
    ],
    alerts: [],
  },
  "Ardan Med Spa": {
    spend: 800,
    roasTrend: "+12% WoW",
    campaigns: [
      { id: "c-ar1", clientId: "", name: "Spring 2026 - Prospecting", spend: 450, roas: 3.2, status: "active" },
      { id: "c-ar2", clientId: "", name: "Retargeting - Web Visitors", spend: 350, roas: 5.1, status: "active" },
    ],
    alerts: [
      { id: "a-ar1", clientId: "", message: "ROAS +12% WoW — retargeting performing well. Keep current creative mix.", severity: "info", createdAt: new Date().toISOString() },
      { id: "a-ar2", clientId: "", message: "Prospecting spend pacing 5% under — consider increasing to hit monthly target", severity: "warning", createdAt: new Date().toISOString() },
    ],
  },
  "Super Crisp": {
    spend: 750,
    roasTrend: "-3% WoW",
    campaigns: [
      { id: "c-sc1", clientId: "", name: "Menu Launch - Local Reach", spend: 400, roas: 2.1, status: "active" },
      { id: "c-sc2", clientId: "", name: "Weekend Specials - Traffic", spend: 350, roas: 1.8, status: "active" },
    ],
    alerts: [
      { id: "a-sc1", clientId: "", message: "Weekend Specials CTR dropped 15% — consider refreshing creative", severity: "warning", createdAt: new Date().toISOString() },
    ],
  },
};

// Resolve client name from mock names map
function getClientNameById(clientId: string): string {
  return MOCK_CLIENT_NAMES[clientId] ?? "";
}

function hasActiveAds(clientId: string): boolean {
  const name = getClientNameById(clientId);
  return CLIENTS_WITH_ADS.has(name);
}

export function getAdsCampaigns(clientId: string): AdsCampaign[] {
  if (MOCK_IDS.has(clientId)) return MOCK_ADS_CAMPAIGNS.filter((c) => c.clientId === clientId);
  const name = getClientNameById(clientId);
  const profile = CLIENT_AD_PROFILES[name];
  if (!profile) return [];
  return profile.campaigns.map(c => ({ ...c, clientId }));
}

export function getAdsAlerts(clientId: string): AdsAlert[] {
  if (MOCK_IDS.has(clientId)) return MOCK_ADS_ALERTS.filter((a) => a.clientId === clientId);
  const name = getClientNameById(clientId);
  const profile = CLIENT_AD_PROFILES[name];
  if (!profile) return [];
  return profile.alerts.map(a => ({ ...a, clientId }));
}

export function getAdsSummary(clientId: string): { spend: number; roasTrend: string } | null {
  if (MOCK_ADS_SUMMARY[clientId]) return MOCK_ADS_SUMMARY[clientId];
  const name = getClientNameById(clientId);
  const profile = CLIENT_AD_PROFILES[name];
  if (!profile) return null; // No ads for this client
  return { spend: profile.spend, roasTrend: profile.roasTrend };
}

export function getContentCalendar(clientId: string): ContentCalendarItem[] {
  if (MOCK_IDS.has(clientId)) return MOCK_CONTENT_CALENDAR.filter((c) => c.clientId === clientId);
  return withClientId(MOCK_CONTENT_CALENDAR.filter((c) => c.clientId === "1"), clientId);
}

export function getContentPipeline(clientId: string): ContentPipelineItem[] {
  if (MOCK_IDS.has(clientId)) return MOCK_CONTENT_PIPELINE.filter((p) => p.clientId === clientId);
  return withClientId(MOCK_CONTENT_PIPELINE.filter((p) => p.clientId === "1"), clientId);
}

export function getContentIdeas(clientId: string): ContentIdea[] {
  if (MOCK_IDS.has(clientId)) return MOCK_CONTENT_IDEAS.filter((i) => i.clientId === clientId);
  return withClientId(MOCK_CONTENT_IDEAS.filter((i) => i.clientId === "1"), clientId);
}

// —— Mock Data ——

const MOCK_REQUESTS: RequestItem[] = [
  { id: "r1", clientId: "1", title: "Hero image update for new product", stage: "in_progress", source: "WhatsApp", createdAt: "2025-02-15T09:30:00Z", dueAt: "2025-02-18" },
  { id: "r2", clientId: "1", title: "Ad copy approval: Spring campaign", stage: "in_review", source: "2FlyFlow", createdAt: "2025-02-15T08:00:00Z", dueAt: "2025-02-16" },
  { id: "r3", clientId: "1", title: "Add Book a Demo CTA on landing page", stage: "new", source: "2FlyFlow", createdAt: "2025-02-13T16:00:00Z", dueAt: null },
  { id: "r4", clientId: "1", title: "Fix contact form submissions", stage: "in_progress", source: "WhatsApp", createdAt: "2025-02-14T11:20:00Z", dueAt: "2025-02-16" },
];

const MOCK_TASKS: TaskItem[] = [
  { id: "t1", clientId: "1", title: "Fix contact form submissions", status: "in_progress", assignee: "me", dueAt: "2025-02-16", priority: "high" },
  { id: "t2", clientId: "1", title: "Approve Spring campaign ad copy", status: "todo", assignee: "me", dueAt: "2025-02-16", priority: "medium" },
  { id: "t3", clientId: "1", title: "Update hero image for new product", status: "todo", assignee: "team", dueAt: "2025-02-18", priority: "high" },
  { id: "t4", clientId: "1", title: "Follow up on overdue invoice #1023", status: "todo", assignee: "me", dueAt: "2025-02-15", priority: "high" },
  { id: "t5", clientId: "1", title: "Create Q2 content calendar", status: "backlog", assignee: "team", dueAt: null, priority: "medium" },
];

const MOCK_GOALS: ClientGoal[] = [
  { id: "g1", clientId: "1", text: "Increase MQL conversion rate by 20%", status: "active", targetDate: "2025-06-30" },
  { id: "g2", clientId: "1", text: "Launch UGC campaign for new product", status: "active", targetDate: "2025-03-15" },
  { id: "g3", clientId: "1", text: "Achieve 3.5x ROAS on paid media", status: "achieved", targetDate: "2025-01-31" },
];

const MOCK_ROADMAP: RoadmapItem[] = [
  { id: "rm1", clientId: "1", title: "Q1: Spring campaign launch", quarter: "Q1 2025", status: "in_progress" },
  { id: "rm2", clientId: "1", title: "Q2: UGC + lookalike tests", quarter: "Q2 2025", status: "planned" },
  { id: "rm3", clientId: "1", title: "Q3: Podcast ads pilot", quarter: "Q3 2025", status: "planned" },
];

const MOCK_KPIS: ClientKpi[] = [
  { id: "k1", clientId: "1", name: "MQLs", value: "42", trend: "up", target: "50" },
  { id: "k2", clientId: "1", name: "ROAS", value: "3.8x", trend: "up", target: "3.5x" },
  { id: "k3", clientId: "1", name: "Content delivery", value: "98%", trend: "flat", target: "100%" },
];

const MOCK_ADS_CAMPAIGNS: AdsCampaign[] = [
  { id: "c1", clientId: "1", name: "Spring 2025 - Prospecting", spend: 2400, roas: 3.2, status: "active" },
  { id: "c2", clientId: "1", name: "Retargeting - Web Visitors", spend: 800, roas: 5.1, status: "active" },
  { id: "c3", clientId: "1", name: "Winter Sale - Conv", spend: 1200, roas: 2.9, status: "completed" },
];

const MOCK_ADS_ALERTS: AdsAlert[] = [
  { id: "a1", clientId: "1", message: "ROAS +12% WoW – retargeting performing well", severity: "info", createdAt: "2025-02-15T10:00:00Z" },
  { id: "a2", clientId: "1", message: "Prospecting spend pacing 5% under – consider increasing", severity: "warning", createdAt: "2025-02-14T18:00:00Z" },
];

const MOCK_ADS_SUMMARY: Record<string, { spend: number; roasTrend: string }> = {
  "1": { spend: 4400, roasTrend: "+12% WoW" },
};

const MOCK_CONTENT_CALENDAR: ContentCalendarItem[] = [
  { id: "cc1", clientId: "1", title: "Spring launch post", date: "2025-03-10", type: "post", status: "scheduled" },
  { id: "cc2", clientId: "1", title: "Product demo reel", date: "2025-03-11", type: "video", status: "draft" },
  { id: "cc3", clientId: "1", title: "UGC testimonial", date: "2025-03-12", type: "story", status: "draft" },
  { id: "cc4", clientId: "1", title: "Spring ad creatives", date: "2025-03-09", type: "ad", status: "review" },
  { id: "cc5", clientId: "2", title: "Brand refresh announcement", date: "2025-03-10", type: "post", status: "scheduled" },
  { id: "cc6", clientId: "2", title: "Behind-the-scenes reel", date: "2025-03-13", type: "video", status: "draft" },
  { id: "cc7", clientId: "3", title: "Product drop teaser", date: "2025-03-11", type: "story", status: "review" },
  { id: "cc8", clientId: "3", title: "Retargeting ad set", date: "2025-03-14", type: "ad", status: "scheduled" },
];

const MOCK_CONTENT_PIPELINE: ContentPipelineItem[] = [
  { id: "cp1", clientId: "1", title: "Product demo reel", stage: "creation" },
  { id: "cp2", clientId: "1", title: "UGC testimonial", stage: "ideation" },
  { id: "cp3", clientId: "1", title: "Spring launch post", stage: "scheduled" },
  { id: "cp4", clientId: "1", title: "Case study: Acme x 2Fly", stage: "review" },
];

const MOCK_CONTENT_IDEAS: ContentIdea[] = [
  { id: "ci1", clientId: "1", text: "UGC campaign for new product launch", source: "Brain", createdAt: "2025-02-13T10:00:00Z" },
  { id: "ci2", clientId: "1", text: "Behind-the-scenes at product shoot", source: "Client", createdAt: "2025-02-11T14:00:00Z" },
  { id: "ci3", clientId: "1", text: "Customer success story – Sarah", source: "Team", createdAt: "2025-02-09T09:00:00Z" },
];
