"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { MetricStatusCard } from "./MetricStatusCard";
import type { ClientHealth } from "@/lib/client/mockClientControlData";
import type { ClientKpi } from "@/lib/client/mockClientTabData";

type Props = {
  health: ClientHealth | null;
  kpis: ClientKpi[];
  contentDeliveryPct?: number;
};

export function HealthPerformanceStrip({ health, kpis, contentDeliveryPct = 98 }: Props) {
  const { isDark } = useTheme();

  const mqls = kpis.find((k) => k.name === "MQLs")?.value ?? "—";
  const roas = kpis.find((k) => k.name === "ROAS")?.value ?? "—";

  const websiteStatus =
    health?.websiteStatus === "up"
      ? "Up"
      : health?.websiteStatus === "down"
        ? "Down"
        : "—";
  const websiteOk = health?.websiteStatus === "up";

  const paymentStatus =
    health?.paymentStatus === "paid"
      ? "Paid"
      : health?.paymentStatus === "overdue"
        ? `${health.paymentDaysOverdue ?? 0}d overdue`
        : "Pending";
  const paymentOk = health?.paymentStatus === "paid";
  const paymentCritical = health?.paymentStatus === "overdue";

  const deliveryPct =
    contentDeliveryPct ??
    (health?.deliveryStatus === "ok" ? 98 : health?.deliveryStatus === "at_risk" ? 85 : 72);
  const deliveryOk = health?.deliveryStatus === "ok";

  const stripCls = isDark
    ? "bg-[#08080c] border-b border-[#1a1810]"
    : "bg-gray-100/80 border-b border-gray-200";

  return (
    <div className={`flex items-center gap-3 px-4 py-2 overflow-x-auto ${stripCls}`}>
      <MetricStatusCard label="MQLs" value={mqls} />
      <MetricStatusCard label="ROAS" value={roas} />
      <MetricStatusCard
        label="Website"
        value={websiteStatus}
        status={websiteOk ? "ok" : websiteStatus === "Down" ? "critical" : "neutral"}
      />
      <MetricStatusCard
        label="Payment"
        value={paymentStatus}
        status={paymentCritical ? "critical" : paymentOk ? "ok" : "warning"}
      />
      <MetricStatusCard
        label="Content %"
        value={`${deliveryPct}%`}
        status={deliveryOk ? "ok" : deliveryPct < 90 ? "warning" : "neutral"}
      />
    </div>
  );
}
