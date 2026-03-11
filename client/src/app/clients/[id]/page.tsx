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
import { getClientControlMeta } from "@/lib/client/mockClientControlData";
import { ClientTabBar, CLIENT_TABS, type ClientTabId } from "@/components/client-control/ClientTabBar";
import { ClientOverviewTab } from "@/components/client-control/tabs/ClientOverviewTab";
import { ClientTasksTab } from "@/components/client-control/tabs/ClientTasksTab";
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
  const [editClient, setEditClient] = useState<ApiClient | null>(null);

  const activeTab = useMemo(() => parseTabFromUrl(searchParams), [searchParams]);

  const client = clients.find((c) => c.id === id);
  const lanes = buildClientLanes(clients);
  const lane = lanes.find((l) => l.clientId === id);
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
      <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
        {activeTab === "overview" && <ClientOverviewTab clientId={id} clientName={client.name} />}
        {activeTab === "tasks" && <ClientTasksTab clientId={id} />}
        {activeTab === "tasksRequests" && <ClientTasksRequestsTab clientId={id} />}
        {activeTab === "clientPlan" && <ClientPlanTab clientId={id} />}
        {activeTab === "ads" && <ClientAdsTab clientId={id} />}
        {activeTab === "content" && <ClientContentTab clientId={id} />}
        {activeTab === "socialMedia" && <ClientSocialMediaTab clientId={id} />}
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
