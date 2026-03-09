"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useMemo } from "react";
import { useClients } from "@/contexts/ClientsContext";
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

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function parseTabFromUrl(searchParams: ReturnType<typeof useSearchParams> | null): ClientTabId {
  const tab = searchParams?.get("tab") ?? "overview";
  return CLIENT_TABS.includes(tab as ClientTabId) ? (tab as ClientTabId) : "overview";
}

export default function ClientControlRoomPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id ?? "";
  const { clients } = useClients();
  const { activePriorities, markCompleteById } = useActions();

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <p className="text-gray-500">Client not found.</p>
          <Link href="/clients" className="text-blue-600 hover:text-blue-700 font-medium mt-2 inline-block">
            Back to clients
          </Link>
        </div>
      </div>
    );
  }

  const statusColor =
    lane.health === "green" ? "bg-emerald-500" : lane.health === "yellow" ? "bg-amber-500" : "bg-red-500";
  const statusLabel = lane.health === "green" ? "Healthy" : lane.health === "yellow" ? "At risk" : "Urgent";

  const handleConvertToTask = (inboxId: string) => {
    toast.success("✓ Task created");
  };

  const handleMarkDone = (inboxId: string) => {
    toast.success("✓ Done!");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{client.name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium text-white ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
              <span>Last delivery {formatDate(meta?.lastDelivery ?? null)}</span>
              <span>·</span>
              <span>Next promise {formatDate(meta?.nextPromiseDate ?? null)}</span>
              {meta?.monthlyRetainer != null && (
                <>
                  <span>·</span>
                  <span>${meta.monthlyRetainer.toLocaleString()}/mo</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Quick Note
            </button>
            <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              New Request
            </button>
            <a
              href="#"
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Open WhatsApp
            </a>
            <button className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-500">
              Create Task
            </button>
            <Link href="/" className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              ← Dashboard
            </Link>
          </div>
        </div>
      </div>

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
    </div>
  );
}
