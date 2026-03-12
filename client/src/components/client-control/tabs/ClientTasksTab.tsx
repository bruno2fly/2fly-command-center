"use client";

import { TaskBoard } from "@/components/tasks";

type Props = {
  clientId: string;
  clientName?: string;
  onSelectTask?: (task: import("@/lib/api").ApiTask) => void;
  onOpenCreateTask?: () => void;
  refreshTrigger?: number;
};

export function ClientTasksTab({ clientId, clientName, onSelectTask, onOpenCreateTask, refreshTrigger }: Props) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <TaskBoard
        clientId={clientId}
        clientName={clientName}
        onSelectTask={onSelectTask}
        onOpenCreateTask={onOpenCreateTask}
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
