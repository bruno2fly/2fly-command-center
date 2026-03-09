"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import type { AdsKPIData } from "@/lib/client/mockAdsData";

type Props = {
  data: AdsKPIData;
};

function MiniSparkline({ data, color, id }: { data: number[]; color: string; id?: string }) {
  const chartData = data.map((v, i) => ({ v, i }));
  const gradId = id ?? `grad-${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <ResponsiveContainer width="100%" height={24}>
      <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#${gradId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function AdsKPIBar({ data }: Props) {
  const { isDark } = useTheme();

  const cardCls = isDark
    ? "bg-[#0a0a0e]/80 border-[#1a1810] hover:border-[#2a2018]"
    : "bg-white/80 border-gray-200 hover:border-gray-300";
  const labelCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const upCls = isDark ? "text-emerald-400" : "text-emerald-600";
  const downCls = isDark ? "text-red-400" : "text-red-600";

  const trendIcon = (dir: "up" | "down" | "flat") =>
    dir === "up" ? "↑" : dir === "down" ? "↓" : "→";

  return (
    <div className="flex flex-wrap gap-3 p-4 overflow-x-auto">
      {/* Spend */}
      <div className={`flex flex-col gap-1 min-w-[140px] p-3 rounded-xl border ${cardCls}`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${labelCls}`}>Spend (MTD)</p>
        <p className={`text-lg font-bold tabular-nums ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
          ${data.spend.toLocaleString()}
        </p>
        <p className={`text-[10px] ${labelCls}`}>
          / ${data.spendBudget.toLocaleString()} budget — {data.spendPacedPct}% paced
        </p>
        <div className="mt-1 h-6 -mx-1">
          <MiniSparkline data={data.spendTrend} color={isDark ? "#34d399" : "#059669"} id="spend-spark" />
        </div>
      </div>

      {/* ROAS */}
      <div className={`flex flex-col gap-1 min-w-[100px] p-3 rounded-xl border ${cardCls}`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${labelCls}`}>ROAS</p>
        <div className="flex items-baseline gap-1">
          <p className={`text-lg font-bold tabular-nums ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            {data.roas}x
          </p>
          <span className={`text-xs font-medium ${data.roasTrendDir === "up" ? upCls : data.roasTrendDir === "down" ? downCls : labelCls}`}>
            {trendIcon(data.roasTrendDir)} {data.roasTrend}
          </span>
        </div>
        <div className="mt-1 h-6 -mx-1">
          <MiniSparkline data={data.spendTrend.map((_, i) => data.roas - 0.2 + (i * 0.05) + Math.sin(i) * 0.1)} color={isDark ? "#34d399" : "#059669"} id="roas-spark" />
        </div>
      </div>

      {/* CPA */}
      <div className={`flex flex-col gap-1 min-w-[90px] p-3 rounded-xl border ${cardCls}`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${labelCls}`}>CPA</p>
        <div className="flex items-baseline gap-1">
          <p className={`text-lg font-bold tabular-nums ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            ${data.cpa}
          </p>
          <span className={`text-xs ${data.cpaTrend.startsWith("-") ? upCls : downCls}`}>
            {data.cpaTrend}
          </span>
        </div>
      </div>

      {/* CTR */}
      <div className={`flex flex-col gap-1 min-w-[90px] p-3 rounded-xl border ${cardCls}`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${labelCls}`}>CTR</p>
        <div className="flex items-baseline gap-1">
          <p className={`text-lg font-bold tabular-nums ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            {data.ctr}%
          </p>
          <span className={`text-xs ${data.ctrTrend.startsWith("+") ? upCls : downCls}`}>
            {data.ctrTrend}
          </span>
        </div>
      </div>

      {/* Conversions */}
      <div className={`flex flex-col gap-1 min-w-[90px] p-3 rounded-xl border ${cardCls}`}>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${labelCls}`}>Conversions</p>
        <div className="flex items-baseline gap-1">
          <p className={`text-lg font-bold tabular-nums ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            {data.conversions}
          </p>
          <span className={`text-xs ${data.conversionsTrend.startsWith("+") ? upCls : downCls}`}>
            {data.conversionsTrend}
          </span>
        </div>
      </div>
    </div>
  );
}
