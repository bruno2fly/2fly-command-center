"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getClientHealth,
  getInsights,
  getIdeas,
  getControlItems,
  getInboxItems,
} from "@/lib/client/mockClientControlData";
import { getTasks, getKpis } from "@/lib/client/mockClientTabData";
import { getRequests } from "@/lib/client/mockClientTabData";
import type { TaskItem } from "@/lib/client/mockClientTabData";
import type { RequestItem } from "@/lib/client/mockClientTabData";
import {
  HealthPerformanceStrip,
  CriticalBlockersPanel,
  WorkbenchPanel,
  ActivityLog,
  QuickActionsPanel,
  PipelineSummary,
  IdeasPanel,
} from "@/components/client-control/overview";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

const ACTIVITY_MOCK = [
  { id: "a1", text: "M. Tanaka linked creative to Slack", time: "1m ago" },
  { id: "a2", text: "Ad copy approved by client", time: "12m ago" },
  { id: "a3", text: "Invoice reminder sent", time: "1h ago" },
  { id: "a4", text: "Hero image draft uploaded", time: "2h ago" },
  { id: "a5", text: "Spring campaign brief updated", time: "3h ago" },
  { id: "a6", text: "UGC testimonial in review", time: "5h ago" },
  { id: "a7", text: "Contact form fix deployed", time: "6h ago" },
  { id: "a8", text: "Weekly sync completed", time: "1d ago" },
];

const cardVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.03, duration: 0.2, ease: "easeOut" },
  }),
};

type Props = {
  clientId: string;
};

export function ClientOverviewTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const health = getClientHealth(clientId);
  const insights = getInsights(clientId);
  const ideas = getIdeas(clientId);
  const tasks = getTasks(clientId);
  const requests = getRequests(clientId);
  const controlItems = getControlItems(clientId);
  const inboxItems = getInboxItems(clientId);
  const kpis = getKpis(clientId);

  const contentDeliveryPct = useMemo(() => {
    const kpi = kpis.find((k) => k.name === "Content delivery");
    if (kpi?.value) return parseInt(kpi.value, 10) || 98;
    return 98;
  }, [kpis]);

  const activityEntries =
    insights.length > 0
      ? insights.slice(0, 8).map((s) => ({ id: s.id, text: s.text, time: formatTime(s.createdAt) }))
      : ACTIVITY_MOCK;

  const bgCls = isDark ? "bg-zinc-950" : "bg-gray-50";

  return (
    <div className={`flex flex-col h-full overflow-auto ${bgCls}`}>
      {/* Health + Performance strip */}
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
        <HealthPerformanceStrip
          health={health}
          kpis={kpis}
          contentDeliveryPct={contentDeliveryPct}
        />
      </motion.div>

      {/* 3-column operational layout */}
      <div className="flex-1 min-h-0 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT COLUMN ~25% */}
        <div className="lg:col-span-3 space-y-4">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <CriticalBlockersPanel
              controlItems={controlItems}
              health={health}
              inboxItems={inboxItems}
            />
          </motion.div>
        </div>

        {/* CENTER COLUMN ~50% */}
        <div className="lg:col-span-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <WorkbenchPanel
              tasks={tasks}
              requests={requests}
              controlItems={controlItems}
            />
          </motion.div>
        </div>

        {/* RIGHT COLUMN ~25% */}
        <div className="lg:col-span-3 space-y-4">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <ActivityLog entries={activityEntries} />
          </motion.div>
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
            <QuickActionsPanel />
          </motion.div>
        </div>
      </div>

      {/* Pipeline summary below 3 columns */}
      <div className="px-4 pb-4">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={5}>
          <PipelineSummary
            tasks={tasks}
            requests={requests}
            controlItems={controlItems}
          />
        </motion.div>
      </div>

      {/* Ideas section — lighter, below pipeline */}
      <div className="px-4 pb-4">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}>
          <IdeasPanel ideas={ideas} />
        </motion.div>
      </div>
    </div>
  );
}
