"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { api } from "@/lib/api";
import type { AdsCampaignEnhanced, AdsAdSet, AdsAd } from "@/lib/client/mockAdsData";

type Props = {
  campaigns: AdsCampaignEnhanced[];
  clientId?: string;
  clientName?: string;
  adAccountId?: string | null;
  onRefresh?: () => void;
};

function stripActPrefix(adAccountId: string): string {
  const s = String(adAccountId || "").trim();
  if (s.toLowerCase().startsWith("act_")) return s.slice(4);
  return s;
}

function EditBudgetModal({
  campaignName,
  currentBudget,
  isDark,
  onConfirm,
  onClose,
}: {
  campaignName: string;
  currentBudget: number;
  isDark: boolean;
  onConfirm: (newBudget: number) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(String(currentBudget));
  const num = parseFloat(value) || 0;
  const pctChange = currentBudget > 0 ? ((num - currentBudget) / currentBudget) * 100 : 0;
  const over30 = Math.abs(pctChange) > 30;
  const modalCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const inputCls = isDark ? "bg-[#141414] border-[#2a2520] text-[#e8e4dc]" : "bg-gray-50 border-gray-200 text-gray-900";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className={`max-w-sm w-full rounded-xl border p-6 shadow-xl ${modalCls}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-[#e8e4dc]" : "text-gray-900"}`}>Edit Budget</h3>
        <p className={`text-sm mb-4 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>{campaignName}</p>
        <div className="space-y-2 mb-2">
          <label className={`text-xs ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>Current daily budget</label>
          <p className="font-medium">${currentBudget}/day</p>
        </div>
        <div className="space-y-2 mb-4">
          <label className={`text-xs ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>New daily budget ($)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 ${inputCls}`}
          />
          {currentBudget > 0 && !Number.isNaN(num) && (
            <p className={`text-xs ${pctChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              This is a {pctChange >= 0 ? "" : ""} {Math.abs(pctChange).toFixed(0)}% {num >= currentBudget ? "increase" : "decrease"}.
            </p>
          )}
          {over30 && (
            <p className="text-xs text-amber-500">
              ⚠️ Budget change exceeds 30% safety limit. Consider a smaller adjustment.
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm ${isDark ? "text-[#8a7e6d] hover:bg-[#1a1810]" : "text-gray-600 hover:bg-gray-100"}`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => num >= 0 && onConfirm(num)}
            disabled={Number.isNaN(num) || num < 0}
            className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  return (
    <ResponsiveContainer width={60} height={24}>
      <LineChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CampaignRow({
  campaign,
  isExpanded,
  onToggle,
  isDark,
  clientId,
  clientName,
  adAccountId,
  onRefresh,
}: {
  campaign: AdsCampaignEnhanced;
  isExpanded: boolean;
  onToggle: () => void;
  isDark: boolean;
  clientId?: string;
  clientName?: string;
  adAccountId?: string | null;
  onRefresh?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  const hasMetaLink = Boolean(adAccountId && campaign.metaCampaignId);
  const canEditOrPause = hasMetaLink && clientId && clientName;

  const statusCls =
    campaign.status === "active"
      ? "bg-emerald-500/20 text-emerald-400"
      : campaign.status === "learning"
        ? "bg-amber-500/20 text-amber-400"
        : campaign.status === "paused"
          ? "bg-gray-500/20 text-gray-400"
          : "bg-blue-500/20 text-blue-400";

  const rowTint =
    campaign.roas >= 4
      ? isDark ? "bg-emerald-500/5" : "bg-emerald-50/30"
      : campaign.roas < 2.5
        ? isDark ? "bg-red-500/5" : "bg-red-50/20"
        : "";

  const borderCls = isDark ? "border-[#1a1810]" : "border-gray-100";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-800";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  const handleViewInMeta = () => {
    setMenuOpen(false);
    if (!adAccountId || !campaign.metaCampaignId) {
      toast.error("No Meta campaign ID linked.");
      return;
    }
    const act = stripActPrefix(adAccountId);
    window.open(
      `https://www.facebook.com/adsmanager/manage/campaigns?act=${act}&campaign_ids=${campaign.metaCampaignId}`,
      "_blank"
    );
  };

  const handleEditBudgetConfirm = async (newBudget: number) => {
    if (!clientId || !clientName || !campaign.metaCampaignId || !adAccountId) return;
    setEditBudgetOpen(false);
    setMenuOpen(false);
    setExecuting("budget");
    try {
      const created = await api.createAgentAction({
        clientId,
        clientName,
        agentId: "founder-boss",
        agentName: "Bruno (Manual)",
        category: "ads",
        title: `Update budget: ${campaign.name} $${campaign.dailyBudget} → $${newBudget}`,
        reasoning: "Manual budget change from Ads tab",
        proposedAction: JSON.stringify({
          type: "update_budget",
          campaignId: campaign.metaCampaignId,
          adAccountId,
          oldBudget: campaign.dailyBudget,
          newBudget,
        }),
        priority: "high",
        status: "approved",
      });
      const executed = await api.executeAgentAction(created.id);
      if (executed.status === "completed") {
        toast.success(`✅ Budget updated: $${campaign.dailyBudget} → $${newBudget}/day`);
      } else {
        toast.error(`❌ Failed: ${executed.errorMessage || "Unknown error"}`);
      }
      onRefresh?.();
    } catch (e) {
      toast.error(`❌ Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExecuting(null);
    }
  };

  const handlePauseConfirm = async () => {
    if (!clientId || !clientName || !campaign.metaCampaignId || !adAccountId) return;
    setPauseConfirmOpen(false);
    setMenuOpen(false);
    setExecuting("pause");
    try {
      const created = await api.createAgentAction({
        clientId,
        clientName,
        agentId: "founder-boss",
        agentName: "Bruno (Manual)",
        category: "ads",
        title: `Pause campaign: ${campaign.name}`,
        reasoning: "Manual pause from Ads tab",
        proposedAction: JSON.stringify({
          type: "pause_campaign",
          campaignId: campaign.metaCampaignId,
          adAccountId,
        }),
        priority: "high",
        status: "approved",
      });
      const executed = await api.executeAgentAction(created.id);
      if (executed.status === "completed") {
        toast.success(`✅ Campaign "${campaign.name}" paused.`);
      } else {
        toast.error(`❌ Failed: ${executed.errorMessage || "Unknown error"}`);
      }
      onRefresh?.();
    } catch (e) {
      toast.error(`❌ Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExecuting(null);
    }
  };

  const handleAskAgent = async () => {
    setMenuOpen(false);
    if (!clientName) return;
    try {
      await api.createAgentAction({
        clientName,
        clientId: clientId ?? undefined,
        agentId: "meta-traffic",
        agentName: "Meta Traffic",
        category: "ads",
        title: `Optimize campaign: ${campaign.name}`,
        reasoning: "Bruno requested optimization review from the Ads tab",
        proposedAction: `Analyze campaign ${campaign.name} (${campaign.metaCampaignId || campaign.id}) and propose optimizations. Current metrics: spend $${campaign.spend}, CPL $${campaign.cpa}, CTR ${campaign.ctr}%, ROAS ${campaign.roas}x.`,
        priority: "high",
        status: "pending",
      });
      toast.success("🤖 Optimization request sent to Meta Traffic agent. Check Agent Actions for the proposal.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send request");
    }
  };

  const btnCls = "block w-full text-left px-3 py-1.5 text-xs hover:bg-black/5 disabled:opacity-50 disabled:cursor-not-allowed";
  const tooltip = !canEditOrPause ? "Connect Meta Ads to enable" : undefined;

  return (
    <>
      <tr
        className={`${rowTint} ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50/50"} cursor-pointer transition-colors`}
        onClick={() => { setMenuOpen(false); onToggle(); }}
      >
        <td className={`py-3 px-4 ${borderCls}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isExpanded ? "rotate-90" : ""} transition-transform`}>▶</span>
            <span className={`font-medium ${textCls}`}>{campaign.name}</span>
          </div>
        </td>
        <td className={`py-3 px-4 tabular-nums ${borderCls}`}>${campaign.dailyBudget}</td>
        <td className={`py-3 px-4 tabular-nums ${mutedCls} ${borderCls}`}>${campaign.spend.toLocaleString()}</td>
        <td className={`py-3 px-4 tabular-nums ${borderCls} ${campaign.roas >= 3 ? "text-emerald-400" : campaign.roas < 2 ? "text-red-400" : mutedCls}`}>
          {campaign.roas}x
        </td>
        <td className={`py-3 px-4 tabular-nums ${mutedCls} ${borderCls}`}>${campaign.cpa}</td>
        <td className={`py-3 px-4 tabular-nums ${mutedCls} ${borderCls}`}>{campaign.ctr}%</td>
        <td className={`py-3 px-4 tabular-nums ${mutedCls} ${borderCls}`}>{campaign.conversions}</td>
        <td className={`py-3 px-4 ${borderCls}`}>
          <MiniSparkline
            data={campaign.trendData}
            color={campaign.roas >= 3 ? "#34d399" : campaign.roas < 2 ? "#f87171" : "#94a3b8"}
          />
        </td>
        <td className={`py-3 px-4 ${borderCls}`}>
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium capitalize ${statusCls} ${campaign.status === "learning" ? "animate-pulse" : ""}`}>
            {campaign.status === "learning" && "● "}{campaign.status}
          </span>
        </td>
        <td className={`py-3 px-4 ${borderCls}`} onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded hover:bg-black/10"
              disabled={!!executing}
            >
              {executing ? "⋯" : "⋮"}
            </button>
            {menuOpen && (
              <div
                className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[200px] ${
                  isDark ? "bg-[#0a0a0e] border border-[#1a1810]" : "bg-white border border-gray-200"
                }`}
              >
                <button
                  className={btnCls}
                  title={tooltip}
                  disabled={!canEditOrPause}
                  onClick={() => canEditOrPause && setEditBudgetOpen(true)}
                >
                  {executing === "budget" ? "Updating…" : "Edit Budget"}
                </button>
                <button
                  className={btnCls}
                  title={tooltip}
                  disabled={!canEditOrPause || campaign.status === "paused"}
                  onClick={() => canEditOrPause && campaign.status !== "paused" && setPauseConfirmOpen(true)}
                >
                  {executing === "pause" ? "Pausing…" : "Pause"}
                </button>
                <button className={btnCls} onClick={handleViewInMeta}>
                  View in Meta
                </button>
                <button className={btnCls} onClick={handleAskAgent}>
                  Ask Agent to Optimize
                </button>
              </div>
            )}
          </div>
        </td>
      </tr>
      {isExpanded &&
        campaign.adSets?.flatMap((adSet) =>
          (adSet.ads ?? []).map((ad) => (
            <tr
              key={ad.id}
              className={`${isDark ? "bg-[#08080c]" : "bg-gray-50/50"} ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-100/50"}`}
            >
              <td className={`py-2 px-4 pl-12 ${borderCls} ${mutedCls} text-sm`}>{ad.name}</td>
              <td className={`py-2 px-4 ${borderCls}`}>—</td>
              <td className={`py-2 px-4 tabular-nums ${mutedCls} ${borderCls}`}>${ad.spend.toLocaleString()}</td>
              <td className={`py-2 px-4 tabular-nums ${borderCls}`}>{ad.roas}x</td>
              <td className={`py-2 px-4 ${borderCls}`}>—</td>
              <td className={`py-2 px-4 ${borderCls}`}>—</td>
              <td className={`py-2 px-4 ${borderCls}`}>—</td>
              <td className={`py-2 px-4 ${borderCls}`}>—</td>
              <td className={`py-2 px-4 ${borderCls}`}>—</td>
              <td className={`py-2 px-4 ${borderCls}`}></td>
            </tr>
          ))
        )}

      {editBudgetOpen && (
        <EditBudgetModal
          campaignName={campaign.name}
          currentBudget={campaign.dailyBudget}
          isDark={isDark}
          onConfirm={handleEditBudgetConfirm}
          onClose={() => setEditBudgetOpen(false)}
        />
      )}

      {pauseConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPauseConfirmOpen(false)}>
          <div
            className={`max-w-sm w-full rounded-xl border p-6 shadow-xl ${isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-[#e8e4dc]" : "text-gray-900"}`}>Pause campaign</h3>
            <p className={`text-sm mb-4 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
              Pause &quot;{campaign.name}&quot;? This will stop all ads immediately.
            </p>
            {campaign.spend > 100 && (
              <p className="text-sm text-amber-500 mb-4">⚠️ This campaign spends over $100/day.</p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setPauseConfirmOpen(false)}
                className={`px-4 py-2 rounded-lg text-sm ${isDark ? "text-[#8a7e6d] hover:bg-[#1a1810]" : "text-gray-600 hover:bg-gray-100"}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePauseConfirm}
                className="px-4 py-2 rounded-lg text-sm bg-red-600 text-white hover:bg-red-500"
              >
                Pause
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CampaignsTable({ campaigns, clientId, clientName, adAccountId, onRefresh }: Props) {
  const { isDark } = useTheme();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setExpandedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const panelCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const headerCls = isDark ? "bg-[#08080c] text-[#8a7e6d]" : "bg-gray-50 text-gray-600";

  return (
    <section className={`rounded-xl border overflow-hidden ${panelCls}`}>
      <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${headerCls}`}>Campaigns</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className={headerCls}>
              <th className="text-left py-3 px-4 font-medium">Campaign</th>
              <th className="text-left py-3 px-4 font-medium">Daily Budget</th>
              <th className="text-right py-3 px-4 font-medium">Spend (MTD)</th>
              <th className="text-right py-3 px-4 font-medium">ROAS</th>
              <th className="text-right py-3 px-4 font-medium">CPA</th>
              <th className="text-right py-3 px-4 font-medium">CTR</th>
              <th className="text-right py-3 px-4 font-medium">Conversions</th>
              <th className="text-right py-3 px-4 font-medium">Trend</th>
              <th className="text-right py-3 px-4 font-medium">Status</th>
              <th className="w-10 py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <CampaignRow
                key={c.id}
                campaign={c}
                isExpanded={expandedIds.has(c.id)}
                onToggle={() => toggle(c.id)}
                isDark={isDark}
                clientId={clientId}
                clientName={clientName}
                adAccountId={adAccountId}
                onRefresh={onRefresh}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
