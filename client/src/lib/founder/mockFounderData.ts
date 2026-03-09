/**
 * Founder Mode mock data — Real 2FLY clients
 * Overridden by API when backend is live. Falls back to these.
 */

export type ClientSummary = {
  id: string;
  name: string;
  statusColor: "green" | "yellow" | "red";
  monthlyValue: number;
};

export type PriorityTag = "CASH_NOW" | "PREVENT_FIRE" | "STRATEGIC";
export type RiskLevel = "green" | "yellow" | "red";
export type ActivityType =
  | "whatsapp"
  | "request"
  | "approval_requested"
  | "approval_approved"
  | "invoice_overdue"
  | "invoice_paid"
  | "ads_alert";

export type PriorityItem = {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  tags: PriorityTag[];
  dueAt: string;
  isOverdue: boolean;
  dueToday: boolean;
  cashImpact: number;
  riskLevel: RiskLevel;
  source: "WhatsApp" | "2FlyFlow" | "Manual";
  assignedTo: string;
  summary: string;
};

export type BlockerItem = {
  id: string;
  clientName: string;
  clientId: string;
  type: "team" | "client";
  reason: string;
  ageDays: number;
};

export type ActivityEvent = {
  id: string;
  type: ActivityType;
  clientName: string;
  clientId: string;
  message: string;
  timestamp: string; // ISO
};

export type RevenuePulse = {
  cashInThisMonth: number;
  cashInDeltaVsLastMonth: number;
  expectedNext30Days: number;
  expectedCount: number;
  overdue: number;
  overdueCount: number;
  atRiskRevenue: number;
  atRiskClientCount: number;
};

export type PipelineSnapshot = {
  leadsThisWeek: number;
  demosBooked: number;
  proposalsOut: number;
  newClientsThisMonth: number;
  churnRiskCount: number;
};

// Real client IDs
const SHAPE_MIAMI = "cmmil114j0001j2tq80ty6zag";
const SHAPE_FLL = "cmmil114l0002j2tq3in1w0iz";
const SUDBURY = "cmmil114m0003j2tq5q9mgpg4";
const PRO_FORTUNA = "cmmil114m0004j2tqluvp06lw";
const CASA_NOVA = "cmmil114n0005j2tqy0k2trgm";
const ARDAN = "cmmil114n0006j2tqy2ewcrd6";
const THIS_IS_IT = "cmmil114o0007j2tq9mxw9a7x";
const SUPER_CRISP = "cmmil114o0008j2tq3sviv4ed";
const HAFIZA = "cmmil114p0009j2tqcmy06xrz";
const CRISTIANE = "cmmil114p000aj2tq2hhn6euo";

// ─── Mock data ─────────────────────────────────────────────────────────────

export const MOCK_REVENUE_PULSE: RevenuePulse = {
  cashInThisMonth: 9300,
  cashInDeltaVsLastMonth: 0,
  expectedNext30Days: 9300,
  expectedCount: 10,
  overdue: 2500,
  overdueCount: 2,
  atRiskRevenue: 3100,
  atRiskClientCount: 2,
};

export const MOCK_PRIORITY_ITEMS: PriorityItem[] = [
  {
    id: "p1",
    title: "Chase retainer payment",
    clientId: ARDAN,
    clientName: "Ardan Med Spa",
    tags: ["CASH_NOW"],
    dueAt: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10),
    isOverdue: true,
    dueToday: false,
    cashImpact: 1300,
    riskLevel: "red",
    source: "Manual",
    assignedTo: "You",
    summary: "March retainer invoice overdue 6 days. Follow up with Ana.",
  },
  {
    id: "p2",
    title: "Review content batch",
    clientId: CASA_NOVA,
    clientName: "Casa Nova",
    tags: ["PREVENT_FIRE"],
    dueAt: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    isOverdue: true,
    dueToday: false,
    cashImpact: 0,
    riskLevel: "red",
    source: "2FlyFlow",
    assignedTo: "Designer",
    summary: "Content batch 2 days overdue. 4 posts need review before scheduling.",
  },
  {
    id: "p3",
    title: "Approve ad creatives",
    clientId: SHAPE_MIAMI,
    clientName: "The Shape SPA Miami",
    tags: ["PREVENT_FIRE"],
    dueAt: new Date().toISOString().slice(0, 10),
    isOverdue: false,
    dueToday: true,
    cashImpact: 0,
    riskLevel: "yellow",
    source: "WhatsApp",
    assignedTo: "You",
    summary: "New ad creatives for body sculpting campaign. Grace waiting for approval.",
  },
  {
    id: "p4",
    title: "Send monthly report",
    clientId: SUPER_CRISP,
    clientName: "Super Crisp",
    tags: ["STRATEGIC"],
    dueAt: new Date().toISOString().slice(0, 10),
    isOverdue: false,
    dueToday: true,
    cashImpact: 0,
    riskLevel: "green",
    source: "2FlyFlow",
    assignedTo: "You",
    summary: "March performance report for Emily. Data ready, needs send.",
  },
  {
    id: "p5",
    title: "Fix website hero section",
    clientId: THIS_IS_IT,
    clientName: "This is it Brazil",
    tags: ["PREVENT_FIRE"],
    dueAt: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10),
    isOverdue: true,
    dueToday: false,
    cashImpact: 0,
    riskLevel: "yellow",
    source: "Manual",
    assignedTo: "You",
    summary: "Hero section needs update for new product line. Julianna requested last week.",
  },
];

export const MOCK_BLOCKERS: BlockerItem[] = [
  { id: "b1", clientName: "Super Crisp", clientId: SUPER_CRISP, type: "team", reason: "Designer: menu update graphics", ageDays: 3 },
  { id: "b2", clientName: "The Shape SPA Miami", clientId: SHAPE_MIAMI, type: "client", reason: "Creative approval from Grace", ageDays: 2 },
  { id: "b3", clientName: "Ardan Med Spa", clientId: ARDAN, type: "client", reason: "Payment (retainer overdue)", ageDays: 6 },
  { id: "b4", clientName: "Casa Nova", clientId: CASA_NOVA, type: "client", reason: "Content brief approval", ageDays: 1 },
];

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: "a1", type: "whatsapp", clientName: "The Shape SPA Miami", clientId: SHAPE_MIAMI, message: "Grace sent new photos for social media", timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString() },
  { id: "a2", type: "invoice_paid", clientName: "Sudbury Point Grill", clientId: SUDBURY, message: "Invoice $700 paid — March retainer", timestamp: new Date(Date.now() - 1000 * 60 * 47).toISOString() },
  { id: "a3", type: "approval_requested", clientName: "Pro Fortuna", clientId: PRO_FORTUNA, message: "Website copy approval needed", timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "a4", type: "invoice_overdue", clientName: "Ardan Med Spa", clientId: ARDAN, message: "Invoice $1,300 overdue 6 days", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: "a5", type: "ads_alert", clientName: "Super Crisp", clientId: SUPER_CRISP, message: "Ad spend pacing 15% under budget this week", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: "a6", type: "request", clientName: "Hafiza", clientId: HAFIZA, message: "New request: Update service menu on website", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
];

export const MOCK_PIPELINE: PipelineSnapshot = {
  leadsThisWeek: 2,
  demosBooked: 1,
  proposalsOut: 0,
  newClientsThisMonth: 0,
  churnRiskCount: 0,
};

/** Sort priorities by: cashImpact desc, dueToday first, risk (red>yellow>green), overdue first */
export function sortPriorities(items: PriorityItem[]): PriorityItem[] {
  const riskOrder = { red: 0, yellow: 1, green: 2 };
  return [...items].sort((a, b) => {
    if (a.cashImpact !== b.cashImpact) return b.cashImpact - a.cashImpact;
    if (a.dueToday !== b.dueToday) return a.dueToday ? -1 : 1;
    if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
    return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
  });
}

/** Execution column types for Daily Execution Board */
export type ExecutionColumn = "fire" | "cash" | "delivery";

export type ExecutionItem = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  context: string;
  impactTag: PriorityTag;
  column: ExecutionColumn;
  source: string;
};

/** Bucket priority items into Fire / Cash Impact / Delivery. Max 5 per column. */
export function getExecutionItems(priorities: PriorityItem[]): {
  fire: ExecutionItem[];
  cash: ExecutionItem[];
  delivery: ExecutionItem[];
} {
  const fire: ExecutionItem[] = [];
  const cash: ExecutionItem[] = [];
  const delivery: ExecutionItem[] = [];

  const sorted = sortPriorities(priorities);

  for (const p of sorted) {
    const item: ExecutionItem = {
      id: p.id,
      clientId: p.clientId,
      clientName: p.clientName,
      title: p.title,
      context: p.summary,
      impactTag: p.tags[0] ?? "STRATEGIC",
      source: p.source,
      column: "fire",
    };

    if (p.isOverdue || p.riskLevel === "red" || p.tags.includes("PREVENT_FIRE")) {
      item.column = "fire";
      if (fire.length < 5) fire.push(item);
    } else if (p.cashImpact > 0 || p.tags.includes("CASH_NOW")) {
      item.column = "cash";
      if (cash.length < 5) cash.push(item);
    } else {
      item.column = "delivery";
      if (delivery.length < 5) delivery.push(item);
    }
  }

  return { fire, cash, delivery };
}

/** Momentum stats for execution dashboard */
export type MomentumStats = {
  completedToday: number;
  completedThisWeek: number;
  streak: number;
};

export const MOCK_MOMENTUM: MomentumStats = {
  completedToday: 3,
  completedThisWeek: 12,
  streak: 4,
};

// ─── Focus Mode selectors ───────────────────────────────────────────────────

/** Get the single highest-priority item (for NowCard) */
export function getTopPriority(items: PriorityItem[]): PriorityItem | null {
  const sorted = sortPriorities(items);
  return sorted[0] ?? null;
}

/** Get the next N items after the top priority (for NextQueue) */
export function getNextItems(items: PriorityItem[], count = 3): PriorityItem[] {
  const sorted = sortPriorities(items);
  return sorted.slice(1, 1 + count);
}

/** Get the N most recent incoming activity events */
export function getIncoming(events: ActivityEvent[], count = 3): ActivityEvent[] {
  return [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, count);
}
