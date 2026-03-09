import { StatusChip } from "./StatusChip";
import type { Status } from "@/lib/statusLogic";

type Props = {
  title: string;
  value: React.ReactNode;
  description?: React.ReactNode;
  status?: Status;
  statusLabel?: string;
  action?: React.ReactNode;
};

export function MetricCard({
  title,
  value,
  description,
  status,
  statusLabel,
  action,
}: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {title}
      </p>
      <p className="text-3xl font-bold text-blue-600 mt-2">{value}</p>
      {(description || status) && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {description}
          {status && statusLabel && (
            <StatusChip
              status={status}
              label={statusLabel}
              variant="status"
            />
          )}
        </div>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
