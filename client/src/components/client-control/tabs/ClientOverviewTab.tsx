"use client";

import { ClientInbox } from "@/components/client-control/ClientInbox";
import { ClientControlPanel } from "@/components/client-control/ClientControlPanel";
import { ClientHealthPanel } from "@/components/client-control/ClientHealthPanel";
import { ClientBrainPanel } from "@/components/client-control/ClientBrainPanel";
import {
  getClientHealth,
  getNotes,
  getIdeas,
  getInsights,
} from "@/lib/client/mockClientControlData";
import { mergeClientControlItems } from "@/lib/client/mergeClientActions";
import type { InboxItem, ControlItem, ClientHealth, NoteItem, IdeaItem, InsightItem } from "@/lib/client/mockClientControlData";

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
  clientId: _clientId,
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
  return (
    <div className="flex-1 overflow-hidden flex">
      <div className="flex-1 overflow-hidden flex flex-col min-w-0 border-r border-gray-100 bg-gray-50/50">
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl space-y-6">
            <div className="rounded-lg border border-gray-100 bg-white p-4 min-h-[280px]">
              <ClientInbox
                items={inboxItems}
                onConvertToTask={onConvertToTask}
                onMarkDone={onMarkDone}
              />
            </div>
            <ClientControlPanel items={mergedControlItems} onDoItAction={onDoItAction} />
          </div>
        </div>
      </div>
      <div className="w-80 flex-shrink-0 overflow-auto p-6 space-y-6">
        <ClientHealthPanel health={health} />
        <ClientBrainPanel notes={notes} ideas={ideas} insights={insights} />
      </div>
    </div>
  );
}
