"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getAdsKPIData,
  getAgentActions,
  getAdsAlertsEnhanced,
  getAdsCampaignsEnhanced,
  getSpendOverTime,
  getRoasByCampaign,
  getConversionsOverTime,
} from "@/lib/client/mockAdsData";
import {
  AdsKPIBar,
  AgentActionsPanel,
  AlertsInsights,
  CampaignsTable,
  AdsChartsRow,
} from "@/components/client-control/ads";

type Props = {
  clientId: string;
};

const cardVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: "easeOut" },
  }),
};

export function ClientAdsTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [agentActions, setAgentActions] = useState(() => getAgentActions(clientId));

  const kpiData = getAdsKPIData(clientId);
  const alerts = getAdsAlertsEnhanced(clientId);
  const campaigns = getAdsCampaignsEnhanced(clientId);
  const spendData = getSpendOverTime(clientId);
  const roasData = getRoasByCampaign(clientId);
  const conversionsData = getConversionsOverTime(clientId);

  const handleApprove = useCallback((id: string) => {
    setAgentActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "approved" as const, reviewedAt: new Date().toISOString(), reviewedBy: "me" } : a
      )
    );
  }, []);

  const handleReject = useCallback((id: string) => {
    setAgentActions((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: "rejected" as const, reviewedAt: new Date().toISOString(), reviewedBy: "me" } : a
      )
    );
  }, []);

  const bgCls = isDark ? "bg-zinc-950" : "bg-gray-50";

  return (
    <div className={`flex flex-col min-h-0 overflow-auto ${bgCls}`}>
      {/* Section 1: Top KPI Bar */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
        <AdsKPIBar data={kpiData} />
      </motion.div>

      {/* Section 5: Quick Charts Row */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
        <AdsChartsRow
          spendData={spendData}
          roasData={roasData}
          conversionsData={conversionsData}
        />
      </motion.div>

      {/* Section 2 + 4: Agent Actions (left) + Alerts (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-4">
        <div className="lg:col-span-7">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <AgentActionsPanel
              actions={agentActions}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          </motion.div>
        </div>
        <div className="lg:col-span-5">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <AlertsInsights alerts={alerts} />
          </motion.div>
        </div>
      </div>

      {/* Section 3: Campaigns Table */}
      <div className="flex-1 min-h-0 p-4">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4} className="h-full">
          <CampaignsTable campaigns={campaigns} />
        </motion.div>
      </div>
    </div>
  );
}
