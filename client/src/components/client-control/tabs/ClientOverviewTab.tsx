"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { buildActionQueue } from "@/lib/client/buildActionQueue";
import {
  ActionCenter,
  OperationalPipeline,
  HealthRadar,
  SignalInbox,
  ClientMemoryPanel,
} from "@/components/mission-control";
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

export function ClientOverviewTab({
  clientId,
  inboxItems,
  mergedControlItems,
  health,
  notes,
  ideas,
  insights,
  onConvertToTask,
  onMarkDone,
  onDoItAction,
}: Props) {
  const { isDark } = useTheme();
  const [selectedInboxId, setSelectedInboxId] = useState<string | null>(null);

  const actionQueue = buildActionQueue(mergedControlItems, inboxItems, health, 5);
  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";

  return (
    <div className={`flex-1 overflow-hidden flex flex-col min-h-0 ${bgBase}`}>
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Primary: Command Queue */}
          <ActionCenter
            items={actionQueue}
            onDoIt={onDoItAction}
            onConvertToTask={onConvertToTask}
            onSelectInbox={(id) => setSelectedInboxId(id)}
          />

          {/* Operational Pipeline */}
          <OperationalPipeline
            clientId={clientId}
            controlItems={mergedControlItems}
            health={health}
          />

          {/* Two-column: Health + Inbox | Memory */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <HealthRadar health={health} />
              <SignalInbox
                items={inboxItems}
                openItemId={selectedInboxId}
                onCloseDrawer={() => setSelectedInboxId(null)}
                onConvertToTask={onConvertToTask}
                onMarkDone={onMarkDone}
              />
            </div>
            <div>
              <ClientMemoryPanel notes={notes} ideas={ideas} insights={insights} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
