"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { ClientInboxDrawer } from "@/components/client-control/ClientInboxDrawer";
import { buildActionQueue } from "@/lib/client/buildActionQueue";
import { ActionCenter } from "@/components/mission-control";
import { UnifiedPipeline } from "@/components/client-control/UnifiedPipeline";
import { StatusWall } from "@/components/client-control/StatusWall";
import type {
  InboxItem,
  ControlItem,
  ClientHealth,
  NoteItem,
  IdeaItem,
  InsightItem,
} from "@/lib/client/mockClientControlData";

type Props = {
  clientId: string;
  inboxItems: InboxItem[];
  controlItems: ControlItem[];
  mergedControlItems: ControlItem[];
  health: ClientHealth | null;
  notes: NoteItem[];
  ideas: IdeaItem[];
  insights: InsightItem[];
  onConvertToTask: (id: string) => void;
  onMarkDone: (id: string) => void;
  onDoItAction?: (itemId: string) => void;
};

export function ClientOperationsTab({
  clientId,
  inboxItems,
  mergedControlItems,
  health,
  notes,
  ideas,
  onConvertToTask,
  onMarkDone,
  onDoItAction,
}: Props) {
  const { isDark } = useTheme();
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);

  const actionQueue = buildActionQueue(mergedControlItems, inboxItems, health, 5);
  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";
  const selectedInboxItem = selectedInboxId
    ? inboxItems.find((i) => i.id === selectedInboxId) ?? null
    : null;

  return (
    <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${bgBase}`}>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Command Queue */}
          <ActionCenter
            items={actionQueue}
            onDoIt={onDoItAction}
            onConvertToTask={onConvertToTask}
            onSelectInbox={(id) => setSelectedInboxId(id)}
          />

          {/* Unified Pipeline */}
          <UnifiedPipeline
            clientId={clientId}
            controlItems={mergedControlItems}
            health={health}
          />

          {/* Status Wall */}
          <StatusWall clientId={clientId} notes={notes} ideas={ideas} />
        </div>
      </div>

      <ClientInboxDrawer
        item={selectedInboxItem}
        onClose={() => setSelectedInboxId(null)}
        onConvertToTask={(id) => {
          onConvertToTask(id);
          setSelectedInboxId(null);
        }}
        onMarkDone={(id) => {
          onMarkDone(id);
          setSelectedInboxId(null);
        }}
      />
    </div>
  );
}
