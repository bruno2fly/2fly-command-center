/**
 * Founder Mode mock data
 * TODO: Replace with real API/billing/project data. WhatsApp + 2FlyFlow hooks go here.
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
  cashInDeltaVsLastMonth: number; // % or absolute
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

// ─── Mock data ─────────────────────────────────────────────────────────────

export const MOCK_REVENUE_PULSE: RevenuePulse = {
  cashInThisMonth: 12400,
  cashInDeltaVsLastMonth: 8,
  expectedNext30Days: 18200,
  expectedCount: 7,
  overdue: 3200,
  overdueCount: 1,
  atRiskRevenue: 6700,
  atRiskClientCount: 2,
};

export const MOCK_PRIORITY_ITEMS: PriorityItem[] = [
  {
    id: "p1",
    title: "Chase invoice",
    clientId: "3",
    clientName: "Gamma Inc",
    tags: ["CASH_NOW"],
    dueAt: "2025-02-10",
    isOverdue: true,
    dueToday: false,
    cashImpact: 3200,
    riskLevel: "red",
    source: "Manual",
    assignedTo: "You",
    summary: "Invoice #INV-103 overdue by 6 days. Client has not responded to reminders.",
  },
  {
    id: "p2",
    title: "Send monthly report",
    clientId: "1",
    clientName: "Acme Corp",
    tags: ["STRATEGIC"],
    dueAt: "2025-02-16",
    isOverdue: false,
    dueToday: true,
    cashImpact: 0,
    riskLevel: "green",
    source: "2FlyFlow",
    assignedTo: "You",
    summary: "Q1 report due today. Data is ready, just needs send.",
  },
  {
    id: "p3",
    title: "Approve creatives",
    clientId: "2",
    clientName: "Beta Labs",
    tags: ["PREVENT_FIRE"],
    dueAt: "2025-02-16",
    isOverdue: false,
    dueToday: true,
    cashImpact: 0,
    riskLevel: "yellow",
    source: "WhatsApp",
    assignedTo: "You",
    summary: "Campaign launch blocked until creatives approved. Client waiting 2 days.",
  },
  {
    id: "p4",
    title: "Produce content batch",
    clientId: "3",
    clientName: "Gamma Inc",
    tags: ["PREVENT_FIRE"],
    dueAt: "2025-02-15",
    isOverdue: true,
    dueToday: false,
    cashImpact: 0,
    riskLevel: "red",
    source: "2FlyFlow",
    assignedTo: "Designer",
    summary: "Buffer down to 5 days. Need 3 posts scheduled.",
  },
  {
    id: "p5",
    title: "Call client - renewal",
    clientId: "5",
    clientName: "Epsilon Studio",
    tags: ["CASH_NOW", "STRATEGIC"],
    dueAt: "2025-02-18",
    isOverdue: false,
    dueToday: false,
    cashImpact: 1500,
    riskLevel: "yellow",
    source: "Manual",
    assignedTo: "You",
    summary: "Retainer renews in 2 days. Confirm extension.",
  },
];

export const MOCK_BLOCKERS: BlockerItem[] = [
  { id: "b1", clientName: "Delta Agency", clientId: "4", type: "team", reason: "Hero assets from designer", ageDays: 3 },
  { id: "b2", clientName: "Beta Labs", clientId: "2", type: "client", reason: "Creative approval", ageDays: 2 },
  { id: "b3", clientName: "Gamma Inc", clientId: "3", type: "client", reason: "Payment (invoice overdue)", ageDays: 6 },
  { id: "b4", clientName: "Epsilon Studio", clientId: "5", type: "client", reason: "Content brief", ageDays: 1 },
];

export const MOCK_ACTIVITY: ActivityEvent[] = [
  { id: "a1", type: "whatsapp", clientName: "Beta Labs", clientId: "2", message: "Sent creative options for review", timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString() },
  { id: "a2", type: "invoice_paid", clientName: "Acme Corp", clientId: "1", message: "Invoice $2,500 paid", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
  { id: "a3", type: "approval_requested", clientName: "Gamma Inc", clientId: "3", message: "Monthly report approval needed", timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
  { id: "a4", type: "invoice_overdue", clientName: "Gamma Inc", clientId: "3", message: "Invoice $3,200 overdue 6 days", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
  { id: "a5", type: "ads_alert", clientName: "Delta Agency", clientId: "4", message: "ROAS dropped 15% vs last week", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() },
  { id: "a6", type: "request", clientName: "Epsilon Studio", clientId: "5", message: "New request: Update FAQ page", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
];

export const MOCK_PIPELINE: PipelineSnapshot = {
  leadsThisWeek: 4,
  demosBooked: 2,
  proposalsOut: 1,
  newClientsThisMonth: 1,
  churnRiskCount: 1,
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
