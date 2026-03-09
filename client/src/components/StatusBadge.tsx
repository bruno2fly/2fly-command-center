import type { Status } from "@/lib/statusLogic";

const COLORS: Record<Status, string> = {
  green: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  yellow: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  red: "bg-red-500/20 text-red-400 border-red-500/30",
};

const DOTS: Record<Status, string> = {
  green: "bg-emerald-400",
  yellow: "bg-amber-400",
  red: "bg-red-400",
};

type Props = {
  status: Status;
  label?: string;
};

export function StatusBadge({ status, label }: Props) {
  const color = COLORS[status];
  const dot = DOTS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label ?? status.toUpperCase()}
    </span>
  );
}
