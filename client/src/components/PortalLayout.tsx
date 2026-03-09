"use client";

import { Toaster } from "sonner";
import { CommandBar } from "./CommandBar/CommandBar";
import { SidebarClientList } from "./SidebarClientList";
import { AgentChatPanel } from "./agent-chat/AgentChatPanel";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { ActionsProvider } from "@/contexts/ActionsContext";
import { ClientsProvider } from "@/contexts/ClientsContext";
import { DailyPlannerProvider } from "@/contexts/DailyPlannerContext";
import { AgentChatProvider } from "@/contexts/AgentChatContext";

type Props = {
  children: React.ReactNode;
};

function PortalLayoutInner({ children }: Props) {
  const { isDark } = useTheme();

  return (
    <div
      className={`flex min-h-screen flex-col ${
        isDark ? "bg-[#06060a]" : "bg-gray-50"
      }`}
    >
      <CommandBar />
      <div className="flex flex-1 overflow-hidden">
        <SidebarClientList />
        <main
          className={`flex-1 overflow-auto ${
            isDark ? "bg-[#06060a]" : "bg-gray-50"
          }`}
        >
          {children}
        </main>
      </div>
      <AgentChatPanel />
      <Toaster position="bottom-right" richColors closeButton />
    </div>
  );
}

export function PortalLayout({ children }: Props) {
  return (
    <ThemeProvider>
      <FocusModeProvider>
        <ClientsProvider>
          <ActionsProvider>
            <DailyPlannerProvider>
              <AgentChatProvider>
                <PortalLayoutInner>{children}</PortalLayoutInner>
              </AgentChatProvider>
            </DailyPlannerProvider>
          </ActionsProvider>
        </ClientsProvider>
      </FocusModeProvider>
    </ThemeProvider>
  );
}
