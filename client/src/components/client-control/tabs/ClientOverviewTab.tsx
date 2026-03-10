"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { ApiRequestItem, ApiContentItem } from "@/lib/api";
import {
  getClientHealth,
  getInsights,
  getIdeas,
  getControlItems,
  getInboxItems,
  getClientControlMeta,
} from "@/lib/client/mockClientControlData";
import { getTasks, getKpis } from "@/lib/client/mockClientTabData";
import { getRequests } from "@/lib/client/mockClientTabData";
import type { TaskItem } from "@/lib/client/mockClientTabData";
import type { RequestItem } from "@/lib/client/mockClientTabData";
import type { ClientHealth } from "@/lib/client/mockClientControlData";
import type { BlockerItem } from "@/components/client-control/overview/CriticalBlockersPanel";
import type { ActionQueueItem, ActionQueuePriority } from "@/components/client-control/overview/ActionQueue";
import type { ActivityTimelineEntry } from "@/components/client-control/overview/ActivityTimeline";
import { getAdsKPIData } from "@/lib/client/mockAdsData";
import {
  OverviewKPIStrip,
  ActionQueue,
  PipelineBar,
  ActivityTimeline,
  QuickActionsCompact,
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

type Props = {
  clientId: string;
};

export function ClientOverviewTab({ clientId }: Props) {
  const { isDark } = useTheme();

  const [apiClient, setApiClient] = useState<Awaited<ReturnType<typeof api.getClient>> | null>(null);
  const [apiRequests, setApiRequests] = useState<ApiRequestItem[] | null>(null);
  const [apiContent, setApiContent] = useState<ApiContentItem[] | null>(null);
  const [apiHealthClients, setApiHealthClients] = useState<
    Array<{ clientId?: string; overall?: string; modules?: Record<string, { bufferDays?: number; status?: string }> }>
  | null>(null);
  const [apiPayments, setApiPayments] = useState<Awaited<ReturnType<typeof api.getPayments>> | null>(null);

  const fetchApi = useCallback(() => {
    Promise.all([
      api.getClient(clientId).then(setApiClient).catch(() => {}),
      api.getRequestsRaw(clientId).then((d) => setApiRequests(d.requests ?? [])).catch(() => {}),
      api.getContentItems(clientId).then(setApiContent).catch(() => {}),
      api
        .getHealth()
        .then((h) =>
          setApiHealthClients(
            (h as { clients?: Array<{ clientId?: string; overall?: string; modules?: Record<string, { bufferDays?: number; status?: string }> }> })
              .clients ?? null
          )
        )
        .catch(() => {}),
      api.getPayments().then(setApiPayments).catch(() => {}),
    ]).catch(() => {});
  }, [clientId]);

  useEffect(() => {
    fetchApi();
  }, [fetchApi]);

  const healthMock = getClientHealth(clientId);
  const insights = getInsights(clientId);
  const ideas = getIdeas(clientId);
  const tasksMock = getTasks(clientId);
  const requestsMock = getRequests(clientId);
  const controlItems = getControlItems(clientId);
  const inboxItems = getInboxItems(clientId);
  const kpisMock = getKpis(clientId);
  const meta = getClientControlMeta(clientId);
  const adsKpi = getAdsKPIData(clientId);

  const requests: RequestItem[] = useMemo(() => {
    if (apiRequests && apiRequests.length >= 0) return apiRequests.map(apiRequestToRequestItem);
    return requestsMock;
  }, [apiRequests, requestsMock]);

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
            delayIndicator: r.dueDate
              ? `${Math.ceil((new Date(r.dueDate).getTime() - now.getTime()) / 86400000)}d`
              : undefined,
            severity: r.slaBreach || isPastDue ? "critical" : "warning",
          });
        }
      }
    }

    if (apiPayments?.overdue && clientName) {
      const clientOverdue = apiPayments.overdue.filter((o) => (o as { clientName?: string }).clientName === clientName);
      if (clientOverdue.length > 0) {
        const first = clientOverdue[0] as { daysOverdue?: number };
        list.push({
          id: "invoice-overdue",
          title: "Invoice overdue",
          reason: `Payment ${first.daysOverdue ?? 0} days late`,
          delayIndicator: `${first.daysOverdue ?? 0}d`,
          severity: "critical",
        });
      }
    }
    return list;
  }, [apiRequests, apiPayments, apiClient]);

  const health = useMemo((): ClientHealth | null => {
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
            deliveryStatus: (contentBuffer?.status === "red"
              ? "late"
              : contentBuffer?.status === "yellow"
                ? "at_risk"
                : "ok") as "ok" | "at_risk" | "late",
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
    return { ...base, paymentStatus: "overdue" as const, paymentDaysOverdue: first.daysOverdue ?? 0 } as ClientHealth;
  }, [apiHealthClients, clientId, apiPayments, apiClient, healthMock]);

  const workbenchRequests = useMemo(
    () => requests.filter((r) => r.stage === "in_progress" || r.stage === "in_review"),
    [requests]
  );

  const pipelineCounts = useMemo((): Record<string, number> => {
    if (apiRequests) {
      const counts = { requests: 0, in_progress: 0, waiting_client: 0, review: 0, delivered: 0 };
      for (const r of apiRequests) {
        if (r.status === "new") counts.requests++;
        else if (r.status === "in_progress" || r.status === "acknowledged") counts.in_progress++;
        else if (r.status === "waiting_client") counts.waiting_client++;
        else if (r.status === "review") counts.review++;
        else if (r.status === "completed" || r.status === "closed") counts.delivered++;
      }
      return counts;
    }
    const counts = { requests: 0, in_progress: 0, waiting_client: 0, review: 0, delivered: 0 };
    for (const r of requests) {
      if (r.stage === "new") counts.requests++;
      else if (r.stage === "in_progress") counts.in_progress++;
      else if (r.stage === "in_review") counts.review++;
      else if (r.stage === "done") counts.delivered++;
    }
    counts.waiting_client = controlItems.filter((c) => c.kind === "blocker").length;
    return counts;
  }, [apiRequests, requests, controlItems]);

  const actionQueueItems = useMemo((): ActionQueueItem[] => {
    const now = new Date();
    const items: ActionQueueItem[] = [];
    const blockerIds = new Set((apiBlockers ?? []).map((b) => b.id));

    for (const b of apiBlockers ?? []) {
      items.push({
        id: b.id,
        title: b.title,
        dueAt: null,
        type: "Blocker",
        source: "System",
        status: b.reason,
        priority: b.severity === "critical" ? "urgent" : "warning",
      });
    }

    const approvals = controlItems.filter((c) => c.kind === "approval");
    for (const a of approvals) {
      items.push({
        id: `approval-${a.id}`,
        title: a.title,
        dueAt: a.dueAt,
        type: "Approval",
        source: "2FlyFlow",
        status: "Awaiting approval",
        priority: a.dueAt && new Date(a.dueAt) < now ? "urgent" : "warning",
      });
    }

    for (const t of tasksMock.filter((x) => x.status !== "done")) {
      items.push({
        id: `task-${t.id}`,
        title: t.title,
        dueAt: t.dueAt,
        type: "Task",
        source: "Task",
        status: t.status === "in_progress" ? "In Progress" : t.status === "review" ? "Review" : "To Do",
        priority: t.dueAt && new Date(t.dueAt) < now ? "urgent" : t.priority === "high" ? "warning" : "on_track",
      });
    }

    for (const r of workbenchRequests) {
      const id = `req-${r.id}`;
      if (blockerIds.has(id)) continue;
      items.push({
        id,
        title: r.title,
        dueAt: r.dueAt,
        type: "Request",
        source: r.source,
        status: r.stage === "in_progress" ? "In Progress" : r.stage === "in_review" ? "Review" : r.stage,
        priority: r.dueAt && new Date(r.dueAt) < now ? "urgent" : "on_track",
      });
    }

    items.sort((a, b) => {
      const order: Record<ActionQueuePriority, number> = { urgent: 0, warning: 1, on_track: 2 };
      const pa = order[a.priority];
      const pb = order[b.priority];
      if (pa !== pb) return pa - pb;
      const da = a.dueAt ? new Date(a.dueAt).getTime() : Infinity;
      const db = b.dueAt ? new Date(b.dueAt).getTime() : Infinity;
      return da - db;
    });

    return items;
  }, [apiBlockers, controlItems, tasksMock, workbenchRequests]);

  const activityEntries = useMemo((): ActivityTimelineEntry[] => {
    if (apiRequests && apiRequests.length > 0) {
      const sorted = [...apiRequests].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return sorted.slice(0, 8).map((r) => {
        let type: ActivityTimelineEntry["type"] = "info";
        if (r.status === "completed" || r.status === "closed") type = "completed";
        else if (r.status === "waiting_client") type = "waiting";
        return {
          id: r.id,
          text: `${r.status} – ${r.title}`,
          time: formatTime(r.updatedAt),
          type,
        };
      });
    }
    if (insights.length > 0) {
      return insights.slice(0, 8).map((s) => ({
        id: s.id,
        text: s.text,
        time: formatTime(s.createdAt),
        type: "info" as const,
      }));
    }
    return [
      { id: "a1", text: "Request created: \"Update pricing\"", time: "2h ago", type: "info" as const },
      { id: "a2", text: "Content approved: \"March IG post\"", time: "5h ago", type: "completed" as const },
      { id: "a3", text: "Invoice sent: #1042", time: "1d ago", type: "info" as const },
      { id: "a4", text: "Agent action: Budget increase approved", time: "2d ago", type: "completed" as const },
    ];
  }, [apiRequests, insights]);

  const retainer = apiClient?.monthlyRetainer ?? meta?.monthlyRetainer ?? null;
  const retainerPaid = health?.paymentStatus === "paid";
  const retainerOverdueDays = health?.paymentStatus === "overdue" ? (health.paymentDaysOverdue ?? 0) : 0;
  const contentBufferDays = health?.deliveryBufferDays ?? 0;
  const contentBufferStatus =
    health?.deliveryStatus === "ok" ? "green" : health?.deliveryStatus === "at_risk" ? "yellow" : "red";
  const activeRequestsCount = requests.filter((r) => r.stage !== "done").length;
  const roas = adsKpi ? `${adsKpi.roas}x` : null;
  const roasTrend = adsKpi?.roasTrend !== "—" ? adsKpi?.roasTrend : undefined;
  const roasTrendUp = adsKpi?.roasTrendDir === "up";
  const healthVariant =
    health?.paymentStatus === "overdue" || health?.deliveryStatus === "late"
      ? "red"
      : health?.deliveryStatus === "at_risk" || health?.paymentStatus === "pending"
        ? "yellow"
        : "green";
  const healthLabel = healthVariant === "green" ? "Healthy" : healthVariant === "yellow" ? "At risk" : "Critical";

  const bgCls = isDark ? "bg-zinc-950" : "bg-gray-50";

  return (
    <div className={`flex flex-col h-full overflow-auto ${bgCls}`}>
      <OverviewKPIStrip
        retainer={retainer}
        retainerPaid={retainerPaid}
        retainerOverdueDays={retainerOverdueDays}
        contentBufferDays={contentBufferDays}
        contentBufferStatus={contentBufferStatus}
        activeRequestsCount={activeRequestsCount}
        roas={roas}
        roasTrend={roasTrend}
        roasTrendUp={roasTrendUp}
        health={healthVariant}
        healthLabel={healthLabel}
      />

      <div className="flex-1 min-h-0 p-4 grid grid-cols-1 md:grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          <ActionQueue items={actionQueueItems} />
          <PipelineBar counts={pipelineCounts} />
        </div>
        <div className="lg:col-span-2 space-y-4">
          <ActivityTimeline entries={activityEntries} />
          <QuickActionsCompact
            onWhatsApp={() => {}}
            onNewRequest={() => {}}
            onDrive={() => {}}
            onAdPlatform={() => {}}
          />
        </div>
      </div>

      <div className="px-4 pb-4">
        <IdeasPanel ideas={ideas} defaultCollapsed />
      </div>
    </div>
  );
}
