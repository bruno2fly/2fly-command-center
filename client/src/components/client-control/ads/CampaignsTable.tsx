"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { api } from "@/lib/api";
import type { AdsCampaignEnhanced, AdsAdSet, AdsAd } from "@/lib/client/mockAdsData";
import { EditBudgetModal } from "./EditBudgetModal";
import { AskAgentModal } from "./AskAgentModal";

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
  const [askAgentOpen, setAskAgentOpen] = useState(false);
  const [executing, setExecuting] = useState<string | null>(null);

  const isPaused = campaign.status === "paused";
  const hasMetaLink = Boolean(adAccountId && campaign.metaCampaignId);
  const canEditOrPause = hasMetaLink && clientId && clientName;
  const showPauseResume = canEditOrPause && (campaign.status === "active" || campaign.status === "learning" || isPaused);
  const goodPerformanceWarning = !isPaused && (Number(campaign.ctr) > 2 || Number(campaign.conversions) > 0);

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
        agentId: "bruno",
        agentName: "Bruno",
        category: "ads",
        title: `Update budget for ${campaign.name}`,
        reasoning: "Manual budget change from Ads tab",
        proposedAction: `Update daily budget from $${campaign.dailyBudget} to $${newBudget} for campaign ${campaign.name} (ID: ${campaign.metaCampaignId})`,
        executionPlan: JSON.stringify([
          { op: "update_budget", campaignId: campaign.metaCampaignId, dailyBudget: newBudget },
        ]),
        executionType: "auto",
        priority: "high",
        status: "approved",
      });
      const executed = await api.executeAgentAction(created.id);
      if (executed.status === "completed") {
        toast.success(`✅ Budget updated to $${newBudget}`);
      } else {
        toast.error(`❌ Failed: ${(executed as { errorMessage?: string }).errorMessage || "Unknown error"}`);
      }
      onRefresh?.();
    } catch (e) {
      toast.error(`❌ Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExecuting(null);
    }
  };

  const handlePauseResumeConfirm = async () => {
    if (!clientId || !clientName || !campaign.metaCampaignId || !adAccountId) return;
    setPauseConfirmOpen(false);
    setMenuOpen(false);
    setExecuting("pause");
    const actionType = isPaused ? "resume_campaign" : "pause_campaign";
    const actionLabel = isPaused ? "Resume" : "Pause";
    try {
      const created = await api.createAgentAction({
        clientId,
        clientName,
        agentId: "bruno",
        agentName: "Bruno",
        category: "ads",
        title: `${actionLabel} campaign ${campaign.name}`,
        reasoning: `Manual ${actionLabel.toLowerCase()} from Ads tab`,
        proposedAction: isPaused
          ? `Resume campaign ${campaign.metaCampaignId}`
          : `Pause campaign ${campaign.metaCampaignId}`,
        executionPlan: JSON.stringify([{ op: actionType, campaignId: campaign.metaCampaignId }]),
        executionType: "auto",
        priority: "high",
        status: "approved",
      });
      const executed = await api.executeAgentAction(created.id);
      if (executed.status === "completed") {
        toast.success(isPaused ? `✅ Campaign "${campaign.name}" resumed.` : `✅ Campaign "${campaign.name}" paused.`);
      } else {
        toast.error(`❌ Failed: ${(executed as { errorMessage?: string }).errorMessage || "Unknown error"}`);
      }
      onRefresh?.();
    } catch (e) {
      toast.error(`❌ Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setExecuting(null);
    }
  };

  const handleAskAgentConfirm = async (focusText: string) => {
    setAskAgentOpen(false);
    setMenuOpen(false);
    if (!clientName) return;
    const focus = focusText || "General optimization";
    const metricsSummary = `$${campaign.spend.toLocaleString()} spend, ${campaign.conversions} leads, ${campaign.ctr}% CTR, $${campaign.cpa} CPC`;
    try {
      await api.createAgentAction({
        clientName,
        clientId: clientId ?? undefined,
        agentId: "meta-traffic",
        agentName: "Meta Traffic",
        category: "ads",
        title: `Optimize ${campaign.name}`,
        reasoning: `Bruno requested optimization. Focus: ${focus}. Current metrics: ${metricsSummary}`,
        proposedAction: `Analyze campaign ${campaign.name} and propose optimizations. Focus area: ${focus}`,
        executionType: "manual",
        priority: "high",
        status: "pending",
      });
      toast.success("🤖 Agent will analyze and propose optimizations");
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
                className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[200px] ${
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
                {showPauseResume && (
                  <button
                    className={btnCls}
                    title={tooltip}
                    disabled={!!executing}
                    onClick={() => setPauseConfirmOpen(true)}
                  >
                    {executing === "pause" ? (isPaused ? "Resuming…" : "Pausing…") : isPaused ? "Resume" : "Pause"}
                  </button>
                )}
                <button className={btnCls} onClick={handleViewInMeta}>
                  View in Meta
                </button>
                <button className={btnCls} onClick={() => setAskAgentOpen(true)}>
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
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-[#e8e4dc]" : "text-gray-900"}`}>
              {isPaused ? "Resume campaign" : "Pause campaign"}
            </h3>
            <p className={`text-sm mb-4 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
              {isPaused
                ? `Resume "${campaign.name}"? Ads will start running again.`
                : `Pause "${campaign.name}"? This will stop all ads immediately.`}
            </p>
            {!isPaused && goodPerformanceWarning && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/15 border border-amber-500/30 px-3 py-2 mb-4">
                <span className="text-amber-500 shrink-0">⚠️</span>
                <p className="text-sm text-amber-200">
                  This campaign has good performance (CTR &gt; 2% or has leads). Pausing may reduce results.
                </p>
              </div>
            )}
            {!isPaused && campaign.spend > 100 && (
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
                onClick={handlePauseResumeConfirm}
                className={`px-4 py-2 rounded-lg text-sm ${isPaused ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"} text-white`}
              >
                {isPaused ? "Resume" : "Pause"}
              </button>
            </div>
          </div>
        </div>
      )}

      {askAgentOpen && (
        <AskAgentModal
          campaignName={campaign.name}
          metrics={{
            spend: campaign.spend,
            leads: campaign.conversions,
            ctr: campaign.ctr,
            cpc: campaign.cpa,
          }}
          onConfirm={handleAskAgentConfirm}
          onClose={() => setAskAgentOpen(false)}
        />
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
    <section className={`rounded-xl border overflow-visible ${panelCls}`}>
      <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${headerCls}`}>Campaigns</h2>
      </div>
      <div className="overflow-x-auto overflow-y-visible">
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
