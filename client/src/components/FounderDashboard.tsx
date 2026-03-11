"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useActions } from "@/contexts/ActionsContext";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { MOCK_ACTIVITY, type ActivityEvent } from "@/lib/founder/mockFounderData";
import { FireLane } from "./dashboard/FireLane";
import { WaitingRadar } from "./dashboard/WaitingRadar";
import { LiveFeed } from "./dashboard/LiveFeed";
import { TodaySequence } from "./dashboard/TodaySequence";
import { MomentumWidget } from "./dashboard/MomentumWidget";
import { AgentActivityFeed } from "./dashboard/AgentActivityFeed";
import { AgentStatusGrid } from "./dashboard/AgentStatusGrid";
import { BriefingCard, BriefFullView } from "./briefs";
import { api, type ApiBrief } from "@/lib/api";

export function FounderDashboard() {
  const { isDark } = useTheme();
  const { activePriorities, executionItems, momentum } = useActions();
  const searchParams = useSearchParams();
  const router = useRouter();
  const briefIdFromUrl = searchParams?.get("briefId") ?? null;

  /* Fetch real activity from pulse + brief endpoints, fall back to mock */
  const [activity, setActivity] = useState<ActivityEvent[]>(MOCK_ACTIVITY);
  const [todayBriefs, setTodayBriefs] = useState<ApiBrief[]>([]);
  const [selectedBrief, setSelectedBrief] = useState<ApiBrief | null>(null);
  const [pulseOnce, setPulseOnce] = useState(false);
  const hasToasted = useRef(false);

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

  // Today's briefs + toast when unread (once per load)
  useEffect(() => {
    api
      .getBriefsToday()
      .then((r) => {
        const list = r.briefs ?? [];
        setTodayBriefs(list);
        const unread = list.filter((b) => b.status === "unread").length;
        if (unread > 0 && !hasToasted.current) {
          hasToasted.current = true;
          toast(`You have ${unread} new briefing${unread === 1 ? "" : "s"} from your agents`);
          setPulseOnce(true);
          setTimeout(() => setPulseOnce(false), 500);
        }
      })
      .catch(() => {});
  }, []);

  // Open full view when URL has briefId
  useEffect(() => {
    if (!briefIdFromUrl) {
      setSelectedBrief(null);
      return;
    }
    api
      .getBriefById(briefIdFromUrl)
      .then((b) => setSelectedBrief(b))
      .catch(() => setSelectedBrief(null));
  }, [briefIdFromUrl]);

  const closeBriefView = () => {
    setSelectedBrief(null);
    router.replace("/");
  };

  const openBrief = (brief: ApiBrief) => {
    router.push(`/?briefId=${brief.id}`);
  };

  const currentIndex = selectedBrief ? todayBriefs.findIndex((b) => b.id === selectedBrief.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < todayBriefs.length - 1;
  const onPrev = () => {
    if (hasPrev && todayBriefs[currentIndex - 1])
      router.push(`/?briefId=${todayBriefs[currentIndex - 1].id}`);
  };
  const onNext = () => {
    if (hasNext && todayBriefs[currentIndex + 1])
      router.push(`/?briefId=${todayBriefs[currentIndex + 1].id}`);
  };

  return (
    <div className={`flex flex-col min-h-full ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Today's Briefings — top of page */}
          <BriefingCard onOpenBrief={openBrief} pulseOnce={pulseOnce} />

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

      {/* Full brief modal */}
      {selectedBrief && (
        <BriefFullView
          brief={selectedBrief}
          onClose={closeBriefView}
          onPrev={onPrev}
          onNext={onNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
        />
      )}
    </div>
  );
}
