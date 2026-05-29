"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "";

interface GoogleAdsData {
  connected: boolean;
  customerId?: string;
  customerName?: string;
  managerAccountId?: string;
  status?: string;
  connectedAt?: string;
  clientName?: string;
  message?: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  channelType: string;
  budgetDailyUSD: string | null;
  impressions: number;
  clicks: number;
  costUSD: string;
  conversions: number;
  ctr: string;
}

interface CampaignData {
  campaigns: Campaign[];
  customerId: string;
  total: number;
}

export default function ClientGoogleAdsTab({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [data, setData] = useState<GoogleAdsData | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/google-ads/${clientId}`);
      const d = await res.json();
      setData(d);
      
      // If connected, also fetch campaigns
      if (d.connected) {
        setCampaignsLoading(true);
        try {
          const campaignsRes = await fetch(`${API}/api/google-ads/${clientId}/campaigns`);
          const campaignsData = await campaignsRes.json();
          setCampaigns(campaignsData);
        } catch {
          setCampaigns(null);
        } finally {
          setCampaignsLoading(false);
        }
      }
    } catch {
      setData({ connected: false, message: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleConnect = async () => {
    if (!customerId.trim()) return;
    setConnecting(true);
    try {
      const res = await fetch(`${API}/api/google-ads/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, customerId: customerId.trim(), customerName: customerName.trim() || null }),
      });
      if (res.ok) {
        setCustomerId("");
        setCustomerName("");
        fetchData();
      }
    } finally {
      setConnecting(false);
    }
  };

  if (loading) return <div className="p-6 text-center opacity-50">Loading Google Ads...</div>;

  const card = isDark ? "bg-[#0f0f14] border border-[#1a1a22] rounded-xl p-5" : "bg-white border border-gray-200 rounded-xl p-5 shadow-sm";
  const text = isDark ? "text-[#c4b8a8]" : "text-gray-700";
  const textMuted = isDark ? "text-[#6b6355]" : "text-gray-400";
  const accent = "text-emerald-500";
  const inputClass = isDark
    ? "bg-[#08080c] border border-[#1a1a22] rounded-lg px-3 py-2 text-[#c4b8a8] placeholder-[#4a4440] focus:outline-none focus:border-emerald-500"
    : "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-emerald-500";

  if (!data?.connected) {
    return (
      <div className="p-6 space-y-6">
        <div className={card}>
          <h3 className={`text-lg font-semibold mb-4 ${text}`}>🔍 Connect Google Ads</h3>
          <p className={`text-sm mb-6 ${textMuted}`}>
            Enter the Google Ads Customer ID to connect this client. You can find it in Google Ads → Settings → Account settings.
          </p>
          <div className="space-y-3 max-w-md">
            <input
              type="text"
              placeholder="Customer ID (e.g. 123-456-7890)"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className={`w-full ${inputClass}`}
            />
            <input
              type="text"
              placeholder="Account name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`w-full ${inputClass}`}
            />
            <button
              onClick={handleConnect}
              disabled={connecting || !customerId.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {connecting ? "Connecting..." : "Connect Google Ads"}
            </button>
          </div>
        </div>

        {/* Helpful info */}
        <div className={card}>
          <h4 className={`font-medium mb-3 ${text}`}>📋 How to find your Customer ID</h4>
          <ol className={`text-sm space-y-2 ${textMuted}`}>
            <li>1. Go to <a href="https://ads.google.com" target="_blank" className={accent}>ads.google.com</a></li>
            <li>2. Click the settings icon (⚙️) in the top right</li>
            <li>3. Your Customer ID is displayed as xxx-xxx-xxxx</li>
            <li>4. For MCC accounts, use the sub-account ID for the specific client</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status */}
      <div className={card}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${text}`}>🔍 Google Ads — {data.customerName || data.customerId}</h3>
          <span className={`text-xs px-2 py-1 rounded-full ${data.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            {data.status?.toUpperCase()}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className={`text-xs ${textMuted}`}>Customer ID</p>
            <p className={`text-sm font-mono ${text}`}>{data.customerId}</p>
          </div>
          <div>
            <p className={`text-xs ${textMuted}`}>Account Name</p>
            <p className={`text-sm ${text}`}>{data.customerName || "—"}</p>
          </div>
          <div>
            <p className={`text-xs ${textMuted}`}>Manager Account</p>
            <p className={`text-sm font-mono ${text}`}>{data.managerAccountId || "—"}</p>
          </div>
          <div>
            <p className={`text-xs ${textMuted}`}>Connected</p>
            <p className={`text-sm ${text}`}>{data.connectedAt ? new Date(data.connectedAt).toLocaleDateString() : "—"}</p>
          </div>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(() => {
          if (!campaigns) {
            return [
              { label: "Spend (30d)", value: "—", icon: "💰" },
              { label: "Conversions", value: "—", icon: "🎯" },
              { label: "CPA", value: "—", icon: "📊" },
              { label: "ROAS", value: "—", icon: "📈" },
            ];
          }
          
          const totalSpend = campaigns.campaigns.reduce((sum, c) => sum + parseFloat(c.costUSD), 0);
          const totalConversions = campaigns.campaigns.reduce((sum, c) => sum + c.conversions, 0);
          const cpa = totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : "—";
          
          return [
            { label: "Spend (30d)", value: `$${totalSpend.toFixed(2)}`, icon: "💰" },
            { label: "Conversions", value: totalConversions.toString(), icon: "🎯" },
            { label: "CPA", value: cpa === "—" ? "—" : `$${cpa}`, icon: "📊" },
            { label: "Campaigns", value: campaigns.campaigns.length.toString(), icon: "📈" },
          ];
        })().map((kpi) => (
          <div key={kpi.label} className={card}>
            <p className={`text-xs ${textMuted}`}>{kpi.icon} {kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${accent}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Live Campaigns section */}
      <div className={card}>
        <h4 className={`font-medium mb-3 ${text}`}>📋 Campaigns {campaigns && `(${campaigns.campaigns.length})`}</h4>
        
        {campaignsLoading ? (
          <div className={`text-sm ${textMuted} text-center py-8`}>Loading campaigns...</div>
        ) : !campaigns ? (
          <div className={`text-sm ${textMuted} text-center py-8`}>No campaign data available</div>
        ) : campaigns.campaigns.length === 0 ? (
          <div className={`text-sm ${textMuted} text-center py-8`}>No campaigns found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`border-b ${isDark ? 'border-[#1a1a22]' : 'border-gray-100'}`}>
                  <th className={`text-left py-2 px-3 font-medium ${textMuted}`}>Campaign</th>
                  <th className={`text-left py-2 px-3 font-medium ${textMuted}`}>Status</th>
                  <th className={`text-right py-2 px-3 font-medium ${textMuted}`}>Budget/day</th>
                  <th className={`text-right py-2 px-3 font-medium ${textMuted}`}>Spend (30d)</th>
                  <th className={`text-right py-2 px-3 font-medium ${textMuted}`}>Clicks</th>
                  <th className={`text-right py-2 px-3 font-medium ${textMuted}`}>Conversions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.campaigns.map((campaign) => (
                  <tr key={campaign.id} className={`border-b last:border-0 ${isDark ? 'border-[#1a1a22]' : 'border-gray-50'}`}>
                    <td className={`py-2 px-3 ${text}`}>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className={`text-xs ${textMuted}`}>{campaign.channelType}</p>
                      </div>
                    </td>
                    <td className={`py-2 px-3`}>
                      <span className={`px-2 py-1 rounded text-xs ${
                        campaign.status === 'ENABLED' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-right ${text}`}>
                      {campaign.budgetDailyUSD ? `$${campaign.budgetDailyUSD}` : '—'}
                    </td>
                    <td className={`py-2 px-3 text-right ${text}`}>
                      ${campaign.costUSD}
                    </td>
                    <td className={`py-2 px-3 text-right ${text}`}>
                      {campaign.clicks.toLocaleString()}
                    </td>
                    <td className={`py-2 px-3 text-right ${text}`}>
                      {campaign.conversions}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className={card}>
        <h4 className={`font-medium mb-3 ${text}`}>⚡ Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          {[
            "Review search terms",
            "Check Quality Scores",
            "Keyword suggestions",
            "Ad copy ideas",
            "Budget recommendations",
            "Competitor analysis",
          ].map((action) => (
            <button
              key={action}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                isDark
                  ? "border-[#1a1a22] hover:border-emerald-500/50 text-[#8a7e6e] hover:text-emerald-400"
                  : "border-gray-200 hover:border-emerald-500/50 text-gray-500 hover:text-emerald-600"
              }`}
            >
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
