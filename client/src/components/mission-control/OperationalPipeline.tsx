"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { getRequests } from "@/lib/client/mockClientTabData";
import type { ControlItem } from "@/lib/client/mockClientControlData";
import type { ClientHealth } from "@/lib/client/mockClientControlData";

type Props = {
  clientId: string;
  controlItems: ControlItem[];
  health: ClientHealth | null;
};

const STAGES = [
  { id: "requests", label: "Requests" },
  { id: "in_progress", label: "In Progress" },
  { id: "waiting_team", label: "Waiting on Team" },
  { id: "waiting_client", label: "Waiting on Client" },
  { id: "approval", label: "Approval" },
  { id: "delivered", label: "Scheduled / Delivered" },
  { id: "payment_risk", label: "Payment Risk" },
] as const;

function countByStage(
  clientId: string,
  controlItems: ControlItem[],
  health: ClientHealth | null
): Record<string, number> {
  const requests = getRequests(clientId);
  const inProgress = controlItems.filter(
    (c) => c.status === "in_progress" || (c.kind === "action" && c.owner === "me")
  ).length;
  const waitingTeam = controlItems.filter(
    (c) => c.owner === "team" && c.status === "pending"
  ).length;
  const waitingClient =
    controlItems.filter((c) => c.kind === "blocker").length +
    requests.filter((r) => r.stage === "in_review").length;
  const approval = controlItems.filter((c) => c.kind === "approval").length;
  const delivered = health
    ? health.deliveryStatus === "ok"
      ? 1
      : 0
    : 0;
  const paymentRisk =
    health?.paymentStatus === "overdue" ? (health.paymentDaysOverdue ?? 1) : 0;

  return {
    requests: requests.filter((r) => r.stage === "new" || r.stage === "in_review").length,
    in_progress: inProgress + requests.filter((r) => r.stage === "in_progress").length,
    waiting_team: waitingTeam,
    waiting_client: waitingClient,
    approval,
    delivered,
    payment_risk: paymentRisk,
  };
}

export function OperationalPipeline({
  clientId,
  controlItems,
  health,
}: Props) {
  const { isDark } = useTheme();
  const counts = countByStage(clientId, controlItems, health);

  return (
    <section
      className={`rounded-xl border overflow-hidden ${
        isDark
          ? "bg-[#0a0a0e]/60 border-[#1a1810]"
          : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`px-4 py-3 border-b ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-[#8a7e6d]" : "text-gray-600"
          }`}
        >
          Operational Pipeline
        </h2>
      </div>
      <div className="flex overflow-x-auto">
        {STAGES.map((stage) => {
          const count = counts[stage.id] ?? 0;
          const hasRisk = stage.id === "payment_risk" && count > 0;
          const isActive = count > 0 && stage.id !== "payment_risk";

          return (
            <div
              key={stage.id}
              className={`flex-shrink-0 min-w-[100px] px-4 py-3 border-r last:border-r-0 ${
                isDark ? "border-[#1a1810]" : "border-gray-100"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isDark ? "text-[#8a7e6d]" : "text-gray-500"
                }`}
              >
                {stage.label}
              </p>
              <p
                className={`mt-1 text-lg font-bold ${
                  hasRisk
                    ? "text-red-400"
                    : isActive
                      ? isDark
                        ? "text-emerald-400"
                        : "text-emerald-600"
                      : isDark
                        ? "text-[#5a5040]"
                        : "text-gray-400"
                }`}
              >
                {count}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
