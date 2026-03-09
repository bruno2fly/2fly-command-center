/**
 * Founder Mode data structures and placeholders
 * Uses real 2FLY client data as defaults — overridden by API when backend is live.
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
  invoiceNumber?: string;
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

// Real client IDs for reference
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

// Fallback tasks — overridden by API /requests data
export const MOCK_TASKS: FounderTask[] = [
  { id: "t1", title: "Review content batch", clientId: ARDAN, clientName: "Ardan Med Spa", priority: "PREVENT_FIRE", dueDate: new Date(Date.now() - 86400000).toISOString().slice(0, 10), isOverdue: true, isToday: false },
  { id: "t2", title: "Chase retainer payment", clientId: CASA_NOVA, clientName: "Casa Nova", priority: "CASH_NOW", dueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), isOverdue: true, isToday: false },
  { id: "t3", title: "Approve ad creatives", clientId: SHAPE_MIAMI, clientName: "The Shape SPA Miami", priority: "PREVENT_FIRE", dueDate: new Date().toISOString().slice(0, 10), isOverdue: false, isToday: true },
  { id: "t4", title: "Send monthly report", clientId: SUPER_CRISP, clientName: "Super Crisp", priority: "STRATEGIC", dueDate: new Date().toISOString().slice(0, 10), isOverdue: false, isToday: true },
  { id: "t5", title: "Content strategy call", clientId: PRO_FORTUNA, clientName: "Pro Fortuna", priority: "STRATEGIC", dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10), isOverdue: false, isToday: false },
  { id: "t6", title: "Update website hero", clientId: THIS_IS_IT, clientName: "This is it Brazil", priority: "PREVENT_FIRE", dueDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), isOverdue: true, isToday: false },
];

// Fallback invoices — overridden by API /payments data
export const MOCK_INVOICES: Invoice[] = [
  { id: "i1", clientId: ARDAN, clientName: "Ardan Med Spa", amount: 1300, dueDate: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), status: "overdue", invoiceNumber: "INV-106" },
  { id: "i2", clientId: CASA_NOVA, clientName: "Casa Nova", amount: 1200, dueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), status: "overdue", invoiceNumber: "INV-105" },
  { id: "i3", clientId: SUPER_CRISP, clientName: "Super Crisp", amount: 1400, dueDate: new Date().toISOString().slice(0, 10), status: "due_today", invoiceNumber: "INV-108" },
  { id: "i4", clientId: SHAPE_MIAMI, clientName: "The Shape SPA Miami", amount: 500, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), status: "upcoming", invoiceNumber: "INV-100" },
  { id: "i5", clientId: SHAPE_FLL, clientName: "The Shape Spa FLL", amount: 500, dueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10), status: "upcoming", invoiceNumber: "INV-101" },
];

// Recently paid (for Payments page)
export const MOCK_PAID_INVOICES: Invoice[] = [
  { id: "i6", clientId: SUDBURY, clientName: "Sudbury Point Grill", amount: 700, dueDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10), status: "paid" },
  { id: "i7", clientId: PRO_FORTUNA, clientName: "Pro Fortuna", amount: 1000, dueDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10), status: "paid" },
  { id: "i8", clientId: HAFIZA, clientName: "Hafiza", amount: 800, dueDate: new Date(Date.now() - 1 * 86400000).toISOString().slice(0, 10), status: "paid" },
];

// Pipeline deals
export const MOCK_PIPELINE: PipelineDeal[] = [
  { id: "d1", name: "Ad management expansion", clientName: "Casa Nova", expectedMrr: 500, stage: "Proposal", probability: 70 },
  { id: "d2", name: "New retainer", clientName: "New Lead", expectedMrr: 1500, stage: "Negotiation", probability: 40 },
];

// Bottlenecks — overridden by API /requests data
export const MOCK_BOTTLENECKS: Bottleneck[] = [
  { id: "b1", clientId: ARDAN, clientName: "Ardan Med Spa", category: "waiting_on_client", action: "Payment (invoice overdue)" },
  { id: "b2", clientId: SHAPE_MIAMI, clientName: "The Shape SPA Miami", category: "waiting_on_me", action: "Approve ad creatives" },
  { id: "b3", clientId: SUPER_CRISP, clientName: "Super Crisp", category: "waiting_on_team", action: "Designer: menu update graphics" },
  { id: "b4", clientId: CASA_NOVA, clientName: "Casa Nova", category: "waiting_on_client", action: "Content brief approval" },
  { id: "b5", clientId: THIS_IS_IT, clientName: "This is it Brazil", category: "waiting_on_me", action: "Send website update proposal" },
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
  urgencySignal?: string;
  badgeCount?: number;
};

/** Sum of MRR for clients in yellow or red */
export function getAtRiskMrr(clientIds: string[]): number {
  return clientIds.reduce((sum, id) => sum + (CLIENT_MRR[id] ?? 0), 0);
}
