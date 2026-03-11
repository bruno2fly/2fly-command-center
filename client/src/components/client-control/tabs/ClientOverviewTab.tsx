"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { ApiRequestItem, ApiContentItem, ApiTask, ApiDirective } from "@/lib/api";
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
  AgentUpdatesSection,
  ActionQueueDetailPanel,
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
  const router = useRouter();
  const pathname = usePathname();

  const [apiClient, setApiClient] = useState<Awaited<ReturnType<typeof api.getClient>> | null>(null);
  const [apiRequests, setApiRequests] = useState<ApiRequestItem[] | null>(null);
  const [apiContent, setApiContent] = useState<ApiContentItem[] | null>(null);
  const [apiHealthClients, setApiHealthClients] = useState<
    Array<{ clientId?: string; overall?: string; modules?: Record<string, { bufferDays?: number; status?: string }> }>
  | null>(null);
  const [apiPayments, setApiPayments] = useState<Awaited<ReturnType<typeof api.getPayments>> | null>(null);
  const [apiTasks, setApiTasks] = useState<ApiTask[]>([]);
  const [recentDirectives, setRecentDirectives] = useState<ApiDirective[]>([]);
  const [selectedActionItem, setSelectedActionItem] = useState<ActionQueueItem | null>(null);
  const agentUpdatesRef = useRef<HTMLDivElement>(null);

  const fetchApi = useCallback(() => {
    Promise.all([
      api.getClient(clientId).then(setApiClient).catch(() => {}),
      api.getRequestsRaw(clientId).then((d) => setApiRequests(d.requests ?? [])).catch(() => {}),
      api.getContentItemsMain(clientId).then(setApiContent).catch(() => api.getContentItems(clientId).then(setApiContent).catch(() => {})),
      api.getClientTasks(clientId).then((r) => setApiTasks(r.tasks ?? [])).catch(() => setApiTasks([])),
      api.getDirectives({ clientId }).then((r) => setRecentDirectives(r.directives ?? [])).catch(() => setRecentDirectives([])),
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
      const isReq = b.id.startsWith("req-");
      items.push({
        id: b.id,
        title: b.title,
        dueAt: null,
        type: "Blocker",
        source: "System",
        status: b.reason,
        priority: b.severity === "critical" ? "urgent" : "warning",
        entityType: "blocker",
        entityId: isReq ? b.id.replace("req-", "") : undefined,
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
        entityType: "approval",
      });
    }

    const tasksToShow = apiTasks.length > 0
      ? apiTasks.filter((x) => x.status !== "completed" && x.status !== "cancelled")
      : tasksMock.filter((x) => x.status !== "done").map((t) => ({ id: t.id, title: t.title, dueDate: t.dueAt, status: t.status, priority: t.priority === "high" ? "high" : "normal", source: "manual" }));
    for (const t of tasksToShow) {
      const dueAt = "dueDate" in t ? t.dueDate : (t as ApiTask).dueDate;
      const status = (t as ApiTask).status ?? (t as { status: string }).status;
      const priority = (t as ApiTask).priority ?? (t as { priority: string }).priority;
      items.push({
        id: `task-${t.id}`,
        title: t.title,
        dueAt: dueAt ? (typeof dueAt === "string" ? dueAt : (dueAt as Date).toISOString?.()) : null,
        type: "Task",
        source: (t as ApiTask).source === "agent" ? "Agent" : "Task",
        status: status === "in_progress" ? "In Progress" : status === "review" ? "Review" : "To Do",
        priority: dueAt && new Date(dueAt as string) < now ? "urgent" : priority === "high" || priority === "urgent" ? "warning" : "on_track",
        entityType: "task",
        entityId: t.id,
      });
    }

    const contentDraftOrReview = (apiContent ?? []).filter(
      (c) => (c.status === "draft" || c.status === "review") && !items.some((i) => i.entityType === "content" && i.entityId === c.id)
    );
    for (const c of contentDraftOrReview.slice(0, 5)) {
      items.push({
        id: `content-${c.id}`,
        title: c.title,
        dueAt: (c as { scheduledDate?: string }).scheduledDate ?? null,
        type: "Content",
        source: (c as { source?: string }).source === "agent" ? "Agent" : "Content",
        status: c.status,
        priority: "on_track",
        entityType: "content",
        entityId: c.id,
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
        entityType: "request",
        entityId: r.id,
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
  }, [apiBlockers, controlItems, tasksMock, workbenchRequests, apiTasks, apiContent]);

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

  const last24hDirective = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return recentDirectives.find(
      (d) => d.status === "completed" && d.completedAt && new Date(d.completedAt).getTime() >= cutoff
    );
  }, [recentDirectives]);

  const selectedContent = selectedActionItem?.entityType === "content" && selectedActionItem.entityId
    ? (apiContent ?? []).find((c) => c.id === selectedActionItem.entityId)
    : null;
  const selectedTask = selectedActionItem?.entityType === "task" && selectedActionItem.entityId
    ? apiTasks.find((t) => t.id === selectedActionItem.entityId)
    : null;
  const selectedRequest = selectedActionItem?.entityType === "request" && selectedActionItem.entityId
    ? (apiRequests ?? []).find((r) => r.id === selectedActionItem.entityId)
    : null;

  const handleApproveContent = useCallback(
    (id: string) => {
      api.patchContent(id, { status: "approved" }).then(() => fetchApi()).catch(() => {});
    },
    [fetchApi]
  );
  const handleRejectContent = useCallback(
    (id: string) => {
      api.patchContent(id, { status: "cancelled" }).then(() => fetchApi()).catch(() => {});
    },
    [fetchApi]
  );
  const handleCompleteTask = useCallback(
    (id: string) => {
      api.patchClientTask(clientId, id, { status: "completed" }).then(() => fetchApi()).catch(() => {});
    },
    [clientId, fetchApi]
  );
  const handleAcknowledgeRequest = useCallback(
    (id: string) => {
      api.patchRequest(id, { status: "acknowledged" }).then(() => fetchApi()).catch(() => {});
    },
    [fetchApi]
  );
  const handleResolveRequest = useCallback(
    (id: string) => {
      api.patchRequest(id, { status: "completed" }).then(() => fetchApi()).catch(() => {});
    },
    [fetchApi]
  );
  const handleSwitchToContent = useCallback(
    (contentId?: string) => {
      router.replace(`${pathname}?tab=content${contentId ? `&highlight=${contentId}` : ""}`);
    },
    [router, pathname]
  );
  const handleSwitchToTasks = useCallback(
    (taskId?: string) => {
      router.replace(`${pathname}?tab=tasks${taskId ? `&highlight=${taskId}` : ""}`);
    },
    [router, pathname]
  );
  const handleSwitchToRequests = useCallback(() => {
    router.replace(`${pathname}?tab=tasksRequests`);
  }, [router, pathname]);
  const scrollToAgentUpdates = useCallback(() => {
    agentUpdatesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const bgCls = isDark ? "bg-zinc-950" : "bg-gray-50";

  return (
    <div className={`flex flex-col h-full overflow-auto ${bgCls}`}>
      {last24hDirective && (
        <div
          className={`shrink-0 px-4 py-2 flex items-center justify-between gap-2 ${isDark ? "bg-blue-500/10 border-b border-blue-500/20" : "bg-blue-50 border-b border-blue-100"}`}
        >
          <span className="text-sm text-blue-700 dark:text-blue-300">
            🤖 {last24hDirective.agentName} created {last24hDirective.contentCreated} items + {last24hDirective.tasksCreated} tasks — {formatTime(last24hDirective.completedAt ?? last24hDirective.createdAt)}
          </span>
          <button
            type="button"
            onClick={scrollToAgentUpdates}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View →
          </button>
        </div>
      )}
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
          <div ref={agentUpdatesRef}>
            <AgentUpdatesSection clientId={clientId} />
          </div>
          <ActionQueue
            items={actionQueueItems}
            onItemClick={setSelectedActionItem}
          />
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

      <ActionQueueDetailPanel
        item={selectedActionItem}
        content={selectedContent}
        task={selectedTask}
        request={selectedRequest}
        onClose={() => setSelectedActionItem(null)}
        onSwitchToContent={handleSwitchToContent}
        onSwitchToTasks={handleSwitchToTasks}
        onSwitchToRequests={handleSwitchToRequests}
        onApproveContent={handleApproveContent}
        onRejectContent={handleRejectContent}
        onCompleteTask={handleCompleteTask}
        onAcknowledgeRequest={handleAcknowledgeRequest}
        onResolveRequest={handleResolveRequest}
      />
    </div>
  );
}
