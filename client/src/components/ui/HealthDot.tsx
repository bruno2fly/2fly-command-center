"use client";

export type HealthState = "green" | "yellow" | "red";

type Props = {
  state: HealthState;
  size?: "sm" | "md";
  label?: string;
  showLabel?: boolean;
};

const LABELS: Record<HealthState, string> = {
  green: "Healthy",
  yellow: "Warning",
  red: "At Risk",
};

const DOT_COLORS: Record<HealthState, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

export function HealthDot({ state, size = "sm", label, showLabel = false }: Props) {
  const sizeCls = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";
  const displayLabel = label ?? LABELS[state];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full shrink-0 ${sizeCls} ${DOT_COLORS[state]}`}
        title={displayLabel}
        aria-label={displayLabel}
      />
      {showLabel && (
        <span className="text-xs font-medium text-inherit">{displayLabel}</span>
      )}
    </span>
  );
}
