"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useActions } from "@/contexts/ActionsContext";
import { ExecutionBoard } from "./founder/ExecutionBoard";
import { WhatJustCameIn } from "./founder/WhatJustCameIn";
import { WaitingOnPanel } from "./founder/WaitingOnPanel";
import { MomentumModule } from "./founder/MomentumModule";
import { MOCK_ACTIVITY, type ActivityEvent } from "@/lib/founder/mockFounderData";
import { DailyPlanner } from "./daily-planner/DailyPlanner";
import { AgentStatusWidget } from "./founder/AgentStatusWidget";
import { EASE, T } from "@/lib/planner/animations";
import { api } from "@/lib/api";

export function FounderDashboard() {
  const { focusMode, setFocusMode } = useFocusMode();
  const { isDark } = useTheme();
  const { executionItems, momentum } = useActions();
  const { fire, cash, delivery } = executionItems;

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
                message: `Health status: ${c.status}${c.roas != null ? ` (ROAS ${c.roas.toFixed(1)})` : ""}`,
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

  /* Boot sequence: green dot pings during panel power-on, then goes solid */
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    if (focusMode) {
      setBooted(false);
      const t = setTimeout(() => setBooted(true), 1500);
      return () => clearTimeout(t);
    }
    setBooted(false);
  }, [focusMode]);

  return (
    <div className={`flex flex-col min-h-full ${isDark ? "bg-[#06060a]" : "bg-gray-50"}`}>
      {/* Header strip — Mode Control Panel */}
      <header
        className={`shrink-0 px-5 py-2.5 flex items-center justify-between ${
          isDark ? "border-b border-[#1a1810] bg-[#08080c]" : "border-b border-gray-200 bg-white"
        }`}
      >
        <div className="flex items-center gap-3">
          {focusMode && (
            <div className="relative flex items-center justify-center w-2 h-2">
              {/* Ping while booting, single pulse on ready, then solid */}
              {!booted && (
                <div className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />
              )}
              {booted && (
                <motion.div
                  className="absolute inset-[-3px] rounded-full bg-emerald-400/25"
                  initial={{ scale: 2, opacity: 0.6 }}
                  animate={{ scale: 1, opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                />
              )}
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
          )}
          <span
            className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${
              isDark ? "text-emerald-400/80" : "text-gray-900"
            }`}
          >
            {focusMode ? "Flight Deck" : "Full Board"}
          </span>
        </div>

        <div
          className={`flex ${
            focusMode
              ? "border border-[#1a1810] bg-[#0a0a0e]"
              : "border border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={() => setFocusMode(true)}
            className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
              focusMode
                ? isDark ? "bg-[#141210] text-emerald-400/90" : "bg-blue-100 text-blue-700"
                : isDark ? "text-[#4a4030] hover:text-[#8a7e6d]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Focus
          </button>
          <button
            type="button"
            onClick={() => setFocusMode(false)}
            className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors border-l ${
              isDark ? "border-[#1a1810]" : "border-gray-200"
            } ${
              !focusMode
                ? isDark ? "text-[#4a4030] hover:text-[#8a7e6d]" : "bg-white text-gray-900"
                : isDark ? "text-[#4a4030] hover:text-[#8a7e6d]" : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Full
          </button>
        </div>
      </header>

      {/* #11 — Focus ↔ Full: crossfade with scale 0.98→1.0 */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {focusMode ? (
            <motion.div
              key="focus"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: T.smooth, ease: EASE }}
              className="h-full"
            >
              <DailyPlanner />
            </motion.div>
          ) : (
            <motion.div
              key="full"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: T.smooth, ease: EASE }}
              className="p-4 sm:p-6 space-y-6 overflow-auto h-full"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <ExecutionBoard fire={fire} cash={cash} delivery={delivery} />
                  <WaitingOnPanel />
                </div>
                <aside className="lg:col-span-1 space-y-6">
                  <div className="lg:sticky lg:top-6 space-y-6">
                    <AgentStatusWidget />
                    <WhatJustCameIn events={activity} />
                    <MomentumModule stats={momentum} />
                  </div>
                </aside>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
