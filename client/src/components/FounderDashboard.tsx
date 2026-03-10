"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useActions } from "@/contexts/ActionsContext";
import { MOCK_ACTIVITY, type ActivityEvent } from "@/lib/founder/mockFounderData";
import { FireLane } from "./dashboard/FireLane";
import { WaitingRadar } from "./dashboard/WaitingRadar";
import { LiveFeed } from "./dashboard/LiveFeed";
import { TodaySequence } from "./dashboard/TodaySequence";
import { MomentumWidget } from "./dashboard/MomentumWidget";
import { AgentActivityFeed } from "./dashboard/AgentActivityFeed";
import { AgentStatusGrid } from "./dashboard/AgentStatusGrid";
import { api } from "@/lib/api";

export function FounderDashboard() {
  const { isDark } = useTheme();
  const { activePriorities, executionItems, momentum } = useActions();
  /* Fetch real activity from pulse + brief endpoints, fall back to mock */
  const [activity, setActivity] = useState<ActivityEvent[]>(MOCK_ACTIVITY);

  useEffect(() => {
    async function loadActivity() {
      try {
        const [pulse, brief] = await Promise.all([
          api.getPulse(),
          api.getBrief().catch(() => null),
        ]);

        const events: ActivityEvent[] = [];
        const now = new Date();

        // Events from pulse: red health clients
        if (pulse.health?.clients) {
          pulse.health.clients.forEach((c, i) => {
            if (c.status === "red") {
              events.push({
                id: `pulse-${i}`,
                type: "ads_alert",
                clientName: c.name,
                clientId: String(i + 1),
                message: `Health: ${c.status}${c.roas != null ? ` (ROAS ${c.roas.toFixed(1)})` : ""}`,
                timestamp: new Date(now.getTime() - i * 60 * 60 * 1000).toISOString(),
              });
            }
          });
        }
        if (pulse.requests?.breached > 0) {
          events.push({
            id: "pulse-breached",
            type: "request",
            clientName: "System",
            clientId: "0",
            message: `${pulse.requests.breached} request(s) breached SLA`,
            timestamp: now.toISOString(),
          });
        }

        // Events from brief: overdue requests
        if (brief?.requests?.overdueItems) {
          for (const item of brief.requests.overdueItems) {
            events.push({
              id: `brief-req-${events.length}`,
              type: "request",
              clientName: item.client || "Unknown",
              clientId: "",
              message: `Overdue: ${item.title} (${item.priority})`,
              timestamp: item.dueDate || now.toISOString(),
            });
          }
        }

        // Events from brief: urgent content
        if (brief?.content?.urgentItems) {
          for (const item of brief.content.urgentItems) {
            events.push({
              id: `brief-content-${events.length}`,
              type: "approval_requested",
              clientName: item.client || "Unknown",
              clientId: "",
              message: `Due soon: ${item.title} (${item.status})`,
              timestamp: item.scheduledDate || now.toISOString(),
            });
          }
        }

        // Sort by timestamp descending
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (events.length > 0) setActivity(events);
      } catch {
        /* API down, keep mock data */
      }
    }
    loadActivity();
  }, []);

  return (
    <div className={`flex flex-col min-h-full ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Fire Lane */}
          <FireLane items={activePriorities} />

          {/* Waiting Radar + Live Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WaitingRadar />
            <LiveFeed events={activity} />
          </div>

          {/* Today's Sequence */}
          <TodaySequence />

          {/* Footer: Momentum + Agent Activity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MomentumWidget stats={momentum} />
            <AgentActivityFeed />
          </div>

          {/* Agent Status Grid */}
          <div className="mt-4">
            <AgentStatusGrid />
          </div>
        </div>
      </div>
    </div>
  );
}
