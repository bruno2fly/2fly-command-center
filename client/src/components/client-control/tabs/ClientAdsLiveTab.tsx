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
  const [section, setSection] = useState<"overview" | "campaigns" | "daily">("overview");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/meta-insights/${clientId}?date_preset=${dateRange}`);
      setData(await res.json());
    } catch { /* */ }
    finally { setLoading(false); }
  }, [clientId, dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        {([["overview", "📊 Overview"], ["campaigns", `🎯 Campaigns (${campaigns.length})`], ["daily", "📈 Daily"]] as [typeof section, string][]).map(([id, label]) => (
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
      </div>
    </div>
  );
}
