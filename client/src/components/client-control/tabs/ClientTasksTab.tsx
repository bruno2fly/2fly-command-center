"use client";

import { TaskBoard } from "@/components/tasks";

type Props = {
  clientId: string;
};

export function ClientTasksTab({ clientId }: Props) {
  return (
    <div className="flex flex-col h-full overflow-auto">
      <TaskBoard clientId={clientId} />
    </div>
  );
}
