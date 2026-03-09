/**
 * Mock data for client tab sections: Tasks, Requests, Plan, Ads, Content.
 */

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

export function getRequests(clientId: string): RequestItem[] {
  return MOCK_REQUESTS.filter((r) => r.clientId === clientId);
}

export function getTasks(clientId: string): TaskItem[] {
  return MOCK_TASKS.filter((t) => t.clientId === clientId);
}

export function getGoals(clientId: string): ClientGoal[] {
  return MOCK_GOALS.filter((g) => g.clientId === clientId);
}

export function getRoadmap(clientId: string): RoadmapItem[] {
  return MOCK_ROADMAP.filter((r) => r.clientId === clientId);
}

export function getKpis(clientId: string): ClientKpi[] {
  return MOCK_KPIS.filter((k) => k.clientId === clientId);
}

export function getAdsCampaigns(clientId: string): AdsCampaign[] {
  return MOCK_ADS_CAMPAIGNS.filter((c) => c.clientId === clientId);
}

export function getAdsAlerts(clientId: string): AdsAlert[] {
  return MOCK_ADS_ALERTS.filter((a) => a.clientId === clientId);
}

export function getAdsSummary(clientId: string): { spend: number; roasTrend: string } | null {
  return MOCK_ADS_SUMMARY[clientId] ?? null;
}

export function getContentCalendar(clientId: string): ContentCalendarItem[] {
  return MOCK_CONTENT_CALENDAR.filter((c) => c.clientId === clientId);
}

export function getContentPipeline(clientId: string): ContentPipelineItem[] {
  return MOCK_CONTENT_PIPELINE.filter((p) => p.clientId === clientId);
}

export function getContentIdeas(clientId: string): ContentIdea[] {
  return MOCK_CONTENT_IDEAS.filter((i) => i.clientId === clientId);
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
  { id: "cc1", clientId: "1", title: "Spring launch post", date: "2025-02-18", type: "post", status: "scheduled" },
  { id: "cc2", clientId: "1", title: "Product demo reel", date: "2025-02-20", type: "video", status: "draft" },
  { id: "cc3", clientId: "1", title: "UGC testimonial", date: "2025-02-22", type: "story", status: "draft" },
  { id: "cc4", clientId: "1", title: "Spring ad creatives", date: "2025-02-16", type: "ad", status: "review" },
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
