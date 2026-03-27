"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface MetaKPIs {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  frequency: number;
  linkClicks: number;
  landingPageViews: number;
  pageEngagement: number;
  postEngagement: number;
  leads: number;
  purchases: number;
  costPerLead: number;
  costPerLinkClick: number;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number | null;
  lifetimeBudget: number | null;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  reach?: number;
  linkClicks?: number;
  landingPageViews?: number;
  leads?: number;
}

interface DailyData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  linkClicks: number;
  landingPageViews: number;
}

interface MetaInsights {
  connected: boolean;
  message?: string;
  adAccountId?: string;
  datePreset?: string;
  kpis?: MetaKPIs;
  campaigns?: Campaign[];
  campaignInsights?: Campaign[];
  daily?: DailyData[];
}

type DateRange = "last_7d" | "last_14d" | "last_30d" | "this_month" | "last_month";

const OBJECTIVE_LABELS: Record<string, string> = {
  OUTCOME_TRAFFIC: "Traffic",
  OUTCOME_ENGAGEMENT: "Engagement",
  OUTCOME_LEADS: "Leads",
  OUTCOME_SALES: "Sales",
  OUTCOME_AWARENESS: "Awareness",
  OUTCOME_APP_PROMOTION: "App Promo",
};

const STATUS_COLORS: Record<string, { dark: string; light: string }> = {
  ACTIVE: { dark: "bg-emerald-500/20 text-emerald-400", light: "bg-emerald-100 text-emerald-700" },
  PAUSED: { dark: "bg-amber-500/20 text-amber-400", light: "bg-amber-100 text-amber-700" },
  DELETED: { dark: "bg-red-500/20 text-red-400", light: "bg-red-100 text-red-700" },
  ARCHIVED: { dark: "bg-gray-500/20 text-gray-400", light: "bg-gray-100 text-gray-600" },
};

function fmt(n: number, type: "money" | "number" | "pct" = "number"): string {
  if (type === "money") return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (type === "pct") return `${n.toFixed(2)}%`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

// ─── Auto Insights Engine ─────────────────────────────────
interface Insight {
  type: "alert" | "win" | "action" | "info";
  emoji: string;
  title: string;
  detail: string;
  actionPrompt?: string; // prompt to send to agent when "Execute" is clicked
}

interface ActionItem {
  id: string;
  text: string;
  status: "pending" | "in_progress" | "done";
  source: string; // "insight" | "agent"
  createdAt: string;
}

function generateInsights(k: MetaKPIs, campaigns: Campaign[], daily: DailyData[]): Insight[] {
  const insights: Insight[] = [];
  
  // Spend trends
  if (daily.length >= 7) {
    const recent3 = daily.slice(-3).reduce((s, d) => s + d.spend, 0) / 3;
    const prev3 = daily.slice(-6, -3).reduce((s, d) => s + d.spend, 0) / 3;
    if (prev3 > 0 && recent3 > prev3 * 1.3) {
      insights.push({ type: "alert", emoji: "💰", title: "Spend trending up", detail: `Daily spend increased ${Math.round((recent3/prev3-1)*100)}% in last 3 days vs prior 3 days. Average: $${recent3.toFixed(2)}/day.`, actionPrompt: "Spend is trending up. Analyze if performance justifies the increase and recommend whether to maintain, scale, or pull back." });
    }
    if (prev3 > 0 && recent3 < prev3 * 0.5) {
      insights.push({ type: "alert", emoji: "📉", title: "Spend dropping", detail: `Daily spend dropped ${Math.round((1-recent3/prev3)*100)}%. Check if campaigns are paused or budget-limited.`, actionPrompt: "Analyze why ad spend is dropping and recommend specific fixes. Check campaign status, budget limits, and delivery issues." });
    }
  }

  // CTR analysis
  if (k.ctr > 3) {
    insights.push({ type: "win", emoji: "🔥", title: "Strong CTR", detail: `${k.ctr.toFixed(2)}% CTR is above industry average. Ads are resonating well with the audience.` });
  } else if (k.ctr < 1 && k.spend > 50) {
    insights.push({ type: "alert", emoji: "⚠️", title: "Low CTR", detail: `${k.ctr.toFixed(2)}% CTR — ads may need creative refresh. Test new headlines, images, or audiences.`, actionPrompt: "CTR is low. Create 3 new ad headline variations and 2 new audience targeting suggestions to improve CTR." });
  }

  // CPC analysis
  if (k.cpc > 3 && k.clicks > 10) {
    insights.push({ type: "action", emoji: "💸", title: "High CPC", detail: `$${k.cpc.toFixed(2)} per click. Consider broadening audience or testing new creatives to lower costs.`, actionPrompt: "CPC is high. Suggest specific audience adjustments and creative changes to lower cost per click." });
  } else if (k.cpc < 0.5 && k.cpc > 0) {
    insights.push({ type: "win", emoji: "✅", title: "Efficient CPC", detail: `$${k.cpc.toFixed(2)} per click — excellent cost efficiency.` });
  }

  // Link clicks vs clicks gap
  if (k.clicks > 0 && k.linkClicks > 0 && k.linkClicks / k.clicks < 0.3) {
    insights.push({ type: "info", emoji: "🔗", title: "Low link click ratio", detail: `Only ${Math.round(k.linkClicks/k.clicks*100)}% of clicks are link clicks. Many clicks may be on post engagement (likes, comments) rather than your website.` });
  }

  // Landing page views vs link clicks
  if (k.linkClicks > 20 && k.landingPageViews > 0 && k.landingPageViews / k.linkClicks < 0.5) {
    insights.push({ type: "alert", emoji: "🐌", title: "Landing page drop-off", detail: `Only ${Math.round(k.landingPageViews/k.linkClicks*100)}% of link clicks result in page views. Page may be loading too slowly.`, actionPrompt: "Landing page drop-off is high. Check page speed and suggest landing page improvements for better conversion." });
  }

  // Frequency check
  if (k.frequency > 3) {
    insights.push({ type: "action", emoji: "🔄", title: "High frequency", detail: `Frequency of ${k.frequency.toFixed(1)}x — audience is seeing ads too often. Consider expanding targeting or refreshing creatives.`, actionPrompt: "Ad frequency is too high. Propose new audience segments to expand reach and 3 fresh creative concepts to fight ad fatigue." });
  }

  // Zero conversions with spend
  if (k.spend > 100 && k.leads === 0 && k.purchases === 0) {
    insights.push({ type: "info", emoji: "🎯", title: "No tracked conversions", detail: `$${k.spend.toFixed(2)} spent with no tracked conversions. Check if conversion pixel is installed and firing, or if this is a traffic/awareness campaign.` });
  }

  // Campaign health
  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE");
  const pausedCampaigns = campaigns.filter(c => c.status === "PAUSED");
  if (activeCampaigns.length === 0 && campaigns.length > 0) {
    insights.push({ type: "alert", emoji: "⏸️", title: "No active campaigns", detail: `All ${campaigns.length} campaigns are paused or inactive.` });
  }
  if (pausedCampaigns.length > 0 && activeCampaigns.length > 0) {
    insights.push({ type: "info", emoji: "📋", title: `${pausedCampaigns.length} paused campaign${pausedCampaigns.length>1?'s':''}`, detail: `${pausedCampaigns.map(c => c.name).join(', ')}` });
  }

  // Best performing campaign
  if (activeCampaigns.length > 1) {
    const best = activeCampaigns.reduce((a, b) => (a.ctr || 0) > (b.ctr || 0) ? a : b);
    if (best.ctr && best.ctr > 0) {
      insights.push({ type: "win", emoji: "⭐", title: "Top campaign", detail: `"${best.name}" — ${best.ctr.toFixed(2)}% CTR, ${fmt(best.spend || 0, "money")} spend.` });
    }
  }

  // Daily trend
  if (daily.length >= 2) {
    const yesterday = daily[daily.length - 1];
    const dayBefore = daily[daily.length - 2];
    if (yesterday && dayBefore && dayBefore.spend > 0) {
      const change = ((yesterday.spend - dayBefore.spend) / dayBefore.spend) * 100;
      if (Math.abs(change) > 30) {
        insights.push({
          type: change > 0 ? "info" : "alert",
          emoji: change > 0 ? "📈" : "📉",
          title: `Yesterday: ${change > 0 ? '+' : ''}${Math.round(change)}% spend`,
          detail: `$${yesterday.spend.toFixed(2)} yesterday vs $${dayBefore.spend.toFixed(2)} day before.`
        });
      }
    }
  }

  return insights;
}

const INSIGHT_STYLES = {
  alert: { dark: "border-red-500/30 bg-red-500/5", light: "border-red-200 bg-red-50" },
  win: { dark: "border-emerald-500/30 bg-emerald-500/5", light: "border-emerald-200 bg-emerald-50" },
  action: { dark: "border-amber-500/30 bg-amber-500/5", light: "border-amber-200 bg-amber-50" },
  info: { dark: "border-blue-500/30 bg-blue-500/5", light: "border-blue-200 bg-blue-50" },
};

// Simple sparkline bar chart
function MiniChart({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-[2px] h-12">
      {data.slice(-14).map((v, i) => (
        <div key={i} className={`rounded-sm min-w-[3px] flex-1 ${color}`}
          style={{ height: `${Math.max((v / max) * 100, 4)}%`, opacity: 0.4 + (i / data.length) * 0.6 }} />
      ))}
    </div>
  );
}

export function ClientAdsLiveTab({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [data, setData] = useState<MetaInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>("last_30d");
  const [section, setSection] = useState<"overview" | "campaigns" | "daily" | "actions">("overview");
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [executingInsight, setExecutingInsight] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/meta-insights/${clientId}?date_preset=${dateRange}`);
      setData(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  }, [clientId, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load saved action items from localStorage + listen for updates
  useEffect(() => {
    const load = () => {
      const saved = localStorage.getItem(`ads-actions-${clientId}`);
      if (saved) setActionItems(JSON.parse(saved));
    };
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, [clientId]);

  const saveActionItems = (items: ActionItem[]) => {
    setActionItems(items);
    localStorage.setItem(`ads-actions-${clientId}`, JSON.stringify(items));
  };

  const executeInsight = async (insight: Insight) => {
    if (!insight.actionPrompt) return;
    setExecutingInsight(insight.title);
    try {
      // Build context-rich prompt with REAL metrics data
      const metricsContext = k ? `
CURRENT REAL DATA:
- Spend: $${k.spend.toFixed(2)} | Impressions: ${k.impressions.toLocaleString()} | Clicks: ${k.clicks.toLocaleString()}
- CTR: ${k.ctr.toFixed(2)}% | CPC: $${k.cpc.toFixed(2)} | Reach: ${k.reach.toLocaleString()} | Frequency: ${k.frequency.toFixed(2)}
- Link Clicks: ${k.linkClicks} | Landing Page Views: ${k.landingPageViews} | Leads: ${k.leads}
Campaigns: ${campaigns.map(c => `${c.name} (${c.status}, $${(c.spend||0).toFixed(2)}, ${(c.ctr||0).toFixed(2)}% CTR)`).join('; ')}` : '';

      const fullPrompt = `You are a Meta Ads agent that ACTS, not just advises. Here is the real data:

${metricsContext}

ISSUE: ${insight.title} — ${insight.detail}

For each action, classify it as:
- ✅ DONE: [what you did] — for things you can do right now (create ad copy, write recommendations, generate audience suggestions)
- ⚠️ NEEDS HUMAN: [what needs to be done and why] — for things requiring platform access or human decision

DO the work for everything you can. Write the actual ad copy. Create the actual audience targeting. Generate the actual content. Don't just tell me what to do — DO it and show me the result.

Format: One line per action. Start with ✅ DONE: or ⚠️ NEEDS HUMAN: followed by the action and result. Max 5 actions.`;

      const res = await fetch(`${API}/api/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: "meta-traffic", message: fullPrompt, clientId }),
      });
      const { jobId } = await res.json();
      
      // Poll for result
      const poll = async (): Promise<string> => {
        const r = await fetch(`${API}/api/agents/job/${jobId}`);
        const d = await r.json();
        if (d.status === "done") return d.response || "No response.";
        if (d.status === "error") return `Error: ${d.error}`;
        await new Promise(r => setTimeout(r, 1000));
        return poll();
      };
      
      const response = await poll();
      
      // Parse response — detect ✅ DONE vs ⚠️ NEEDS HUMAN
      const lines = response.split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 15 && (l.includes('DONE') || l.includes('NEEDS HUMAN') || l.includes('✅') || l.includes('⚠️') || /^[\d\.\-\*•]/.test(l)))
        .map(l => l.replace(/^[\d\.\-\*•\)\s]+/, '').trim())
        .filter(l => l.length > 10);
      
      const newItems: ActionItem[] = lines.slice(0, 5).map((line, i) => {
        const isDone = line.includes('✅') || line.includes('DONE:');
        const needsHuman = line.includes('⚠️') || line.includes('NEEDS HUMAN:');
        return {
          id: `${Date.now()}-${i}`,
          text: line.replace(/^[✅⚠️]\s*/, '').replace(/^(DONE:|NEEDS HUMAN:)\s*/i, ''),
          status: isDone ? "done" as const : "pending" as const,
          source: `${isDone ? '✅ Agent handled' : needsHuman ? '⚠️ Needs you' : '📋'} — ${insight.title}`,
          createdAt: new Date().toISOString(),
        };
      });
      
      if (newItems.length > 0) {
        saveActionItems([...newItems, ...actionItems]);
        setSection("actions");
      }
    } catch { /* */ }
    finally { setExecutingInsight(null); }
  };

  const toggleAction = (id: string) => {
    const updated = actionItems.map(a => 
      a.id === id ? { ...a, status: a.status === "done" ? "pending" as const : "done" as const } : a
    );
    saveActionItems(updated);
  };

  const removeAction = (id: string) => {
    saveActionItems(actionItems.filter(a => a.id !== id));
  };

  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  if (loading) return <div className={`p-8 text-center ${subCls}`}>Loading Meta Ads data...</div>;
  if (!data?.connected) return (
    <div className={`p-8 text-center ${subCls}`}>
      <div className="text-4xl mb-3">📊</div>
      <p className="text-sm font-medium">Meta Ads not connected</p>
      <p className="text-xs mt-1">{data?.message || "Connect this client to Meta Ads to see live performance data."}</p>
    </div>
  );

  const k = data.kpis!;
  const campaigns = data.campaignInsights || [];
  const daily = data.daily || [];

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* Date Range Selector */}
      <div className={`flex items-center justify-between px-4 pt-3 pb-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <h2 className={`text-sm font-semibold ${textCls}`}>📊 Meta Ads — Live</h2>
          <span className={`text-xs ${isDark ? "text-emerald-400" : "text-emerald-600"}`}>● Connected</span>
          {data?.adAccountId && (
            <a href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${data.adAccountId.replace('act_','')}`}
              target="_blank" rel="noopener noreferrer"
              className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors ${isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-100 text-blue-700 hover:bg-blue-200"}`}>
              🔗 Open Ads Manager
            </a>
          )}
        </div>
        <div className="flex gap-1">
          {([["last_7d", "7D"], ["last_14d", "14D"], ["last_30d", "30D"], ["this_month", "MTD"]] as [DateRange, string][]).map(([val, label]) => (
            <button key={val} onClick={() => setDateRange(val)}
              className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
                dateRange === val
                  ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                  : isDark ? "text-[#5a5040] hover:text-[#8a7e6d]" : "text-gray-500"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Tabs */}
      <div className={`flex gap-1 px-4 py-2 ${isDark ? "bg-[#08080c]" : "bg-gray-50"}`}>
        {([["overview", "📊 Overview"], ["campaigns", `🎯 Campaigns (${campaigns.length})`], ["daily", "📈 Daily"], ["actions", `⚡ Actions${actionItems.filter(a=>a.status!=="done").length ? ` (${actionItems.filter(a=>a.status!=="done").length})` : ""}`]] as [typeof section, string][]).map(([id, label]) => (
          <button key={id} onClick={() => setSection(id)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
              section === id
                ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                : isDark ? "text-[#5a5040]" : "text-gray-500"
            }`}>
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {/* OVERVIEW */}
        {section === "overview" && (
          <div className="space-y-4">
            {/* Auto Insights — what you need to know right now */}
            {(() => {
              const insights = generateInsights(k, campaigns, daily);
              if (insights.length === 0) return null;
              return (
                <div className={`rounded-xl border p-4 ${cardCls}`}>
                  <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>🧠 Insights & Alerts</h3>
                  <div className="space-y-2">
                    {insights.map((ins, i) => {
                      const style = INSIGHT_STYLES[ins.type];
                      return (
                        <div key={i} className={`rounded-lg border px-3 py-2 ${isDark ? style.dark : style.light}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className={`text-sm font-medium ${textCls}`}>{ins.emoji} {ins.title}</div>
                              <div className={`text-xs mt-0.5 ${subCls}`}>{ins.detail}</div>
                            </div>
                            {ins.actionPrompt && (
                              <button
                                onClick={() => executeInsight(ins)}
                                disabled={executingInsight === ins.title}
                                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                  executingInsight === ins.title
                                    ? "bg-amber-500/20 text-amber-400 animate-pulse"
                                    : isDark
                                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                }`}
                              >
                                {executingInsight === ins.title ? "⏳ Working..." : "⚡ Execute"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Main KPI Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Spend", value: fmt(k.spend, "money"), sub: `CPC: ${fmt(k.cpc, "money")}`, emoji: "💰", chart: daily.map(d => d.spend), color: "bg-blue-400" },
                { label: "Impressions", value: fmt(k.impressions), sub: `Reach: ${fmt(k.reach)}`, emoji: "👁️", chart: daily.map(d => d.impressions), color: "bg-purple-400" },
                { label: "Clicks", value: fmt(k.clicks), sub: `CTR: ${fmt(k.ctr, "pct")}`, emoji: "🖱️", chart: daily.map(d => d.clicks), color: "bg-emerald-400" },
                { label: "Link Clicks", value: fmt(k.linkClicks), sub: `LPV: ${fmt(k.landingPageViews)}`, emoji: "🔗", chart: daily.map(d => d.linkClicks), color: "bg-amber-400" },
              ].map((kpi) => (
                <div key={kpi.label} className={`rounded-xl border p-4 ${cardCls}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs ${subCls}`}>{kpi.emoji} {kpi.label}</span>
                  </div>
                  <div className={`text-xl font-bold ${textCls}`}>{kpi.value}</div>
                  <div className={`text-xs mt-0.5 ${subCls}`}>{kpi.sub}</div>
                  <div className="mt-3">
                    <MiniChart data={kpi.chart} color={kpi.color} />
                  </div>
                </div>
              ))}
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { label: "Reach", value: fmt(k.reach) },
                { label: "Frequency", value: k.frequency.toFixed(2) },
                { label: "Page Engagement", value: fmt(k.pageEngagement) },
                { label: "Post Engagement", value: fmt(k.postEngagement) },
                { label: "Leads", value: fmt(k.leads) },
                { label: "Cost/Link Click", value: fmt(k.costPerLinkClick, "money") },
              ].map(m => (
                <div key={m.label} className={`rounded-lg border px-3 py-2 ${cardCls}`}>
                  <div className={`text-sm font-bold ${textCls}`}>{m.value}</div>
                  <div className={`text-xs ${subCls}`}>{m.label}</div>
                </div>
              ))}
            </div>

            {/* Active Campaigns Quick View */}
            {campaigns.length > 0 && (
              <div className={`rounded-xl border p-4 ${cardCls}`}>
                <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>🎯 Active Campaigns</h3>
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.id} className={`flex items-center gap-4 py-2 border-b last:border-0 ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${textCls}`}>{c.name}</div>
                        <div className={`text-xs ${subCls}`}>{OBJECTIVE_LABELS[c.objective] || c.objective}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${textCls}`}>{fmt(c.spend || 0, "money")}</div>
                        <div className={`text-xs ${subCls}`}>{fmt(c.clicks || 0)} clicks</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm ${textCls}`}>{fmt(c.ctr || 0, "pct")}</div>
                        <div className={`text-xs ${subCls}`}>CTR</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CAMPAIGNS */}
        {section === "campaigns" && (
          <div className="space-y-3">
            {(data.campaigns || []).map(c => {
              const insights = campaigns.find(ci => ci.id === c.id);
              const sc = STATUS_COLORS[c.status] || STATUS_COLORS.ARCHIVED;
              return (
                <div key={c.id} className={`rounded-xl border p-4 ${cardCls}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${textCls}`}>{c.name}</div>
                      <div className={`text-xs mt-1 flex gap-3 ${subCls}`}>
                        <span>🎯 {OBJECTIVE_LABELS[c.objective] || c.objective}</span>
                        {c.dailyBudget && <span>💰 ${c.dailyBudget.toFixed(2)}/day</span>}
                        {c.lifetimeBudget && <span>💰 ${c.lifetimeBudget.toFixed(2)} lifetime</span>}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isDark ? sc.dark : sc.light}`}>
                      {c.status}
                    </span>
                  </div>
                  {insights && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3 pt-3 border-t" style={{ borderColor: isDark ? '#1a1810' : '#e5e7eb' }}>
                      <div>
                        <div className={`text-sm font-bold ${textCls}`}>{fmt(insights.spend || 0, "money")}</div>
                        <div className={`text-xs ${subCls}`}>Spend</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${textCls}`}>{fmt(insights.impressions || 0)}</div>
                        <div className={`text-xs ${subCls}`}>Impressions</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${textCls}`}>{fmt(insights.clicks || 0)}</div>
                        <div className={`text-xs ${subCls}`}>Clicks</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${textCls}`}>{fmt(insights.ctr || 0, "pct")}</div>
                        <div className={`text-xs ${subCls}`}>CTR</div>
                      </div>
                      <div>
                        <div className={`text-sm font-bold ${textCls}`}>{fmt(insights.reach || 0)}</div>
                        <div className={`text-xs ${subCls}`}>Reach</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* DAILY */}
        {section === "daily" && (
          <div className="space-y-4">
            <div className={`rounded-xl border p-4 ${cardCls}`}>
              <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>📈 Daily Spend</h3>
              <div className="flex items-end gap-[3px] h-32">
                {daily.map((d, i) => {
                  const max = Math.max(...daily.map(x => x.spend), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="bg-blue-400 rounded-sm w-full min-w-[4px]"
                        style={{ height: `${Math.max((d.spend / max) * 100, 2)}%` }} />
                      <div className={`text-[9px] ${subCls} hidden sm:block`}>
                        {new Date(d.date).getDate()}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                        <div className={`text-xs px-2 py-1 rounded shadow-lg ${isDark ? "bg-[#1a1810] text-[#c4b8a8]" : "bg-gray-900 text-white"}`}>
                          {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {fmt(d.spend, "money")}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Table */}
            <div className={`rounded-xl border overflow-hidden ${cardCls}`}>
              <table className="w-full text-xs">
                <thead>
                  <tr className={isDark ? "bg-[#0a0a0e]" : "bg-gray-50"}>
                    {["Date", "Spend", "Impressions", "Clicks", "CTR", "Link Clicks", "LPV"].map(h => (
                      <th key={h} className={`text-left px-3 py-2 font-medium ${subCls}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...daily].reverse().map((d, i) => (
                    <tr key={i} className={`border-t ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                      <td className={`px-3 py-2 ${textCls}`}>{new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className={`px-3 py-2 font-medium ${textCls}`}>{fmt(d.spend, "money")}</td>
                      <td className={`px-3 py-2 ${subCls}`}>{fmt(d.impressions)}</td>
                      <td className={`px-3 py-2 ${subCls}`}>{fmt(d.clicks)}</td>
                      <td className={`px-3 py-2 ${subCls}`}>{fmt(d.ctr, "pct")}</td>
                      <td className={`px-3 py-2 ${subCls}`}>{d.linkClicks}</td>
                      <td className={`px-3 py-2 ${subCls}`}>{d.landingPageViews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        {section === "actions" && (
          <div className="space-y-4">
            {actionItems.length === 0 ? (
              <div className={`text-center py-12 ${subCls}`}>
                <div className="text-3xl mb-2">⚡</div>
                <p className="text-sm font-medium">No action items yet</p>
                <p className="text-xs mt-1">Click "Execute" on any insight to generate action items, or ask the agent in the chat panel.</p>
              </div>
            ) : (
              <>
                {/* Pending Actions */}
                {actionItems.filter(a => a.status !== "done").length > 0 && (
                  <div className={`rounded-xl border p-4 ${cardCls}`}>
                    <h3 className={`text-sm font-semibold mb-3 ${textCls}`}>📋 Pending Actions ({actionItems.filter(a => a.status !== "done").length})</h3>
                    <div className="space-y-2">
                      {actionItems.filter(a => a.status !== "done").map(item => (
                        <div key={item.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2 ${isDark ? "border-[#1a1a22] bg-[#0a0a0e]" : "border-gray-100 bg-gray-50"}`}>
                          <button onClick={() => toggleAction(item.id)} className={`mt-0.5 shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isDark ? "border-[#3a3a42] hover:border-emerald-500" : "border-gray-300 hover:border-emerald-500"}`}>
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm ${textCls}`}>{item.text}</div>
                            <div className={`text-xs mt-1 ${subCls}`}>From: {item.source} • {new Date(item.createdAt).toLocaleDateString()}</div>
                          </div>
                          <button onClick={() => removeAction(item.id)} className={`shrink-0 text-xs ${subCls} hover:text-red-400`}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Actions */}
                {actionItems.filter(a => a.status === "done").length > 0 && (
                  <div className={`rounded-xl border p-4 ${cardCls}`}>
                    <h3 className={`text-sm font-semibold mb-3 ${subCls}`}>✅ Done ({actionItems.filter(a => a.status === "done").length})</h3>
                    <div className="space-y-2">
                      {actionItems.filter(a => a.status === "done").map(item => (
                        <div key={item.id} className={`flex items-start gap-3 rounded-lg px-3 py-2 opacity-60`}>
                          <button onClick={() => toggleAction(item.id)} className="mt-0.5 shrink-0 w-5 h-5 rounded border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
                            <span className="text-emerald-400 text-xs">✓</span>
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm line-through ${subCls}`}>{item.text}</div>
                          </div>
                          <button onClick={() => removeAction(item.id)} className={`shrink-0 text-xs ${subCls} hover:text-red-400`}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
