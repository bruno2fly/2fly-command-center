"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api, type ApiClient, type ApiTask } from "@/lib/api";
import { ClientFormModal } from "@/components/ClientFormModal";
import { ClientCommandHeader } from "@/components/mission-control";
import { buildClientLanes } from "@/lib/clientLanes";
import { getClientControlMeta } from "@/lib/client/mockClientControlData";
import { ClientTabBar, CLIENT_TABS, type ClientTabId } from "@/components/client-control/ClientTabBar";
import { ClientOverviewTab } from "@/components/client-control/tabs/ClientOverviewTab";
import { ClientTasksTab } from "@/components/client-control/tabs/ClientTasksTab";
import { ClientTasksRequestsTab } from "@/components/client-control/tabs/ClientTasksRequestsTab";
import { ClientPlanTab } from "@/components/client-control/tabs/ClientPlanTab";
import { ClientAdsTab } from "@/components/client-control/tabs/ClientAdsTab";
import { ClientReportsTab } from "@/components/client-control/tabs/ClientReportsTab";
import { ClientContentTab } from "@/components/client-control/tabs/ClientContentTab";
import { ClientSocialMediaTab } from "@/components/client-control/tabs/ClientSocialMediaTab";
import { TaskDetailModal, CreateTaskModal, type TaskDetailTask } from "@/components/tasks";

function parseTabFromUrl(searchParams: ReturnType<typeof useSearchParams> | null): ClientTabId {
  const tab = searchParams?.get("tab") ?? "overview";
  return CLIENT_TABS.includes(tab as ClientTabId) ? (tab as ClientTabId) : "overview";
}

export default function ClientControlRoomPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id ?? "";
  const { clients } = useClients();
  const { isDark } = useTheme();
  const [editClient, setEditClient] = useState<ApiClient | null>(null);
  const [mainApiClient, setMainApiClient] = useState<{ monthlyRetainer?: number | null; name?: string } | null>(null);
  const [selectedTask, setSelectedTask] = useState<ApiTask | null>(null);
  const [taskUpdatedAt, setTaskUpdatedAt] = useState(0);
  const [showCreateTask, setShowCreateTask] = useState(false);

  const activeTab = useMemo(() => parseTabFromUrl(searchParams), [searchParams]);
  const client = clients.find((c) => c.id === id);
  const lanes = buildClientLanes(clients);
  const lane = lanes.find((l) => l.clientId === id);
  const meta = getClientControlMeta(id);
  const clientDisplayName = mainApiClient?.name ?? client?.name ?? "—";

  const handleOpenTaskFromOverview = useCallback(
    (taskId: string) => {
      if (!id) return;
      api
        .getClientTasks(id, {})
        .then((r) => {
          const t = r.tasks?.find((x) => x.id === taskId);
          if (t) setSelectedTask(t);
        })
        .catch(() => {});
    },
    [id]
  );

  useEffect(() => {
    if (!id) return;
    api
      .getClientMain(id)
      .then((c) => {
        const data = c as { monthlyRetainer?: number; name?: string };
        setMainApiClient({
          monthlyRetainer: data.monthlyRetainer ?? null,
          name: data.name,
        });
      })
      .catch(() => setMainApiClient(null));
  }, [id]);

    const taskToDetail = (t: ApiTask): TaskDetailTask => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    type: t.type,
    source: t.source,
    assignedTo: t.assignedTo,
    dueDate: t.dueDate,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    completedAt: t.completedAt,
  });

  const handleTaskStatusChange = useCallback(
    (taskId: string, status: string) => {
      if (!id) return;
      api
        .patchClientTask(id, taskId, { status })
        .then((updated) => {
          setSelectedTask((prev) => (prev?.id === taskId ? updated : prev));
          setTaskUpdatedAt(Date.now());
        })
        .catch(() => {});
    },
    [id]
  );

  const handleTaskDueDateChange = useCallback(
    (taskId: string, date: string | null) => {
      if (!id) return;
      api
        .patchClientTask(id, taskId, { dueDate: date })
        .then((updated) => {
          setSelectedTask((prev) => (prev?.id === taskId ? updated : prev));
          setTaskUpdatedAt(Date.now());
        })
        .catch(() => {});
    },
    [id]
  );

  const handleTaskAssignChange = useCallback(
    (taskId: string, assignee: string) => {
      if (!id) return;
      api
        .patchClientTask(id, taskId, { assignedTo: assignee || null })
        .then((updated) => {
          setSelectedTask((prev) => (prev?.id === taskId ? updated : prev));
          setTaskUpdatedAt(Date.now());
        })
        .catch(() => {});
    },
    [id]
  );

  const handleTaskTitleChange = useCallback(
    (taskId: string, title: string) => {
      if (!id) return;
      api
        .patchClientTask(id, taskId, { title })
        .then((updated) => {
          setSelectedTask((prev) => (prev?.id === taskId ? updated : prev));
          setTaskUpdatedAt(Date.now());
        })
        .catch(() => {});
    },
    [id]
  );

  const handleTaskDescriptionChange = useCallback(
    (taskId: string, description: string) => {
      if (!id) return;
      api
        .patchClientTask(id, taskId, { description })
        .then((updated) => {
          setSelectedTask((prev) => (prev?.id === taskId ? updated : prev));
          setTaskUpdatedAt(Date.now());
        })
        .catch(() => {});
    },
    [id]
  );

  const handleTaskDelete = useCallback(
    (taskId: string) => {
      if (!id) return;
      api
        .deleteClientTask(id, taskId)
        .then(() => {
          setSelectedTask(null);
          setTaskUpdatedAt(Date.now());
        })
        .catch(() => {});
    },
    [id]
  );

  if (!client || !lane) {
    return (
      <div className="p-6">
        <div className={`rounded-xl shadow-sm p-8 text-center ${isDark ? "bg-[#0a0a0e] border border-[#1a1810]" : "bg-white border border-gray-100"}`}>
          <p className={isDark ? "text-[#8a7e6d]" : "text-gray-500"}>Client not found.</p>
          <Link href="/clients" className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  const healthVariant =
    lane.health === "green" ? "healthy" : lane.health === "yellow" ? "at_risk" : "critical";

  return (
    <div className="flex flex-col h-full">
      <ClientCommandHeader
        clientName={mainApiClient?.name ?? client.name}
        healthVariant={healthVariant}
        monthlyRetainer={mainApiClient?.monthlyRetainer ?? client.monthlyRetainer ?? null}
        lastDelivery={null}
        nextPromise={null}
        onEdit={() => api.getClient(id).then(setEditClient).catch(() => {})}
        onQuickNote={() => {}}
        onNewRequest={() => {}}
        onOpenWhatsApp={() => {}}
        onCreateTask={() => setShowCreateTask(true)}
      />

      {/* Tab bar */}
      <ClientTabBar activeTab={activeTab} />

      {/* Tab content – lazy render */}
      <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
        {activeTab === "overview" && (
          <ClientOverviewTab
            clientId={id}
            clientName={clientDisplayName}
            onOpenTaskDetail={handleOpenTaskFromOverview}
          />
        )}
        {activeTab === "tasks" && (
          <ClientTasksTab
            clientId={id}
            clientName={clientDisplayName}
            onSelectTask={setSelectedTask}
            onOpenCreateTask={() => setShowCreateTask(true)}
            refreshTrigger={taskUpdatedAt}
          />
        )}
        {activeTab === "tasksRequests" && <ClientTasksRequestsTab clientId={id} />}
        {activeTab === "clientPlan" && <ClientPlanTab clientId={id} />}
        {activeTab === "ads" && <ClientAdsTab clientId={id} clientName={mainApiClient?.name ?? client.name} />}
        {activeTab === "reports" && <ClientReportsTab clientId={id} />}
        {activeTab === "content" && <ClientContentTab clientId={id} />}
        {activeTab === "socialMedia" && <ClientSocialMediaTab clientId={id} />}
      </div>
      <ClientFormModal
        isOpen={!!editClient}
        onClose={() => setEditClient(null)}
        mode="edit"
        client={editClient ?? undefined}
      />
      {selectedTask && (
        <TaskDetailModal
          task={taskToDetail(selectedTask)}
          clientName={clientDisplayName}
          clientId={id}
          onClose={() => setSelectedTask(null)}
          onStatusChange={handleTaskStatusChange}
          onDueDateChange={handleTaskDueDateChange}
          onAssignChange={handleTaskAssignChange}
          onTitleChange={handleTaskTitleChange}
          onDescriptionChange={handleTaskDescriptionChange}
          onDelete={handleTaskDelete}
        />
      )}
      {showCreateTask && (
        <CreateTaskModal
          clientId={id}
          onClose={() => setShowCreateTask(false)}
          onSuccess={() => setTaskUpdatedAt(Date.now())}
        />
      )}
    </div>
  );
}
