"use client";

import { useTheme } from "@/contexts/ThemeContext";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { ClientWeeklyReport } from "@/lib/api";

type Props = {
  reports: ClientWeeklyReport[];
};

function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function TrendChart({ reports }: Props) {
  const { isDark } = useTheme();
  const data = [...reports].reverse().map((r) => ({
    week: formatWeekLabel(r.weekStart),
    weekStart: r.weekStart,
    cpl: r.ads.cpl,
    leads: r.ads.leads,
  }));

  if (data.length === 0) return null;

  const stroke = isDark ? "#94a3b8" : "#64748b";
  const grid = isDark ? "rgba(100,116,139,0.2)" : "rgba(0,0,0,0.06)";

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={grid} />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: stroke }} stroke={stroke} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: stroke }} stroke={stroke} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: stroke }} stroke={stroke} />
          <Tooltip
            contentStyle={{
              backgroundColor: isDark ? "#1e293b" : "#fff",
              border: isDark ? "1px solid #334155" : "1px solid #e2e8f0",
              borderRadius: "8px",
            }}
            labelStyle={{ color: stroke }}
            formatter={(value: number, name: string) => [name === "cpl" ? `$${value.toFixed(2)}` : value, name === "cpl" ? "CPL" : "Leads"]}
            labelFormatter={(label) => `Week: ${label}`}
          />
          <Legend
            wrapperStyle={{ fontSize: "12px" }}
            formatter={(value) => (value === "cpl" ? "CPL" : "Leads")}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="cpl"
            name="cpl"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="leads"
            name="leads"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
