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

// ── Client name resolution (resilient to CUID changes) ──
// We fetch names from localStorage cache if available
function resolveClientName(clientId: string): string {
  try {
    const cached = localStorage.getItem("2fly-clients");
    if (cached) {
      const clients = JSON.parse(cached);
      const found = clients.find?.((c: { id: string; name: string }) => c.id === clientId);
      if (found) return found.name;
    }
  } catch {}
  return "";
}

// Only these clients have active Meta ads
const ADS_CLIENT_NAMES = new Set([
  "The Shape SPA Miami",
  "The Shape Spa FLL",
  "Ardan Med Spa",
  "Super Crisp",
]);

function clientHasAds(clientId: string): boolean {
  if (MOCK_IDS.has(clientId)) return true; // legacy mock IDs
  return ADS_CLIENT_NAMES.has(resolveClientName(clientId));
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

// —— Per-client KPI profiles ——
const CLIENT_KPI_PROFILES: Record<string, AdsKPIData> = {
  "The Shape SPA Miami": {
    spend: 1250, spendBudget: 1500, spendPacedPct: 83,
    spendTrend: [1050, 1080, 1120, 1150, 1180, 1220, 1250],
    roas: 3.8, roasTrend: "+8% WoW", roasTrendDir: "up",
    cpa: 32, cpaTrend: "-5%", ctr: 1.9, ctrTrend: "+3%",
    conversions: 39, conversionsTrend: "+10%",
  },
  "The Shape Spa FLL": {
    spend: 1100, spendBudget: 1500, spendPacedPct: 73,
    spendTrend: [900, 940, 980, 1010, 1040, 1070, 1100],
    roas: 2.8, roasTrend: "+5% WoW", roasTrendDir: "up",
    cpa: 41, cpaTrend: "-3%", ctr: 1.5, ctrTrend: "+2%",
    conversions: 27, conversionsTrend: "+8%",
  },
  "Ardan Med Spa": {
    spend: 800, spendBudget: 800, spendPacedPct: 100,
    spendTrend: [680, 700, 720, 740, 760, 780, 800],
    roas: 4.2, roasTrend: "+12% WoW", roasTrendDir: "up",
    cpa: 28, cpaTrend: "-10%", ctr: 2.1, ctrTrend: "+7%",
    conversions: 29, conversionsTrend: "+15%",
  },
  "Super Crisp": {
    spend: 750, spendBudget: 1000, spendPacedPct: 75,
    spendTrend: [800, 790, 780, 770, 760, 755, 750],
    roas: 1.9, roasTrend: "-3% WoW", roasTrendDir: "down",
    cpa: 8, cpaTrend: "+5%", ctr: 2.8, ctrTrend: "-2%",
    conversions: 94, conversionsTrend: "-5%",
  },
};

// Per-client campaign data
const CLIENT_CAMPAIGNS: Record<string, AdsCampaignEnhanced[]> = {
  "The Shape SPA Miami": [
    { id: "c-sm1", clientId: "", name: "Body Sculpting - Leads", dailyBudget: 25, spend: 650, roas: 3.8, cpa: 30, ctr: 2.0, conversions: 22, status: "active", trendData: [3.2, 3.4, 3.5, 3.6, 3.7, 3.8, 3.8] },
    { id: "c-sm2", clientId: "", name: "Retargeting - IG Engagers", dailyBudget: 15, spend: 350, roas: 5.2, cpa: 22, ctr: 2.5, conversions: 16, status: "active", trendData: [4.8, 4.9, 5.0, 5.1, 5.2, 5.2, 5.2] },
    { id: "c-sm3", clientId: "", name: "New Client Promo", dailyBudget: 10, spend: 250, roas: 2.9, cpa: 45, ctr: 1.3, conversions: 6, status: "paused", trendData: [3.1, 3.0, 2.9, 2.9] },
  ],
  "The Shape Spa FLL": [
    { id: "c-sf1", clientId: "", name: "Fort Lauderdale Awareness", dailyBudget: 25, spend: 600, roas: 2.5, cpa: 45, ctr: 1.4, conversions: 13, status: "active", trendData: [2.2, 2.3, 2.4, 2.4, 2.5, 2.5, 2.5] },
    { id: "c-sf2", clientId: "", name: "Service Highlight - Leads", dailyBudget: 20, spend: 500, roas: 3.1, cpa: 36, ctr: 1.7, conversions: 14, status: "active", trendData: [2.8, 2.9, 3.0, 3.0, 3.1, 3.1, 3.1] },
  ],
  "Ardan Med Spa": [
    { id: "c-ar1", clientId: "", name: "Spring 2026 - Prospecting", dailyBudget: 15, spend: 450, roas: 3.2, cpa: 32, ctr: 1.8, conversions: 14, status: "active", trendData: [2.8, 2.9, 3.0, 3.1, 3.2, 3.2, 3.2] },
    { id: "c-ar2", clientId: "", name: "Retargeting - Web Visitors", dailyBudget: 12, spend: 350, roas: 5.1, cpa: 23, ctr: 2.3, conversions: 15, status: "active", trendData: [4.8, 4.9, 5.0, 5.1, 5.2, 5.1, 5.1] },
  ],
  "Super Crisp": [
    { id: "c-sc1", clientId: "", name: "Menu Launch - Local Reach", dailyBudget: 15, spend: 400, roas: 2.1, cpa: 5, ctr: 3.2, conversions: 80, status: "active", trendData: [2.3, 2.2, 2.2, 2.1, 2.1, 2.1, 2.1] },
    { id: "c-sc2", clientId: "", name: "Weekend Specials - Traffic", dailyBudget: 12, spend: 350, roas: 1.8, cpa: 4, ctr: 2.4, conversions: 88, status: "active", trendData: [2.0, 1.9, 1.9, 1.8, 1.8, 1.8, 1.8] },
  ],
};

// Per-client alerts
const CLIENT_ALERTS: Record<string, AdsAlertEnhanced[]> = {
  "The Shape SPA Miami": [
    { id: "ae-sm1", clientId: "", message: "Body Sculpting campaign ROAS at 3.8x — exceeding 3.0 target. Strong creative performance.", severity: "positive", aiGenerated: true, createdAt: new Date().toISOString() },
  ],
  "The Shape Spa FLL": [
    { id: "ae-sf1", clientId: "", message: "Fort Lauderdale Awareness CPA trending high ($45). Consider narrowing geo to 10mi radius.", severity: "warning", aiGenerated: true, actionLabel: "Adjust Targeting", createdAt: new Date().toISOString() },
  ],
  "Ardan Med Spa": [
    { id: "ae-ar1", clientId: "", message: "ROAS +12% WoW on retargeting — top performer across all clients.", severity: "positive", aiGenerated: true, createdAt: new Date().toISOString() },
    { id: "ae-ar2", clientId: "", message: "Prospecting spend pacing 5% under — consider increasing daily budget to hit monthly target.", severity: "warning", aiGenerated: true, actionLabel: "Increase Budget", createdAt: new Date().toISOString() },
  ],
  "Super Crisp": [
    { id: "ae-sc1", clientId: "", message: "Weekend Specials CTR dropped 15% — creative fatigue detected. Recommend new food photography.", severity: "warning", aiGenerated: true, actionLabel: "Refresh Creative", createdAt: new Date().toISOString() },
    { id: "ae-sc2", clientId: "", message: "ROAS below 2.0x target on both campaigns. Review audience targeting.", severity: "urgent", aiGenerated: true, actionLabel: "Review Campaigns", createdAt: new Date().toISOString() },
  ],
};

// Per-client agent actions
const CLIENT_AGENT_ACTIONS: Record<string, AgentAction[]> = {
  "Ardan Med Spa": [
    {
      id: "aa-ar1", clientId: "", agentType: "budget_optimizer",
      action: "Agent suggests increasing daily budget on 'Spring 2026 - Prospecting' from $15 → $22 based on strong ROAS trend (+12% WoW).",
      reasoning: "Retargeting ROAS at 5.1x is outperforming. Prospecting has room to scale. CPMs stable. Recommend budget increase to capture demand.",
      status: "pending", impact: { metric: "ROAS", currentValue: 3.2, projectedValue: 3.5 },
      campaignId: "c-ar1", campaignName: "Spring 2026 - Prospecting",
      createdAt: new Date(Date.now() - 3600000).toISOString(), reviewedAt: null, reviewedBy: null,
    },
  ],
  "Super Crisp": [
    {
      id: "aa-sc1", clientId: "", agentType: "creative_suggester",
      action: "Agent recommends new food photography creative — current Weekend Specials CTR dropped 15% over 7 days.",
      reasoning: "Ad fatigue detected. Same creative shown 25k+ times. CTR decline correlates with frequency >3.5. Fresh creative typically lifts CTR 8-12%.",
      status: "pending", impact: { metric: "CTR", currentValue: 2.4, projectedValue: 2.8 },
      campaignId: "c-sc2", campaignName: "Weekend Specials - Traffic",
      createdAt: new Date(Date.now() - 7200000).toISOString(), reviewedAt: null, reviewedBy: null,
    },
  ],
  "The Shape SPA Miami": [
    {
      id: "aa-sm1", clientId: "", agentType: "audience_expander",
      action: "Agent suggests adding lookalike 3-5% audience to Retargeting — similar med spas see 20% lower CPA on LAL expansion.",
      reasoning: "Current retargeting limited to 1-2% LAL. Lookalike 3-5% expands reach with minimal quality loss. Beauty/spa vertical shows strong LAL performance.",
      status: "approved", impact: { metric: "CPA", currentValue: 22, projectedValue: 18 },
      campaignId: "c-sm2", campaignName: "Retargeting - IG Engagers",
      createdAt: new Date(Date.now() - 10800000).toISOString(), reviewedAt: new Date(Date.now() - 3600000).toISOString(), reviewedBy: "Bruno",
    },
  ],
};

// ROAS by campaign per client
const CLIENT_ROAS: Record<string, RoasByCampaign[]> = {
  "The Shape SPA Miami": [
    { name: "Retargeting - IG Engagers", roas: 5.2 },
    { name: "Body Sculpting - Leads", roas: 3.8 },
    { name: "New Client Promo", roas: 2.9 },
  ],
  "The Shape Spa FLL": [
    { name: "Service Highlight - Leads", roas: 3.1 },
    { name: "Fort Lauderdale Awareness", roas: 2.5 },
  ],
  "Ardan Med Spa": [
    { name: "Retargeting - Web Visitors", roas: 5.1 },
    { name: "Spring 2026 - Prospecting", roas: 3.2 },
  ],
  "Super Crisp": [
    { name: "Menu Launch - Local Reach", roas: 2.1 },
    { name: "Weekend Specials - Traffic", roas: 1.8 },
  ],
};

// —— Getters ——
export function getAgentActions(clientId: string): AgentAction[] {
  if (!clientHasAds(clientId)) return [];
  if (MOCK_IDS.has(clientId)) {
    return MOCK_AGENT_ACTIONS.filter((a) => a.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const name = resolveClientName(clientId);
  const actions = CLIENT_AGENT_ACTIONS[name] ?? [];
  return actions.map(a => ({ ...a, clientId })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAdsAlertsEnhanced(clientId: string): AdsAlertEnhanced[] {
  if (!clientHasAds(clientId)) return [];
  if (MOCK_IDS.has(clientId)) {
    return MOCK_ADS_ALERTS_ENHANCED.filter((a) => a.clientId === clientId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  const name = resolveClientName(clientId);
  const alerts = CLIENT_ALERTS[name] ?? [];
  return alerts.map(a => ({ ...a, clientId })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getAdsCampaignsEnhanced(clientId: string): AdsCampaignEnhanced[] {
  if (!clientHasAds(clientId)) return [];
  if (MOCK_IDS.has(clientId)) {
    return MOCK_ADS_CAMPAIGNS_ENHANCED.filter((c) => c.clientId === clientId);
  }
  const name = resolveClientName(clientId);
  const campaigns = CLIENT_CAMPAIGNS[name] ?? [];
  return campaigns.map(c => ({ ...c, clientId }));
}

export function getAdsKPIData(clientId: string): AdsKPIData | null {
  if (!clientHasAds(clientId)) return null;
  if (MOCK_IDS.has(clientId)) return { ...MOCK_ADS_KPI };
  const name = resolveClientName(clientId);
  return CLIENT_KPI_PROFILES[name] ?? null;
}

export function getSpendOverTime(clientId: string): SpendDataPoint[] {
  if (!clientHasAds(clientId)) return [];
  const name = resolveClientName(clientId);
  const kpi = CLIENT_KPI_PROFILES[name];
  if (!kpi) return MOCK_SPEND_OVER_TIME;
  // Generate client-specific spend trend
  const baseDaily = kpi.spend / 30;
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return {
      date: d.toISOString().slice(0, 10),
      spend: Math.round((baseDaily * 0.85 + baseDaily * 0.3 * Math.sin(i / 5) + Math.random() * baseDaily * 0.15) * 100) / 100,
    };
  });
}

export function getRoasByCampaign(clientId: string): RoasByCampaign[] {
  if (!clientHasAds(clientId)) return [];
  if (MOCK_IDS.has(clientId)) return MOCK_ROAS_BY_CAMPAIGN;
  const name = resolveClientName(clientId);
  return CLIENT_ROAS[name] ?? [];
}

export function getConversionsOverTime(clientId: string): ConversionDataPoint[] {
  if (!clientHasAds(clientId)) return [];
  const name = resolveClientName(clientId);
  const kpi = CLIENT_KPI_PROFILES[name];
  if (!kpi) return MOCK_CONVERSIONS_OVER_TIME;
  const baseDaily = kpi.conversions / 14;
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toISOString().slice(0, 10),
      conversions: Math.floor(baseDaily * 0.7 + Math.random() * baseDaily * 0.6 + i * 0.1),
    };
  });
}
