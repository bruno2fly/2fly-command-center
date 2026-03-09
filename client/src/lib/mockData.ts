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
    id: "1",
    name: "Acme Corp",
    contentBufferDays: 21,
    adsRoas: 3.2,
    openRequests: 0,
    websiteBacklog: 1,
    performanceTrend: "up",
  }),
  createClient({
    id: "2",
    name: "Beta Labs",
    contentBufferDays: 10,
    adsRoas: 2.1,
    openRequests: 2,
    websiteBacklog: 4,
    performanceTrend: "flat",
  }),
  createClient({
    id: "3",
    name: "Gamma Inc",
    contentBufferDays: 5,
    adsRoas: 1.1,
    openRequests: 5,
    websiteBacklog: 8,
    performanceTrend: "down",
  }),
  createClient({
    id: "4",
    name: "Delta Agency",
    contentBufferDays: 18,
    adsRoas: 4.0,
    openRequests: 1,
    websiteBacklog: 2,
    performanceTrend: "up",
  }),
  createClient({
    id: "5",
    name: "Epsilon Studio",
    contentBufferDays: 8,
    adsRoas: null,
    openRequests: 3,
    websiteBacklog: 6,
    performanceTrend: "flat",
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
