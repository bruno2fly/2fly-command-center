"use client";

import { Toaster } from "sonner";
import { CommandBar } from "./CommandBar/CommandBar";
import { SidebarClientList } from "./SidebarClientList";
import { AgentChatPanel } from "./agent-chat/AgentChatPanel";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { ActionsProvider } from "@/contexts/ActionsContext";
import { ClientsProvider } from "@/contexts/ClientsContext";
import { DailyPlannerProvider } from "@/contexts/DailyPlannerContext";
import { AgentChatProvider } from "@/contexts/AgentChatContext";

type Props = {
  children: React.ReactNode;
};

export function PortalLayout({ children }: Props) {
  return (
    <FocusModeProvider>
      <ClientsProvider>
        <ActionsProvider>
        <DailyPlannerProvider>
        <AgentChatProvider>
        <div className="flex min-h-screen flex-col">
          <CommandBar />
          <div className="flex flex-1 overflow-hidden">
            <SidebarClientList />
            <main className="flex-1 overflow-auto bg-gray-50">
              {children}
            </main>
          </div>
        </div>
        <AgentChatPanel />
        <Toaster position="bottom-right" richColors closeButton />
        </AgentChatProvider>
        </DailyPlannerProvider>
        </ActionsProvider>
      </ClientsProvider>
    </FocusModeProvider>
  );
}
