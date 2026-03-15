"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { HealthDashboard, FocusedActionFlow } from "@/components/overview";
import { DailyClientSummary } from "@/components/client-control/overview/DailyClientSummary";

type Props = {
  clientId: string;
  clientName?: string;
  onOpenTaskDetail?: (taskId: string) => void;
};

export function ClientOverviewTab({ clientId, clientName, onOpenTaskDetail }: Props) {
  const { isDark } = useTheme();
  const bgCls = isDark ? "bg-[#06060a]" : "bg-gray-50";

  return (
    <div className={`flex flex-col h-full overflow-auto ${bgCls}`}>
      <div className="p-4 space-y-6 max-w-4xl mx-auto w-full">
        {/* Daily Summary */}
        <section>
          <DailyClientSummary clientId={clientId} clientName={clientName} />
        </section>
        {/* Client Health */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Client Health
          </h2>
          <HealthDashboard clientId={clientId} />
        </section>
        {/* Focused Action Flow (includes agent proposals) */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Focused Action Flow
          </h2>
          <FocusedActionFlow
            clientId={clientId}
            clientName={clientName}
            onOpenTaskDetail={onOpenTaskDetail}
          />
        </section>
      </div>
    </div>
  );
}
