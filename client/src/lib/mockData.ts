import {
  getContentBufferStatus,
  getAdsHealthStatus,
  getRequestsStatus,
  getBacklogStatus,
  getPerformanceTrendStatus,
  getOverallStatus,
  type Status,
} from "./statusLogic";

export type Client = {
  id: string;
  name: string;
  contentBufferDays: number;
  adsRoas: number | null;
  openRequests: number;
  websiteBacklog: number;
  performanceTrend: "up" | "flat" | "down";
  monthlyRetainer?: number | null;
  // Computed
  contentBufferStatus: Status;
  adsHealthStatus: Status;
  requestsStatus: Status;
  backlogStatus: Status;
  performanceStatus: Status;
  overallStatus: Status;
};

export type ClientRaw = {
  id: string;
  name: string;
  contentBufferDays: number;
  adsRoas: number | null;
  openRequests: number;
  websiteBacklog: number;
  performanceTrend: "up" | "flat" | "down";
  monthlyRetainer?: number | null;
};

export function createClient(raw: ClientRaw): Client {
  const contentBufferStatus = getContentBufferStatus(raw.contentBufferDays);
  const adsHealthStatus = getAdsHealthStatus(raw.adsRoas);
  const requestsStatus = getRequestsStatus(raw.openRequests);
  const backlogStatus = getBacklogStatus(raw.websiteBacklog);
  const performanceStatus = getPerformanceTrendStatus(raw.performanceTrend);
  const overallStatus = getOverallStatus([
    contentBufferStatus,
    adsHealthStatus,
    requestsStatus,
    backlogStatus,
    performanceStatus,
  ]);

  return {
    ...raw,
    contentBufferStatus,
    adsHealthStatus,
    requestsStatus,
    backlogStatus,
    performanceStatus,
    overallStatus,
  };
}

export const MOCK_CLIENTS: Client[] = [
  createClient({
    id: "cmmil114j0001j2tq80ty6zag",
    name: "The Shape SPA Miami",
    contentBufferDays: 12,
    adsRoas: 2.8,
    openRequests: 2,
    websiteBacklog: 1,
    performanceTrend: "up",
    monthlyRetainer: 500,
  }),
  createClient({
    id: "cmmil114l0002j2tq3in1w0iz",
    name: "The Shape Spa FLL",
    contentBufferDays: 12,
    adsRoas: 2.5,
    openRequests: 1,
    websiteBacklog: 0,
    performanceTrend: "flat",
    monthlyRetainer: 500,
  }),
  createClient({
    id: "cmmil114m0003j2tq5q9mgpg4",
    name: "Sudbury Point Grill",
    contentBufferDays: 14,
    adsRoas: null,
    openRequests: 2,
    websiteBacklog: 2,
    performanceTrend: "flat",
    monthlyRetainer: 700,
  }),
  createClient({
    id: "cmmil114m0004j2tqluvp06lw",
    name: "Pro Fortuna",
    contentBufferDays: 10,
    adsRoas: null,
    openRequests: 3,
    websiteBacklog: 3,
    performanceTrend: "flat",
    monthlyRetainer: 1000,
  }),
  createClient({
    id: "cmmil114n0005j2tqy0k2trgm",
    name: "Casa Nova",
    contentBufferDays: 8,
    adsRoas: null,
    openRequests: 4,
    websiteBacklog: 2,
    performanceTrend: "flat",
    monthlyRetainer: 1200,
  }),
  createClient({
    id: "cmmil114n0006j2tqy2ewcrd6",
    name: "Ardan Med Spa",
    contentBufferDays: 10,
    adsRoas: 3.2,
    openRequests: 2,
    websiteBacklog: 1,
    performanceTrend: "up",
    monthlyRetainer: 1300,
  }),
  createClient({
    id: "cmmil114o0007j2tq9mxw9a7x",
    name: "This is it Brazil",
    contentBufferDays: 12,
    adsRoas: null,
    openRequests: 2,
    websiteBacklog: 4,
    performanceTrend: "flat",
    monthlyRetainer: 1100,
  }),
  createClient({
    id: "cmmil114o0008j2tq3sviv4ed",
    name: "Super Crisp",
    contentBufferDays: 15,
    adsRoas: 2.1,
    openRequests: 1,
    websiteBacklog: 1,
    performanceTrend: "up",
    monthlyRetainer: 1400,
  }),
  createClient({
    id: "cmmil114p0009j2tqcmy06xrz",
    name: "Hafiza",
    contentBufferDays: 12,
    adsRoas: null,
    openRequests: 1,
    websiteBacklog: 0,
    performanceTrend: "flat",
    monthlyRetainer: 800,
  }),
  createClient({
    id: "cmmil114p000aj2tq2hhn6euo",
    name: "Cristiane Amorim",
    contentBufferDays: 12,
    adsRoas: null,
    openRequests: 1,
    websiteBacklog: 0,
    performanceTrend: "flat",
    monthlyRetainer: 800,
  }),
];

// Detail page mock data
export const MOCK_CONTENT_PIPELINE = [
  { id: "c1", title: "Q1 Campaign Launch", scheduled: "2025-02-20", status: "scheduled" },
  { id: "c2", title: "Product Demo Reel", scheduled: "2025-02-22", status: "draft" },
  { id: "c3", title: "Testimonial Series", scheduled: "2025-02-25", status: "scheduled" },
];

export const MOCK_REQUESTS = [
  { id: "r1", title: "Update hero image", createdAt: "2025-02-10", status: "open" },
  { id: "r2", title: "Add new CTA", createdAt: "2025-02-12", status: "open" },
];

export const MOCK_ADS_SUMMARY = {
  roas: 2.8,
  spend: 12500,
  revenue: 35000,
  topPerformer: "Retargeting - Lookalike",
};

export const MOCK_WEBSITE_BACKLOG = [
  { id: "b1", task: "Fix mobile nav", priority: "high" },
  { id: "b2", task: "Add schema markup", priority: "medium" },
  { id: "b3", task: "Update FAQ page", priority: "low" },
];
