"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type StatusVariant = "healthy" | "at_risk" | "critical" | "pending" | "waiting_client" | "waiting_team";

const VARIANTS: Record<
  StatusVariant,
  { dark: string; light: string; dot: string }
> = {
  healthy: {
    dark: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    light: "bg-emerald-100 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
  },
  at_risk: {
    dark: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    light: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  critical: {
    dark: "bg-red-500/20 text-red-400 border-red-500/30",
    light: "bg-red-100 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
  pending: {
    dark: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    light: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  waiting_client: {
    dark: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    light: "bg-amber-100 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  waiting_team: {
    dark: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    light: "bg-blue-100 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
  },
};

type Props = {
  variant: StatusVariant;
  label?: string;
  showDot?: boolean;
};

export function MissionStatusBadge({ variant, label, showDot = true }: Props) {
  const { isDark } = useTheme();
  const v = VARIANTS[variant];
  const styles = isDark ? v.dark : v.light;

  const defaultLabels: Record<StatusVariant, string> = {
    healthy: "Healthy",
    at_risk: "At Risk",
    critical: "Critical",
    pending: "Pending",
    waiting_client: "Waiting on Client",
    waiting_team: "Waiting on Team",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${styles}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.dot}`} />}
      {label ?? defaultLabels[variant]}
    </span>
  );
}
