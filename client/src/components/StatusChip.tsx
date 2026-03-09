import type { Status } from "@/lib/statusLogic";

const COLORS: Record<Status, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  yellow: "bg-amber-100 text-amber-800 border-amber-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

const NEUTRAL = "bg-gray-100 text-gray-700 border-gray-200";

type Props = {
  status?: Status;
  label: string;
  variant?: "status" | "neutral";
};

export function StatusChip({ status, label, variant = "status" }: Props) {
  const className =
    variant === "status" && status
      ? COLORS[status]
      : NEUTRAL;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border ${className}`}
    >
      {variant === "status" && status && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            status === "green"
              ? "bg-emerald-500"
              : status === "yellow"
                ? "bg-amber-500"
                : "bg-red-500"
          }`}
        />
      )}
      {label}
    </span>
  );
}
