"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useClients } from "@/contexts/ClientsContext";
import { useTheme } from "@/contexts/ThemeContext";
import { api, type ApiClient } from "@/lib/api";
import { ClientFormModal } from "@/components/ClientFormModal";
import { ClientCommandHeader } from "@/components/mission-control";
import { buildClientLanes } from "@/lib/clientLanes";
import {
  getInboxItems,
  getClientHealth,
  getControlItems,
  getNotes,
  getIdeas,
  getInsights,
  getClientControlMeta,
} from "@/lib/client/mockClientControlData";
import { toast } from "sonner";
import { mergeClientControlItems } from "@/lib/client/mergeClientActions";
import { useActions } from "@/contexts/ActionsContext";
import { ClientTabBar, CLIENT_TABS, type ClientTabId } from "@/components/client-control/ClientTabBar";
import { ClientOverviewTab } from "@/components/client-control/tabs/ClientOverviewTab";
import { ClientTasksRequestsTab } from "@/components/client-control/tabs/ClientTasksRequestsTab";
import { ClientPlanTab } from "@/components/client-control/tabs/ClientPlanTab";
import { ClientAdsTab } from "@/components/client-control/tabs/ClientAdsTab";
import { ClientContentTab } from "@/components/client-control/tabs/ClientContentTab";
import { ClientSocialMediaTab } from "@/components/client-control/tabs/ClientSocialMediaTab";

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
  const { activePriorities, markCompleteById } = useActions();
  const [editClient, setEditClient] = useState<ApiClient | null>(null);

  const activeTab = useMemo(() => parseTabFromUrl(searchParams), [searchParams]);

  const client = clients.find((c) => c.id === id);
  const lanes = buildClientLanes(clients);
  const lane = lanes.find((l) => l.clientId === id);

  const inboxItems = getInboxItems(id);
  const health = getClientHealth(id);
  const controlItems = getControlItems(id);
  const mergedControlItems = useMemo(
    () => mergeClientControlItems(id, controlItems, activePriorities),
    [id, controlItems, activePriorities]
  );
  const notes = getNotes(id);
  const ideas = getIdeas(id);
  const insights = getInsights(id);
  const meta = getClientControlMeta(id);

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

  const handleConvertToTask = (inboxId: string) => {
    toast.success("✓ Task created");
  };

  const handleMarkDone = (inboxId: string) => {
    toast.success("✓ Done!");
  };

  return (
    <div className="flex flex-col h-full">
      <ClientCommandHeader
        clientName={client.name}
        healthVariant={healthVariant}
        monthlyRetainer={client.monthlyRetainer ?? meta?.monthlyRetainer ?? null}
        lastDelivery={meta?.lastDelivery ?? null}
        nextPromise={meta?.nextPromiseDate ?? null}
        onEdit={() => api.getClient(id).then(setEditClient).catch(() => {})}
        onQuickNote={() => {}}
        onNewRequest={() => {}}
        onOpenWhatsApp={() => {}}
        onCreateTask={() => {}}
      />

      {/* Tab bar */}
      <ClientTabBar activeTab={activeTab} />

      {/* Tab content – lazy render */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {activeTab === "overview" && (
          <ClientOverviewTab
            clientId={id}
            inboxItems={inboxItems}
            controlItems={controlItems}
            mergedControlItems={mergedControlItems}
            health={health}
            notes={notes}
            ideas={ideas}
            insights={insights}
            onConvertToTask={handleConvertToTask}
            onMarkDone={handleMarkDone}
            onDoItAction={markCompleteById}
          />
        )}
        {activeTab === "tasks" && <ClientTasksRequestsTab clientId={id} />}
        {activeTab === "plan" && <ClientPlanTab clientId={id} />}
        {activeTab === "ads" && <ClientAdsTab clientId={id} />}
        {activeTab === "content" && <ClientContentTab clientId={id} />}
        {activeTab === "social" && <ClientSocialMediaTab clientId={id} />}
      </div>
      <ClientFormModal
        isOpen={!!editClient}
        onClose={() => setEditClient(null)}
        mode="edit"
        client={editClient ?? undefined}
      />
    </div>
  );
}
