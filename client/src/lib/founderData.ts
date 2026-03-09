/**
 * Founder Mode data structures and placeholders
 * TODO: Connect to real CRM, billing, project management systems
 */

import type { TaskPriority } from "./founderConfig";
import { CLIENT_MRR } from "./founderConfig";

export type FounderTask = {
  id: string;
  title: string; // verb-first
  clientId: string;
  clientName: string;
  priority: TaskPriority;
  dueDate: string; // ISO date
  isOverdue: boolean;
  isToday: boolean;
};

export type Invoice = {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  dueDate: string;
  status: "overdue" | "due_today" | "expected_today" | "paid" | "upcoming";
};

export type PipelineDeal = {
  id: string;
  name: string;
  clientName: string;
  expectedMrr: number;
  stage: string;
  probability: number; // 0–100
};

export type Bottleneck = {
  id: string;
  clientId: string;
  clientName: string;
  category: "waiting_on_me" | "waiting_on_team" | "waiting_on_client";
  action: string;
};

// Placeholder: Today's 5–10 tasks (verb-first)
export const MOCK_TASKS: FounderTask[] = [
  { id: "t1", title: "Send report", clientId: "1", clientName: "Acme Corp", priority: "STRATEGIC", dueDate: "2025-02-16", isOverdue: false, isToday: true },
  { id: "t2", title: "Chase invoice", clientId: "3", clientName: "Gamma Inc", priority: "CASH_NOW", dueDate: "2025-02-10", isOverdue: true, isToday: false },
  { id: "t3", title: "Approve creatives", clientId: "2", clientName: "Beta Labs", priority: "PREVENT_FIRE", dueDate: "2025-02-16", isOverdue: false, isToday: true },
  { id: "t4", title: "Call client", clientId: "5", clientName: "Epsilon Studio", priority: "STRATEGIC", dueDate: "2025-02-17", isOverdue: false, isToday: false },
  { id: "t5", title: "Produce content", clientId: "3", clientName: "Gamma Inc", priority: "PREVENT_FIRE", dueDate: "2025-02-15", isOverdue: true, isToday: false },
  { id: "t6", title: "Schedule call", clientId: "4", clientName: "Delta Agency", priority: "STRATEGIC", dueDate: "2025-02-16", isOverdue: false, isToday: true },
];

// Placeholder: Invoices
export const MOCK_INVOICES: Invoice[] = [
  { id: "i1", clientId: "3", clientName: "Gamma Inc", amount: 3200, dueDate: "2025-02-05", status: "overdue" },
  { id: "i2", clientId: "1", clientName: "Acme Corp", amount: 2500, dueDate: "2025-02-16", status: "expected_today" },
  { id: "i3", clientId: "5", clientName: "Epsilon Studio", amount: 1500, dueDate: "2025-02-16", status: "due_today" },
];

// Recently paid (for Payments page)
export const MOCK_PAID_INVOICES: Invoice[] = [
  { id: "i4", clientId: "1", clientName: "Acme Corp", amount: 2500, dueDate: "2025-02-01", status: "paid" },
  { id: "i5", clientId: "2", clientName: "Beta Labs", amount: 1800, dueDate: "2025-02-10", status: "paid" },
];

// Placeholder: Pipeline deals
export const MOCK_PIPELINE: PipelineDeal[] = [
  { id: "d1", name: "Retainer expansion", clientName: "Acme Corp", expectedMrr: 800, stage: "Proposal", probability: 70 },
  { id: "d2", name: "New retainer", clientName: "NewCo", expectedMrr: 2200, stage: "Negotiation", probability: 50 },
];

// Placeholder: Bottlenecks
export const MOCK_BOTTLENECKS: Bottleneck[] = [
  { id: "b1", clientId: "1", clientName: "Acme Corp", category: "waiting_on_me", action: "Send report" },
  { id: "b2", clientId: "2", clientName: "Beta Labs", category: "waiting_on_me", action: "Approve creatives" },
  { id: "b3", clientId: "3", clientName: "Gamma Inc", category: "waiting_on_client", action: "Payment (invoice overdue)" },
  { id: "b4", clientId: "4", clientName: "Delta Agency", category: "waiting_on_team", action: "Designer: hero assets" },
  { id: "b5", clientId: "5", clientName: "Epsilon Studio", category: "waiting_on_client", action: "Content brief" },
];

// Client lane fields (extends mockData Client)
export type ClientLane = {
  clientId: string;
  clientName: string;
  health: "green" | "yellow" | "red";
  contentBufferDays: number;
  lastDeliveredDate: string | null;
  nextPromiseDate: string | null;
  unpaidInvoiceAmount: number | null;
  primaryCta: string;
  /** Triage: single most critical signal for sidebar/table */
  urgencySignal?: string;
  /** Count of critical items for badge */
  badgeCount?: number;
};

/** Sum of MRR for clients in yellow or red */
export function getAtRiskMrr(clientIds: string[]): number {
  return clientIds.reduce((sum, id) => sum + (CLIENT_MRR[id] ?? 0), 0);
}
