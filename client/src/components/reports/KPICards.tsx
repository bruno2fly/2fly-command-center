"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Trend = string | null;

type Props = {
  spend: number;
  leads: number;
  cpl: number;
  ctr: number;
  spendChange: Trend;
  leadsChange: Trend;
  cplChange: Trend;
  ctrChange: Trend;
};

function trendColor(trend: Trend): string {
  if (!trend) return "text-gray-500";
  const num = parseFloat(trend.replace("%", ""));
  if (num > 0) return "text-emerald-500";
  if (num < 0) return "text-red-500";
  return "text-gray-500";
}

function trendArrow(trend: Trend, inverseGood = false): string {
  if (!trend) return "";
  const num = parseFloat(trend.replace("%", ""));
  if (num > 0) return inverseGood ? "↓" : "↑";
  if (num < 0) return inverseGood ? "↑" : "↓";
  return "→";
}

export function KPICards({
  spend,
  leads,
  cpl,
  ctr,
  spendChange,
  leadsChange,
  cplChange,
  ctrChange,
}: Props) {
  const { isDark } = useTheme();
  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)] border-gray-700" : "bg-white border-gray-200";
  const labelCls = isDark ? "text-gray-400" : "text-gray-500";
  const valueCls = isDark ? "text-[#e8e0d4]" : "text-gray-900";

  const items = [
    { label: "Spend", value: `$${spend.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, change: spendChange, inverse: false },
    { label: "Leads", value: String(leads), change: leadsChange, inverse: false },
    { label: "CPL", value: `$${cpl.toFixed(2)}`, change: cplChange, inverse: true },
    { label: "CTR", value: `${ctr.toFixed(2)}%`, change: ctrChange, inverse: false },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map(({ label, value, change, inverse }) => (
        <div key={label} className={`rounded-xl border p-4 ${cardBg}`}>
          <p className={`text-xs font-medium uppercase tracking-wider ${labelCls}`}>{label}</p>
          <p className={`text-lg font-semibold mt-0.5 ${valueCls}`}>{value}</p>
          {change && (
            <p className={`text-xs font-medium mt-1 ${trendColor(change)}`}>
              {trendArrow(change, inverse)} {change}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
