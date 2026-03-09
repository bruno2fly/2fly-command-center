"use client";

import React, { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { AdsCampaignEnhanced, AdsAdSet, AdsAd } from "@/lib/client/mockAdsData";

type Props = {
  campaigns: AdsCampaignEnhanced[];
};

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
}: {
  campaign: AdsCampaignEnhanced;
  isExpanded: boolean;
  onToggle: () => void;
  isDark: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [budgetEdit, setBudgetEdit] = useState(campaign.dailyBudget);

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
      ? isDark
        ? "bg-emerald-500/5"
        : "bg-emerald-50/30"
      : campaign.roas < 2.5
        ? isDark
          ? "bg-red-500/5"
          : "bg-red-50/20"
        : "";

  const borderCls = isDark ? "border-[#1a1810]" : "border-gray-100";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-800";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <>
      <tr
        className={`${rowTint} ${isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50/50"} cursor-pointer transition-colors`}
        onClick={() => {
          setMenuOpen(false);
          onToggle();
        }}
      >
        <td className={`py-3 px-4 ${borderCls}`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${isExpanded ? "rotate-90" : ""} transition-transform`}>▶</span>
            <span className={`font-medium ${textCls}`}>{campaign.name}</span>
          </div>
        </td>
        <td className={`py-3 px-4 ${borderCls}`} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBudgetEdit((b) => Math.max(0, b - 10))}
              className="text-xs px-1 py-0.5 rounded border border-transparent hover:border-current"
            >
              −
            </button>
            <span className="tabular-nums min-w-[2.5rem]">${budgetEdit}</span>
            <button
              onClick={() => setBudgetEdit((b) => b + 10)}
              className="text-xs px-1 py-0.5 rounded border border-transparent hover:border-current"
            >
              +
            </button>
          </div>
        </td>
        <td className={`py-3 px-4 tabular-nums ${mutedCls} ${borderCls}`}>
          ${campaign.spend.toLocaleString()}
        </td>
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
            {campaign.status === "learning" && "● "}
            {campaign.status}
          </span>
        </td>
        <td className={`py-3 px-4 ${borderCls}`} onClick={(e) => e.stopPropagation()}>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded hover:bg-black/10"
            >
              ⋮
            </button>
            {menuOpen && (
              <div
                className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[160px] ${
                  isDark ? "bg-[#0a0a0e] border border-[#1a1810]" : "bg-white border border-gray-200"
                }`}
              >
                <button className="block w-full text-left px-3 py-1.5 text-xs hover:bg-black/5">
                  Edit Budget
                </button>
                <button className="block w-full text-left px-3 py-1.5 text-xs hover:bg-black/5">
                  Pause
                </button>
                <button className="block w-full text-left px-3 py-1.5 text-xs hover:bg-black/5">
                  View in Meta
                </button>
                <button className="block w-full text-left px-3 py-1.5 text-xs hover:bg-black/5">
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
              <td className={`py-2 px-4 pl-12 ${borderCls} ${mutedCls} text-sm`}>
                {ad.name}
              </td>
              <td className={`py-2 px-4 ${borderCls}`}>—</td>
              <td className={`py-2 px-4 tabular-nums ${mutedCls} ${borderCls}`}>
                ${ad.spend.toLocaleString()}
              </td>
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
    </>
  );
}

export function CampaignsTable({ campaigns }: Props) {
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
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${headerCls}`}>
          Campaigns
        </h2>
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
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
