/**
 * Client Control Room – data types and mock data.
 * Swap data sources here when integrating WhatsApp / 2FlyFlow / APIs.
 */

export type InboxSource = "whatsapp" | "2flyflow" | "manual";
export type InboxTag = "urgent" | "approval" | "payment" | "content" | "ads" | "support";

export type InboxItem = {
  id: string;
  clientId: string;
  source: InboxSource;
  type: string;
  summary: string;
  body: string;
  tags: InboxTag[];
  createdAt: string;
  priority: "high" | "medium" | "low";
  suggestedAction?: string;
};

export type ClientHealth = {
  websiteStatus: "up" | "down" | "unknown";
  websiteLastChecked: string;
  formsOk: boolean;
  adsStatus: "ok" | "alert" | "unknown";
  adsPacing: string;
  adsRoasTrend: string;
  paymentStatus: "paid" | "overdue" | "pending";
  paymentDaysOverdue?: number;
  deliveryStatus: "ok" | "at_risk" | "late";
  deliveryBufferDays: number;
  missedPromises: number;
};

export type ControlItemKind = "action" | "blocker" | "approval";
export type ImpactTag = "cash_now" | "prevent_fire" | "strategic";

export type ControlItem = {
  id: string;
  clientId: string;
  title: string;
  kind: ControlItemKind;
  owner: string;
  dueAt: string | null;
  impactTag?: ImpactTag;
  status: string;
  linkedInboxId?: string;
};

export type NoteItem = {
  id: string;
  clientId: string;
  text: string;
  createdAt: string;
  author: string;
};

export type IdeaItem = {
  id: string;
  clientId: string;
  text: string;
  tag: "content" | "offer" | "ads" | "ops";
  createdAt: string;
};

export type InsightItem = {
  id: string;
  clientId: string;
  text: string;
  createdAt: string;
};

export type ClientControlMeta = {
  clientId: string;
  lastDelivery: string | null;
  nextPromiseDate: string | null;
  monthlyRetainer: number | null;
};

// —— Mock data ——
// Known mock client IDs (legacy). API clients use CUIDs — they get fallback data below.
const MOCK_IDS = new Set(["1", "2", "3", "4", "5"]);

function getFallbackInbox(clientId: string): InboxItem[] {
  return MOCK_INBOX.filter((i) => i.clientId === "1").map((i) => ({
    ...i,
    id: `${i.id}-fb-${clientId.slice(0, 8)}`,
    clientId,
  }));
}

function getFallbackHealth(clientId: string): ClientHealth {
  return {
    ...MOCK_HEALTH["1"]!,
    websiteLastChecked: new Date().toISOString(),
  };
}

function getFallbackControl(clientId: string): ControlItem[] {
  return MOCK_CONTROL.filter((i) => i.clientId === "1").map((i) => ({
    ...i,
    id: `${i.id}-fb-${clientId.slice(0, 8)}`,
    clientId,
    linkedInboxId: undefined,
  }));
}

function getFallbackNotes(clientId: string): NoteItem[] {
  return MOCK_NOTES.filter((n) => n.clientId === "1")
    .map((n) => ({ ...n, id: `${n.id}-fb-${clientId.slice(0, 8)}`, clientId }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getFallbackIdeas(clientId: string): IdeaItem[] {
  return MOCK_IDEAS.filter((i) => i.clientId === "1")
    .map((i) => ({ ...i, id: `${i.id}-fb-${clientId.slice(0, 8)}`, clientId }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function getFallbackInsights(clientId: string): InsightItem[] {
  return MOCK_INSIGHTS.filter((i) => i.clientId === "1").map((i) => ({
    ...i,
    id: `${i.id}-fb-${clientId.slice(0, 8)}`,
    clientId,
  }));
}

function getFallbackMeta(clientId: string): ClientControlMeta {
  const base = MOCK_META["1"]!;
  return { ...base, clientId };
}

export function getInboxItems(clientId: string): InboxItem[] {
  if (MOCK_IDS.has(clientId)) {
    return MOCK_INBOX.filter((i) => i.clientId === clientId);
  }
  return getFallbackInbox(clientId);
}

export function getClientHealth(clientId: string): ClientHealth | null {
  if (MOCK_HEALTH[clientId]) return MOCK_HEALTH[clientId];
  return getFallbackHealth(clientId);
}

export function getControlItems(clientId: string): ControlItem[] {
  if (MOCK_IDS.has(clientId)) {
    return MOCK_CONTROL.filter((i) => i.clientId === clientId);
  }
  return getFallbackControl(clientId);
}

export function getNotes(clientId: string): NoteItem[] {
  if (MOCK_IDS.has(clientId)) {
    return MOCK_NOTES.filter((n) => n.clientId === clientId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return getFallbackNotes(clientId);
}

export function getIdeas(clientId: string): IdeaItem[] {
  if (MOCK_IDS.has(clientId)) {
    return MOCK_IDEAS.filter((i) => i.clientId === clientId).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }
  return getFallbackIdeas(clientId);
}

export function getInsights(clientId: string): InsightItem[] {
  if (MOCK_IDS.has(clientId)) {
    return MOCK_INSIGHTS.filter((i) => i.clientId === clientId);
  }
  return getFallbackInsights(clientId);
}

export function getClientControlMeta(clientId: string): ClientControlMeta | null {
  if (MOCK_META[clientId]) return MOCK_META[clientId];
  return getFallbackMeta(clientId);
}

// —— Overview tab ——

export type BriefOfTheDay = {
  clientId: string;
  text: string;
  agentName: string;
  updatedAt: string;
};

export type ContentQualityOverview = {
  clientId: string;
  text: string;
  agentName: string;
  updatedAt: string;
};

export type TwoFlyFlowOverview = {
  clientId: string;
  pendingApproval: number;
  pendingPosts: number;
  items: Array<{ id: string; title: string; stage: string; source: string }>;
};

const MOCK_BRIEF: Record<string, BriefOfTheDay> = {
  "1": {
    clientId: "1",
    text: "Acme is in good shape overall. Spring campaign is live and performing well (+12% WoW). Main focus today: (1) Invoice #1023 is 6d overdue – follow up with client. (2) Ad copy approval for Spring campaign pending – client requested minor tweaks. (3) Hero image update for new product – design in progress, due Thu. (4) Contact form bug reported – dev is investigating. Content buffer at 21 days. No blockers.",
    agentName: "Sarah",
    updatedAt: "2025-03-09T08:00:00Z",
  },
  "2": {
    clientId: "2",
    text: "Beta Labs: Ads pacing under target (-5% WoW). Content buffer at 10 days – at risk. Two posts in 2FlyFlow awaiting approval. Client happy with Q1 direction.",
    agentName: "Sarah",
    updatedAt: "2025-03-09T08:00:00Z",
  },
};

const MOCK_CONTENT_QUALITY: Record<string, ContentQualityOverview> = {
  "1": {
    clientId: "1",
    text: "Content pipeline healthy. 4 items in production: Spring launch post (scheduled), Product demo reel (draft), UGC testimonial (draft), Spring ad creatives (in review). Calendar is filled through mid-March. UGC campaign for new product is the main theme – client loves the direction. No quality issues.",
    agentName: "Sarah",
    updatedAt: "2025-03-09T08:00:00Z",
  },
};

function getFallbackBrief(clientId: string): BriefOfTheDay {
  const b = MOCK_BRIEF["1"]!;
  return { ...b, clientId };
}

function getFallbackContentQuality(clientId: string): ContentQualityOverview {
  const c = MOCK_CONTENT_QUALITY["1"]!;
  return { ...c, clientId };
}

export function getBriefOfTheDay(clientId: string): BriefOfTheDay | null {
  if (MOCK_BRIEF[clientId]) return MOCK_BRIEF[clientId];
  return getFallbackBrief(clientId);
}

export function getContentQualityOverview(clientId: string): ContentQualityOverview | null {
  if (MOCK_CONTENT_QUALITY[clientId]) return MOCK_CONTENT_QUALITY[clientId];
  return getFallbackContentQuality(clientId);
}

export function get2FlyFlowOverview(clientId: string): TwoFlyFlowOverview {
  const effectiveId = MOCK_IDS.has(clientId) ? clientId : "1";
  const inbox = MOCK_INBOX.filter((i) => i.clientId === effectiveId && i.source === "2flyflow");
  const approvals = MOCK_CONTROL.filter((i) => i.clientId === effectiveId && i.kind === "approval");

  const items = [
    ...inbox.map((i) => ({ id: i.id, title: i.summary, stage: i.type === "approval" ? "Awaiting approval" : "Request", source: "2FlyFlow" })),
    ...approvals.map((i) => ({ id: i.id, title: i.title, stage: "Awaiting approval", source: "2FlyFlow" })),
  ];
  const pendingApproval = items.filter((i) => i.stage === "Awaiting approval").length;
  const pendingPosts = items.length;

  return {
    clientId,
    pendingApproval,
    pendingPosts,
    items,
  };
}

/** Global alerts (urgent inbox + blockers) for command bar */
export function getGlobalAlerts(): Array<{ id: string; title: string; clientName: string; clientId: string; kind: "inbox" | "blocker" }> {
  const fromInbox = MOCK_INBOX.filter((i) => i.tags.includes("urgent")).map((i) => ({
    id: i.id,
    title: i.summary,
    clientName: MOCK_CLIENT_NAMES[i.clientId] ?? "Unknown",
    clientId: i.clientId,
    kind: "inbox" as const,
  }));
  const fromBlockers = MOCK_CONTROL.filter((i) => i.kind === "blocker").map((i) => ({
    id: i.id,
    title: i.title,
    clientName: MOCK_CLIENT_NAMES[i.clientId] ?? "Unknown",
    clientId: i.clientId,
    kind: "blocker" as const,
  }));
  return [...fromInbox, ...fromBlockers];
}

/** Global approvals for command bar */
export function getGlobalApprovals(): Array<{ id: string; title: string; clientName: string; clientId: string }> {
  const fromInbox = MOCK_INBOX.filter((i) => i.tags.includes("approval")).map((i) => ({
    id: i.id,
    title: i.summary,
    clientName: MOCK_CLIENT_NAMES[i.clientId] ?? "Unknown",
    clientId: i.clientId,
  }));
  const fromControl = MOCK_CONTROL.filter((i) => i.kind === "approval").map((i) => ({
    id: i.id,
    title: i.title,
    clientName: MOCK_CLIENT_NAMES[i.clientId] ?? "Unknown",
    clientId: i.clientId,
  }));
  const seen = new Set<string>();
  return [...fromInbox, ...fromControl].filter((a) => {
    const key = `${a.clientId}:${a.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const MOCK_CLIENT_NAMES: Record<string, string> = {
  "1": "Acme Corp",
  "2": "Beta Labs",
  "3": "Gamma Inc",
  "4": "Delta Agency",
  "5": "Epsilon Studio",
};

const MOCK_INBOX: InboxItem[] = [
  {
    id: "in1",
    clientId: "1",
    source: "whatsapp",
    type: "message",
    summary: "Need hero image update for new product",
    body: "Hi team – can we update the hero image on the homepage to feature the new product launch? Need it by Thursday.",
    tags: ["content", "urgent"],
    createdAt: "2025-02-15T09:30:00Z",
    priority: "high",
    suggestedAction: "Create content task + schedule design",
  },
  {
    id: "in2",
    clientId: "1",
    source: "2flyflow",
    type: "approval",
    summary: "Ad copy approval: Spring campaign",
    body: "Please review and approve the ad copy for the Spring campaign. 3 variants attached.",
    tags: ["approval", "ads"],
    createdAt: "2025-02-15T08:00:00Z",
    priority: "medium",
    suggestedAction: "Approve or request changes",
  },
  {
    id: "in3",
    clientId: "1",
    source: "manual",
    type: "payment",
    summary: "Invoice #1023 overdue – reminder sent",
    body: "Invoice #1023 for $4,500 is 6 days overdue. Payment link resent to client.",
    tags: ["payment", "urgent"],
    createdAt: "2025-02-14T14:00:00Z",
    priority: "high",
    suggestedAction: "Follow up with client",
  },
  {
    id: "in4",
    clientId: "1",
    source: "whatsapp",
    type: "message",
    summary: "Forms on contact page not submitting",
    body: "Customers say the contact form isn't working. Can someone check?",
    tags: ["support", "urgent"],
    createdAt: "2025-02-14T11:20:00Z",
    priority: "high",
    suggestedAction: "Debug forms + test submissions",
  },
  {
    id: "in5",
    clientId: "1",
    source: "2flyflow",
    type: "request",
    summary: "New CTA for landing page",
    body: "Add 'Book a Demo' CTA above the fold on the main landing page.",
    tags: ["content"],
    createdAt: "2025-02-13T16:00:00Z",
    priority: "medium",
    suggestedAction: "Create website task",
  },
];

const MOCK_HEALTH: Record<string, ClientHealth> = {
  "1": {
    websiteStatus: "up",
    websiteLastChecked: "2025-02-15T10:00:00Z",
    formsOk: false,
    adsStatus: "ok",
    adsPacing: "On track",
    adsRoasTrend: "+12% WoW",
    paymentStatus: "overdue",
    paymentDaysOverdue: 6,
    deliveryStatus: "ok",
    deliveryBufferDays: 21,
    missedPromises: 0,
  },
  "2": {
    websiteStatus: "up",
    websiteLastChecked: "2025-02-15T09:00:00Z",
    formsOk: true,
    adsStatus: "alert",
    adsPacing: "Under",
    adsRoasTrend: "-5% WoW",
    paymentStatus: "paid",
    deliveryStatus: "at_risk",
    deliveryBufferDays: 10,
    missedPromises: 0,
  },
  "3": {
    websiteStatus: "up",
    websiteLastChecked: "2025-02-15T08:30:00Z",
    formsOk: true,
    adsStatus: "alert",
    adsPacing: "On track",
    adsRoasTrend: "-15% WoW",
    paymentStatus: "paid",
    deliveryStatus: "at_risk",
    deliveryBufferDays: 5,
    missedPromises: 1,
  },
  "4": {
    websiteStatus: "up",
    websiteLastChecked: "2025-02-15T10:00:00Z",
    formsOk: true,
    adsStatus: "ok",
    adsPacing: "On track",
    adsRoasTrend: "+8% WoW",
    paymentStatus: "paid",
    deliveryStatus: "ok",
    deliveryBufferDays: 18,
    missedPromises: 0,
  },
  "5": {
    websiteStatus: "unknown",
    websiteLastChecked: "2025-02-14T12:00:00Z",
    formsOk: true,
    adsStatus: "unknown",
    adsPacing: "—",
    adsRoasTrend: "—",
    paymentStatus: "pending",
    deliveryStatus: "ok",
    deliveryBufferDays: 8,
    missedPromises: 0,
  },
};

const MOCK_CONTROL: ControlItem[] = [
  {
    id: "c1",
    clientId: "1",
    title: "Fix contact form submissions",
    kind: "action",
    owner: "me",
    dueAt: "2025-02-16",
    impactTag: "prevent_fire",
    status: "in_progress",
    linkedInboxId: "in4",
  },
  {
    id: "c2",
    clientId: "1",
    title: "Approve Spring campaign ad copy",
    kind: "approval",
    owner: "me",
    dueAt: "2025-02-16",
    impactTag: "strategic",
    status: "pending",
    linkedInboxId: "in2",
  },
  {
    id: "c3",
    clientId: "1",
    title: "Follow up on overdue invoice #1023",
    kind: "action",
    owner: "me",
    dueAt: "2025-02-15",
    impactTag: "cash_now",
    status: "pending",
    linkedInboxId: "in3",
  },
  {
    id: "c4",
    clientId: "1",
    title: "Update hero image for new product",
    kind: "action",
    owner: "team",
    dueAt: "2025-02-18",
    impactTag: "strategic",
    status: "pending",
    linkedInboxId: "in1",
  },
  {
    id: "c5",
    clientId: "1",
    title: "Waiting on client: brand assets",
    kind: "blocker",
    owner: "me",
    dueAt: null,
    impactTag: "prevent_fire",
    status: "waiting_on_client",
  },
];

const MOCK_NOTES: NoteItem[] = [
  { id: "n1", clientId: "1", text: "Client loves the Q1 campaign direction. Push for case study.", createdAt: "2025-02-14T15:00:00Z", author: "me" },
  { id: "n2", clientId: "1", text: "Mentioned interest in podcast ads for H2.", createdAt: "2025-02-12T11:00:00Z", author: "me" },
  { id: "n3", clientId: "1", text: "Key contact: Sarah (marketing). Prefers async updates.", createdAt: "2025-02-10T09:00:00Z", author: "me" },
];

const MOCK_IDEAS: IdeaItem[] = [
  { id: "i1", clientId: "1", text: "UGC campaign for new product launch", tag: "content", createdAt: "2025-02-13T10:00:00Z" },
  { id: "i2", clientId: "1", text: "Test lookalike audiences from webinar signups", tag: "ads", createdAt: "2025-02-11T14:00:00Z" },
  { id: "i3", clientId: "1", text: "Bundle offer for Q2 – 20% off retainer + add-ons", tag: "offer", createdAt: "2025-02-09T09:00:00Z" },
];

const MOCK_INSIGHTS: InsightItem[] = [
  { id: "s1", clientId: "1", text: "Client asked for hero update twice this week", createdAt: "2025-02-15T08:00:00Z" },
  { id: "s2", clientId: "1", text: "Approval cycle slower than usual (avg 4.2 days)", createdAt: "2025-02-15T07:00:00Z" },
  { id: "s3", clientId: "1", text: "Ads ROAS up 12% WoW – retargeting performing well", createdAt: "2025-02-15T06:00:00Z" },
  { id: "s4", clientId: "1", text: "Risk: invoice overdue 6 days – $4,500", createdAt: "2025-02-14T18:00:00Z" },
];

const MOCK_META: Record<string, ClientControlMeta> = {
  "1": { clientId: "1", lastDelivery: "2025-02-10", nextPromiseDate: "2025-02-20", monthlyRetainer: 4500 },
  "2": { clientId: "2", lastDelivery: "2025-02-12", nextPromiseDate: "2025-02-18", monthlyRetainer: 3200 },
  "3": { clientId: "3", lastDelivery: "2025-02-01", nextPromiseDate: "2025-02-14", monthlyRetainer: 2800 },
  "4": { clientId: "4", lastDelivery: "2025-02-14", nextPromiseDate: "2025-02-25", monthlyRetainer: 5500 },
  "5": { clientId: "5", lastDelivery: "2025-02-08", nextPromiseDate: "2025-02-22", monthlyRetainer: null },
};
