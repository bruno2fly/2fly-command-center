"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { ApiRequestItem, ApiContentItem } from "@/lib/api";
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
import type { ClientHealth } from "@/lib/client/mockClientControlData";
import type { BlockerItem } from "@/components/client-control/overview/CriticalBlockersPanel";
import type { ActivityEntry } from "@/components/client-control/overview/ActivityLog";
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

/** Map API request status to mock RequestItem.stage */
function apiStatusToStage(status: string): RequestItem["stage"] {
  switch (status) {
    case "new":
      return "new";
    case "acknowledged":
    case "in_progress":
    case "waiting_client":
      return "in_progress";
    case "review":
      return "in_review";
    case "completed":
    case "closed":
      return "done";
    default:
      return "in_progress";
  }
}

function apiRequestToRequestItem(r: ApiRequestItem): RequestItem {
  return {
    id: r.id,
    clientId: r.clientId,
    title: r.title,
    stage: apiStatusToStage(r.status),
    source: r.type ?? "Request",
    createdAt: r.createdAt,
    dueAt: r.dueDate ?? null,
  };
}

const ACTIVITY_MOCK: ActivityEntry[] = [
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

  // API data (null = not loaded or failed → use mock)
  const [apiClient, setApiClient] = useState<Awaited<ReturnType<typeof api.getClient>> | null>(null);
  const [apiRequests, setApiRequests] = useState<ApiRequestItem[] | null>(null);
  const [apiContent, setApiContent] = useState<ApiContentItem[] | null>(null);
  const [apiHealthClients, setApiHealthClients] = useState<Array<{ clientId: string; overall?: string; modules?: Record<string, { bufferDays?: number; status?: string }> }> | null>(null);
  const [apiPayments, setApiPayments] = useState<Awaited<ReturnType<typeof api.getPayments>> | null>(null);

  const fetchApi = useCallback(() => {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    Promise.all([
      api.getClient(clientId).then(setApiClient).catch(() => {}),
      api.getRequestsRaw(clientId).then((d) => setApiRequests(d.requests ?? [])).catch(() => {}),
      api.getContentItems(clientId).then(setApiContent).catch(() => {}),
      api.getHealth().then((h) => setApiHealthClients((h as { clients?: Array<{ clientId?: string; overall?: string; modules?: Record<string, unknown> }> }).clients ?? null)).catch(() => {}),
      api.getPayments().then(setApiPayments).catch(() => {}),
    ]).catch(() => {});
  }, [clientId]);

  useEffect(() => {
    fetchApi();
  }, [fetchApi]);

  // —— Fallback mock data ——
  const healthMock = getClientHealth(clientId);
  const insights = getInsights(clientId);
  const ideas = getIdeas(clientId);
  const tasksMock = getTasks(clientId);
  const requestsMock = getRequests(clientId);
  const controlItems = getControlItems(clientId);
  const inboxItems = getInboxItems(clientId);
  const kpisMock = getKpis(clientId);

  // —— Requests: API or mock ——
  const requests: RequestItem[] = useMemo(() => {
    if (apiRequests && apiRequests.length >= 0) {
      return apiRequests.map(apiRequestToRequestItem);
    }
    return requestsMock;
  }, [apiRequests, requestsMock]);

  // —— Critical blockers from API: new/acknowledged + (urgent/high | slaBreach | past due) + overdue invoice ——
  const apiBlockers = useMemo((): BlockerItem[] | undefined => {
    if (!apiRequests && apiPayments == null && !apiClient) return undefined;
    const now = new Date();
    const list: BlockerItem[] = [];
    const clientName = apiClient?.name;

    if (apiRequests) {
      for (const r of apiRequests) {
        const isNewOrAck = r.status === "new" || r.status === "acknowledged";
        const isUrgentOrHigh = r.priority === "urgent" || r.priority === "high";
        const isPastDue = r.dueDate ? new Date(r.dueDate) < now : false;
        if (isNewOrAck && (isUrgentOrHigh || r.slaBreach || isPastDue)) {
          list.push({
            id: `req-${r.id}`,
            title: r.title,
            reason: r.slaBreach ? "SLA breach" : isPastDue ? "Past due" : "High priority",
            delayIndicator: r.dueDate ? `${Math.ceil((new Date(r.dueDate).getTime() - now.getTime()) / 86400000)}d` : undefined,
            severity: r.slaBreach || isPastDue ? "critical" : "warning",
          });
        }
      }
    }

    if (apiPayments?.overdue && clientName) {
      const clientOverdue = apiPayments.overdue.filter(
        (o) => (o as { clientName?: string }).clientName === clientName
      );
      if (clientOverdue.length > 0) {
        const first = clientOverdue[0] as { daysOverdue?: number };
        const days = first.daysOverdue ?? 0;
        list.push({
          id: "invoice-overdue",
          title: "Invoice overdue",
          reason: `Payment ${days} days late`,
          delayIndicator: `${days}d`,
          severity: "critical",
        });
      }
    }
    return list;
  }, [apiRequests, apiPayments, apiClient]);

  // —— Health: from API health (by clientId) + payment overdue from payments ——
  const health: ClientHealth | null = useMemo(() => {
    const base = apiHealthClients
      ? (() => {
          const c = apiHealthClients.find((h) => h.clientId === clientId);
          if (!c) return healthMock;
          const mod = c.modules ?? {};
          const contentBuffer = mod.contentBuffer as { bufferDays?: number; status?: string } | undefined;
          return {
            websiteStatus: "unknown" as const,
            websiteLastChecked: new Date().toISOString(),
            formsOk: true,
            adsStatus: "unknown" as const,
            adsPacing: "—",
            adsRoasTrend: "—",
            paymentStatus: "pending" as const,
            deliveryStatus: (contentBuffer?.status === "red" ? "late" : contentBuffer?.status === "yellow" ? "at_risk" : "ok") as "ok" | "at_risk" | "late",
            deliveryBufferDays: contentBuffer?.bufferDays ?? 0,
            missedPromises: 0,
          };
        })()
      : healthMock;
    if (!apiPayments?.overdue || !apiClient?.name) return base;
    const clientOverdue = apiPayments.overdue.filter(
      (o) => (o as { clientName?: string }).clientName === apiClient.name
    );
    if (clientOverdue.length === 0) return base;
    const first = clientOverdue[0] as { daysOverdue?: number };
    return {
      ...base,
      paymentStatus: "overdue" as const,
      paymentDaysOverdue: first.daysOverdue ?? 0,
    };
  }, [apiHealthClients, clientId, apiPayments, apiClient, healthMock]);

  // —— Content %: (delivered + scheduled) / total from API content ——
  const contentDeliveryPct = useMemo(() => {
    if (apiContent && apiContent.length > 0) {
      const deliveredOrScheduled = apiContent.filter(
        (c) => c.status === "published" || c.status === "scheduled" || c.status === "delivered"
      ).length;
      return Math.round((deliveredOrScheduled / apiContent.length) * 100);
    }
    const kpi = kpisMock.find((k) => k.name === "Content delivery");
    if (kpi?.value) return parseInt(kpi.value, 10) || 98;
    return 98;
  }, [apiContent, kpisMock]);

  // —— Workbench: requests with status in_progress or acknowledged (API: in_progress, acknowledged; mock: in_progress, in_review) ——
  const workbenchRequests = useMemo(() => {
    return requests.filter((r) => r.stage === "in_progress" || r.stage === "in_review");
  }, [requests]);

  // —— Pipeline counts from API requests ——
  const pipelineCounts = useMemo((): Record<string, number> | undefined => {
    if (!apiRequests) return undefined;
    const counts = {
      requests: 0,
      in_progress: 0,
      waiting_client: 0,
      review: 0,
      delivered: 0,
    };
    for (const r of apiRequests) {
      if (r.status === "new") counts.requests++;
      else if (r.status === "in_progress" || r.status === "acknowledged") counts.in_progress++;
      else if (r.status === "waiting_client") counts.waiting_client++;
      else if (r.status === "review") counts.review++;
      else if (r.status === "completed" || r.status === "closed") counts.delivered++;
    }
    return counts;
  }, [apiRequests]);

  // —— Activity: recent 5 requests by updatedAt (API) or mock ——
  const activityEntries = useMemo((): ActivityEntry[] => {
    if (apiRequests && apiRequests.length > 0) {
      const sorted = [...apiRequests].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return sorted.slice(0, 5).map((r) => ({
        id: r.id,
        text: `${r.status} – ${r.title}`,
        time: formatTime(r.updatedAt),
      }));
    }
    if (insights.length > 0) {
      return insights.slice(0, 8).map((s) => ({
        id: s.id,
        text: s.text,
        time: formatTime(s.createdAt),
      }));
    }
    return ACTIVITY_MOCK;
  }, [apiRequests, insights]);

  // KPIs: use mock for MQLs, ROAS, Website; strip already uses health (payment) and contentDeliveryPct
  const kpis = kpisMock;
  const tasks = tasksMock;
  const bgCls = isDark ? "bg-zinc-950" : "bg-gray-50";

  return (
    <div className={`flex flex-col h-full overflow-auto ${bgCls}`}>
      <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={0}>
        <HealthPerformanceStrip
          health={health}
          kpis={kpis}
          contentDeliveryPct={contentDeliveryPct}
        />
      </motion.div>

      <div className="flex-1 min-h-0 p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={1}>
            <CriticalBlockersPanel
              controlItems={controlItems}
              health={health}
              inboxItems={inboxItems}
              blockers={apiBlockers}
            />
          </motion.div>
        </div>

        <div className="lg:col-span-6">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={2}>
            <WorkbenchPanel
              tasks={tasks}
              requests={workbenchRequests}
              controlItems={controlItems}
            />
          </motion.div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={3}>
            <ActivityLog entries={activityEntries} />
          </motion.div>
          <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={4}>
            <QuickActionsPanel />
          </motion.div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={5}>
          <PipelineSummary
            tasks={tasks}
            requests={requests}
            controlItems={controlItems}
            pipelineCounts={pipelineCounts}
          />
        </motion.div>
      </div>

      <div className="px-4 pb-4">
        <motion.div variants={cardVariants} initial="hidden" animate="visible" custom={6}>
          <IdeasPanel ideas={ideas} />
        </motion.div>
      </div>
    </div>
  );
}
