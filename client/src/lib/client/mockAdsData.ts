/**
 * Mock data for Meta Ads tab: KPIs, AI agent actions, campaigns (with ad sets/ads), alerts.
 * Tailored for beauty/spa industry (The Shape SPA Miami).
 */

export type AgentActionStatus = "pending" | "approved" | "rejected" | "auto_applied";
export type AgentType =
  | "budget_optimizer"
  | "audience_expander"
  | "creative_suggester"
  | "bid_adjuster";

export type AgentAction = {
  id: string;
  clientId: string;
  agentType: AgentType;
  action: string;
  reasoning: string;
  status: AgentActionStatus;
  impact?: { metric: string; currentValue: number; projectedValue: number };
  campaignId: string;
  campaignName: string;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type AdsAlertEnhanced = {
  id: string;
  clientId: string;
  message: string;
  severity: "urgent" | "insight" | "warning" | "positive";
  aiGenerated: boolean;
  actionLabel?: string;
  createdAt: string;
};

export type AdsCampaignEnhanced = {
  id: string;
  clientId: string;
  name: string;
  dailyBudget: number;
  spend: number;
  roas: number;
  cpa: number;
  ctr: number;
  conversions: number;
  status: "active" | "paused" | "completed" | "learning";
  trendData: number[];
  adSets?: AdsAdSet[];
};

export type AdsAdSet = {
  id: string;
  campaignId: string;
  name: string;
  spend: number;
  roas: number;
  status: string;
  ads?: AdsAd[];
};

export type AdsAd = {
  id: string;
  adSetId: string;
  name: string;
  spend: number;
  roas: number;
  status: string;
};

export type AdsKPIData = {
  spend: number;
  spendBudget: number;
  spendPacedPct: number;
  spendTrend: number[];
  roas: number;
  roasTrend: string;
  roasTrendDir: "up" | "down" | "flat";
  cpa: number;
  cpaTrend: string;
  ctr: number;
  ctrTrend: string;
  conversions: number;
  conversionsTrend: string;
};

export type SpendDataPoint = { date: string; spend: number };
export type RoasByCampaign = { name: string; roas: number };
export type ConversionDataPoint = { date: string; conversions: number };

const MOCK_IDS = new Set(["1", "2", "3", "4", "5"]);

function withClientId<T extends { clientId: string; id: string }>(items: T[], clientId: string): T[] {
  return items.map((i) => ({ ...i, id: `${i.id}-fb-${clientId.slice(0, 8)}`, clientId }));
}

// —— AI Agent Actions ——
const MOCK_AGENT_ACTIONS: AgentAction[] = [
  {
    id: "aa1",
    clientId: "1",
    agentType: "budget_optimizer",
    action: "Agent suggests increasing daily budget on 'Spring 2025 - Prospecting' from $80 → $120 based on strong ROAS trend (+12% WoW).",
    reasoning: "Retargeting ROAS at 5.1x is outperforming. Prospecting has room to scale. CPMs stable. Recommend 50% budget increase to capture demand.",
    status: "pending",
    impact: { metric: "ROAS", currentValue: 3.2, projectedValue: 3.5 },
    campaignId: "c1",
    campaignName: "Spring 2025 - Prospecting",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  },
  {
    id: "aa2",
    clientId: "1",
    agentType: "creative_suggester",
    action: "Agent recommends rotating out Ad #2 (Landing hero) — CTR dropped 15% over 7 days. Test new creative from UGC pool.",
    reasoning: "Ad fatigue detected. Same creative shown 40k+ times. CTR decline correlates with frequency. Fresh creative typically lifts CTR 8-12%.",
    status: "approved",
    impact: { metric: "CTR", currentValue: 1.2, projectedValue: 1.4 },
    campaignId: "c1",
    campaignName: "Spring 2025 - Prospecting",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    reviewedAt: new Date(Date.now() - 3600000).toISOString(),
    reviewedBy: "me",
  },
  {
    id: "aa3",
    clientId: "1",
    agentType: "audience_expander",
    action: "Agent suggests adding lookalike 3-5% audience to Retargeting — similar clients see 20% lower CPA on LAL expansion.",
    reasoning: "Current retargeting limited to 1-2% LAL. Lookalike 3-5% expands reach with minimal quality loss. Beauty/spa vertical shows strong LAL performance.",
    status: "pending",
    impact: { metric: "CPA", currentValue: 42, projectedValue: 35 },
    campaignId: "c2",
    campaignName: "Retargeting - Web Visitors",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    reviewedAt: null,
    reviewedBy: null,
  },
  {
    id: "aa4",
    clientId: "1",
    agentType: "bid_adjuster",
    action: "Agent auto-applied bid adjustment: +10% on mobile for Retargeting (mobile converts 1.3x desktop).",
    reasoning: "Mobile ROAS 4.2x vs desktop 3.1x. Device report shows mobile underdelivering on budget. Bid adjustment to capture mobile intent.",
    status: "auto_applied",
    impact: { metric: "Mobile ROAS", currentValue: 4.2, projectedValue: 4.6 },
    campaignId: "c2",
    campaignName: "Retargeting - Web Visitors",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    reviewedAt: new Date(Date.now() - 86400000).toISOString(),
    reviewedBy: "system",
  },
];

// —— Enhanced Alerts ——
const MOCK_ADS_ALERTS_ENHANCED: AdsAlertEnhanced[] = [
  {
    id: "ae1",
    clientId: "1",
    message: "Agent suggests increasing daily budget on 'Spring 2025 - Prospecting' from $80 → $120 based on strong ROAS trend.",
    severity: "insight",
    aiGenerated: true,
    actionLabel: "Increase Budget",
    createdAt: new Date().toISOString(),
  },
  {
    id: "ae2",
    clientId: "1",
    message: "Prospecting spend pacing 5% under – consider increasing to hit monthly target.",
    severity: "warning",
    aiGenerated: false,
    actionLabel: "Adjust Budget",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "ae3",
    clientId: "1",
    message: "ROAS +12% WoW – retargeting performing well. Keep current creative mix.",
    severity: "positive",
    aiGenerated: true,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

// —— Enhanced Campaigns with ad sets and ads ——
const MOCK_ADS_CAMPAIGNS_ENHANCED: AdsCampaignEnhanced[] = [
  {
    id: "c1",
    clientId: "1",
    name: "Spring 2025 - Prospecting",
    dailyBudget: 80,
    spend: 2400,
    roas: 3.2,
    cpa: 38,
    ctr: 1.4,
    conversions: 63,
    status: "learning",
    trendData: [2.8, 2.9, 3.0, 3.1, 3.2, 3.3, 3.2],
    adSets: [
      {
        id: "as1",
        campaignId: "c1",
        name: "Prospecting - Broad",
        spend: 1600,
        roas: 3.2,
        status: "active",
        ads: [
          { id: "ad1", adSetId: "as1", name: "Ad #1 - Prospess", spend: 600, roas: 3.3, status: "active" },
          { id: "ad2", adSetId: "as1", name: "Ad #2 - Landing hero", spend: 550, roas: 3.0, status: "active" },
          { id: "ad3", adSetId: "as1", name: "Ad #3 - Landing hero", spend: 450, roas: 3.4, status: "active" },
        ],
      },
    ],
  },
  {
    id: "c2",
    clientId: "1",
    name: "Retargeting - Web Visitors",
    dailyBudget: 40,
    spend: 800,
    roas: 5.1,
    cpa: 28,
    ctr: 2.1,
    conversions: 29,
    status: "active",
    trendData: [4.8, 4.9, 5.0, 5.1, 5.2, 5.1, 5.1],
    adSets: [
      {
        id: "as2",
        campaignId: "c2",
        name: "Retargeting - 30d",
        spend: 800,
        roas: 5.1,
        status: "active",
        ads: [
          { id: "ad4", adSetId: "as2", name: "Ad #4 - Testimonial", spend: 400, roas: 5.3, status: "active" },
          { id: "ad5", adSetId: "as2", name: "Ad #5 - Offer", spend: 400, roas: 4.9, status: "active" },
        ],
      },
    ],
  },
  {
    id: "c3",
    clientId: "1",
    name: "Winter Sale - Conv",
    dailyBudget: 0,
    spend: 1200,
    roas: 2.9,
    cpa: 52,
    ctr: 4.2,
    conversions: 23,
    status: "completed",
    trendData: [2.7, 2.8, 2.9, 2.9],
  },
];

// —— KPI data ——
const MOCK_ADS_KPI: AdsKPIData = {
  spend: 4400,
  spendBudget: 6000,
  spendPacedPct: 73,
  spendTrend: [3800, 3950, 4100, 4200, 4300, 4350, 4400],
  roas: 3.8,
  roasTrend: "+12% WoW",
  roasTrendDir: "up",
  cpa: 35,
  cpaTrend: "-8%",
  ctr: 1.8,
  ctrTrend: "+5%",
  conversions: 92,
  conversionsTrend: "+15%",
};

// —— Chart data ——
const MOCK_SPEND_OVER_TIME: SpendDataPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (29 - i));
  return {
    date: d.toISOString().slice(0, 10),
    spend: 120 + Math.sin(i / 5) * 40 + i * 2 + Math.random() * 30,
  };
});

const MOCK_ROAS_BY_CAMPAIGN: RoasByCampaign[] = [
  { name: "Retargeting - Web Visitors", roas: 5.1 },
  { name: "Spring 2025 - Prospecting", roas: 3.2 },
  { name: "Winter Sale - Conv", roas: 2.9 },
];

const MOCK_CONVERSIONS_OVER_TIME: ConversionDataPoint[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (13 - i));
  return {
    date: d.toISOString().slice(0, 10),
    conversions: Math.floor(5 + Math.random() * 4 + i * 0.3),
  };
});

// —— Getters ——
export function getAgentActions(clientId: string): AgentAction[] {
  const effectiveId = MOCK_IDS.has(clientId) ? clientId : "1";
  return MOCK_AGENT_ACTIONS.filter((a) => a.clientId === effectiveId)
    .map((a) => (clientId !== effectiveId ? { ...a, clientId } : a))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAdsAlertsEnhanced(clientId: string): AdsAlertEnhanced[] {
  const effectiveId = MOCK_IDS.has(clientId) ? clientId : "1";
  return MOCK_ADS_ALERTS_ENHANCED.filter((a) => a.clientId === effectiveId)
    .map((a) => (clientId !== effectiveId ? { ...a, id: `${a.id}-fb-${clientId.slice(0, 8)}`, clientId } : a))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAdsCampaignsEnhanced(clientId: string): AdsCampaignEnhanced[] {
  const effectiveId = MOCK_IDS.has(clientId) ? clientId : "1";
  return MOCK_ADS_CAMPAIGNS_ENHANCED.filter((c) => c.clientId === effectiveId).map((c) =>
    clientId !== effectiveId ? { ...c, id: `${c.id}-fb-${clientId.slice(0, 8)}`, clientId } : c
  );
}

export function getAdsKPIData(clientId: string): AdsKPIData {
  return { ...MOCK_ADS_KPI };
}

export function getSpendOverTime(clientId: string): SpendDataPoint[] {
  return MOCK_SPEND_OVER_TIME;
}

export function getRoasByCampaign(clientId: string): RoasByCampaign[] {
  return MOCK_ROAS_BY_CAMPAIGN;
}

export function getConversionsOverTime(clientId: string): ConversionDataPoint[] {
  return MOCK_CONVERSIONS_OVER_TIME;
}
