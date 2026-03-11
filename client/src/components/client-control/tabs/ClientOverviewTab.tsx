"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { HealthDashboard, FocusedActionFlow } from "@/components/overview";

type Props = {
  clientId: string;
  clientName?: string;
};

export function ClientOverviewTab({ clientId, clientName }: Props) {
  const { isDark } = useTheme();
  const bgCls = isDark ? "bg-[#06060a]" : "bg-gray-50";

  return (
    <div className={`flex flex-col h-full overflow-auto ${bgCls}`}>
      <div className="p-4 space-y-6 max-w-4xl mx-auto w-full">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Client Health
          </h2>
          <HealthDashboard clientId={clientId} />
        </section>
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Focused Action Flow
          </h2>
          <FocusedActionFlow clientId={clientId} clientName={clientName} />
        </section>
      </div>
    </div>
  );
}
