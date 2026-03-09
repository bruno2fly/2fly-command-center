"use client";

import { useTheme } from "@/contexts/ThemeContext";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { SpendDataPoint, RoasByCampaign, ConversionDataPoint } from "@/lib/client/mockAdsData";

type Props = {
  spendData: SpendDataPoint[];
  roasData: RoasByCampaign[];
  conversionsData: ConversionDataPoint[];
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function AdsChartsRow({ spendData, roasData, conversionsData }: Props) {
  const { isDark } = useTheme();

  const cardCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const gridCls = isDark ? "stroke-[#1a1810]" : "stroke-gray-100";
  const lineCls = isDark ? "#34d399" : "#059669";
  const barCls = isDark ? "#34d399" : "#059669";
  const areaCls = isDark ? "#3b82f6" : "#2563eb";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {/* Spend over time */}
      <div className={`rounded-xl border overflow-hidden ${cardCls}`}>
        <div className={`px-4 py-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
            Spend (Last 30 days)
          </h3>
        </div>
        <div className="h-[140px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={areaCls} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={areaCls} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className={gridCls} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10 }}
                stroke={isDark ? "#5a5040" : "#9ca3af"}
              />
              <YAxis tick={{ fontSize: 10 }} stroke={isDark ? "#5a5040" : "#9ca3af"} />
              <Tooltip
                formatter={(v) => [`$${Number(v).toFixed(0)}`, "Spend"]}
                labelFormatter={(l) => formatDate(String(l))}
                contentStyle={
                  isDark
                    ? { backgroundColor: "#0a0a0e", border: "1px solid #1a1810" }
                    : { backgroundColor: "white", border: "1px solid #e5e7eb" }
                }
              />
              <Area type="monotone" dataKey="spend" stroke={areaCls} fill="url(#spendGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ROAS by campaign */}
      <div className={`rounded-xl border overflow-hidden ${cardCls}`}>
        <div className={`px-4 py-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
            ROAS by Campaign
          </h3>
        </div>
        <div className="h-[140px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roasData} layout="vertical" margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className={gridCls} horizontal={false} />
              <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 10 }} stroke={isDark ? "#5a5040" : "#9ca3af"} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 9 }}
                stroke={isDark ? "#5a5040" : "#9ca3af"}
                tickFormatter={(v) => (v.length > 18 ? v.slice(0, 16) + "…" : v)}
              />
              <Tooltip
                formatter={(v) => [`${Number(v)}x`, "ROAS"]}
                contentStyle={
                  isDark
                    ? { backgroundColor: "#0a0a0e", border: "1px solid #1a1810" }
                    : { backgroundColor: "white", border: "1px solid #e5e7eb" }
                }
              />
              <Bar dataKey="roas" fill={barCls} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily conversions */}
      <div className={`rounded-xl border overflow-hidden ${cardCls}`}>
        <div className={`px-4 py-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
            Daily Conversions
          </h3>
        </div>
        <div className="h-[140px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={conversionsData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" className={gridCls} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 10 }}
                stroke={isDark ? "#5a5040" : "#9ca3af"}
              />
              <YAxis tick={{ fontSize: 10 }} stroke={isDark ? "#5a5040" : "#9ca3af"} />
              <Tooltip
                formatter={(v) => [v, "Conversions"]}
                labelFormatter={(l) => formatDate(String(l))}
                contentStyle={
                  isDark
                    ? { backgroundColor: "#0a0a0e", border: "1px solid #1a1810" }
                    : { backgroundColor: "white", border: "1px solid #e5e7eb" }
                }
              />
              <Line type="monotone" dataKey="conversions" stroke={lineCls} strokeWidth={2} dot={{ r: 2 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
