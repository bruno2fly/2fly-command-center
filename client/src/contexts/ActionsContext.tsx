"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  MOCK_PRIORITY_ITEMS,
  getExecutionItems,
  sortPriorities,
  type ExecutionColumn,
  type ExecutionItem,
  type PriorityItem,
  type PriorityTag,
} from "@/lib/founder/mockFounderData";
import { MOCK_MOMENTUM } from "@/lib/founder/mockFounderData";
import type { TaskPriority } from "@/lib/founderConfig";
import { api } from "@/lib/api";
import type { ApiRequestItem } from "@/lib/api";

export type SnoozeUntil = "1h" | "tomorrow" | "nextweek" | string;

type ActionsContextValue = {
  /** Active priorities (excludes completed + snoozed) */
  activePriorities: PriorityItem[];
  /** Completed item IDs this session (for animation) */
  completedIds: Set<string>;
  /** Snoozed until (itemId -> ISO date) */
  snoozedUntil: Map<string, string>;
  /** Mark item as done */
  markComplete: (itemId: string, column: ExecutionColumn) => void;
  /** Mark by id (finds column from execution items) */
  markCompleteById: (itemId: string) => void;
  /** Snooze item */
  snooze: (itemId: string, until: SnoozeUntil) => void;
  /** Assign item */
  assign: (itemId: string, assignee: string) => void;
  /** Remove from completed (after animation) */
  removeFromCompleted: (itemId: string) => void;
  /** Execution board items (fire, cash, delivery) */
  executionItems: { fire: ExecutionItem[]; cash: ExecutionItem[]; delivery: ExecutionItem[] };
  /** Momentum stats (completedToday increments on markComplete) */
  momentum: { completedToday: number; completedThisWeek: number; streak: number };
  /** Focus strip items (top 3 by priority) */
  focusItems: PriorityItem[];
};

const ActionsContext = createContext<ActionsContextValue | null>(null);

const FOCUS_PRIORITY_ORDER: TaskPriority[] = ["CASH_NOW", "PREVENT_FIRE", "STRATEGIC"];

function getSnoozeDate(until: SnoozeUntil): string {
  const now = new Date();
  if (until === "1h") {
    const d = new Date(now.getTime() + 60 * 60 * 1000);
    return d.toISOString();
  }
  if (until === "tomorrow") {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  if (until === "nextweek") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  }
  return until;
}

function mapPriorityTag(priority: string): PriorityTag {
  if (priority === "urgent") return "CASH_NOW";
  if (priority === "high") return "PREVENT_FIRE";
  return "STRATEGIC";
}

function buildPriorityItem(r: ApiRequestItem): PriorityItem {
  const now = new Date();
  const dueDate = r.dueDate ? new Date(r.dueDate) : null;
  return {
    id: r.id,
    title: r.title,
    clientId: r.clientId,
    clientName: r.client?.name || "Unknown",
    tags: [mapPriorityTag(r.priority)],
    dueAt: r.dueDate || now.toISOString(),
    isOverdue: dueDate ? dueDate < now : false,
    dueToday: dueDate ? dueDate.toDateString() === now.toDateString() : false,
    cashImpact: 0,
    riskLevel: r.priority === "urgent" ? "red" : r.priority === "high" ? "yellow" : "green",
    source: "Manual",
    assignedTo: r.assignedTo || "Unassigned",
    summary: r.description || r.title,
  };
}

export function ActionsProvider({ children }: { children: ReactNode }) {
  const [priorityItems, setPriorityItems] = useState<PriorityItem[]>(MOCK_PRIORITY_ITEMS);
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [snoozedUntil, setSnoozedUntil] = useState<Map<string, string>>(() => new Map());
  const [baseMomentum, setBaseMomentum] = useState(MOCK_MOMENTUM);
  const [completedTodayCount, setCompletedTodayCount] = useState(MOCK_MOMENTUM.completedToday);

  // Fetch real data from API, fall back to mock on error
  useEffect(() => {
    async function loadRealData() {
      try {
        const [requestsData, briefData] = await Promise.all([
          api.getRequestsRaw(),
          api.getBrief().catch(() => null),
        ]);

        const requests = requestsData.requests || [];
        // Only use open/in-progress requests as priority items
        const openRequests = requests.filter(
          (r) => r.status !== "completed" && r.status !== "cancelled"
        );

        if (openRequests.length > 0) {
          const realPriorities = openRequests.map(buildPriorityItem);
          setPriorityItems(realPriorities);
        }

        // Compute momentum from completed requests
        if (requests.length > 0) {
          const now = new Date();
          const todayStr = now.toDateString();
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          weekStart.setHours(0, 0, 0, 0);

          const completedToday = requests.filter(
            (r) => r.status === "completed" && r.resolvedAt && new Date(r.resolvedAt).toDateString() === todayStr
          ).length;

          const completedThisWeek = requests.filter(
            (r) => r.status === "completed" && r.resolvedAt && new Date(r.resolvedAt) >= weekStart
          ).length;

          setBaseMomentum({
            completedToday,
            completedThisWeek,
            streak: MOCK_MOMENTUM.streak, // No easy way to compute streak from API
          });
          setCompletedTodayCount(completedToday);
        }
      } catch (err) {
        console.warn("Failed to load real data, using mock:", err);
        // Falls back to MOCK_PRIORITY_ITEMS already set as initial state
      }
    }
    loadRealData();
  }, []);

  const activePriorities = useMemo(() => {
    const now = new Date().toISOString();
    return priorityItems.filter((p) => {
      if (completedIds.has(p.id)) return false;
      const snooze = snoozedUntil.get(p.id);
      if (snooze && snooze > now) return false;
      return true;
    });
  }, [priorityItems, completedIds, snoozedUntil]);

  const executionItems = useMemo(() => {
    return getExecutionItems(activePriorities);
  }, [activePriorities]);

  const focusItems = useMemo(() => {
    const sorted = sortPriorities([...activePriorities]);
    return sorted
      .sort((a, b) => {
        const aIdx = FOCUS_PRIORITY_ORDER.indexOf(a.tags[0] ?? "STRATEGIC");
        const bIdx = FOCUS_PRIORITY_ORDER.indexOf(b.tags[0] ?? "STRATEGIC");
        return aIdx - bIdx;
      })
      .slice(0, 3);
  }, [activePriorities]);

  const momentum = useMemo(
    () => ({
      completedToday: completedTodayCount,
      completedThisWeek: Math.max(baseMomentum.completedThisWeek, completedTodayCount),
      streak: baseMomentum.streak,
    }),
    [completedTodayCount, baseMomentum]
  );

  const markComplete = useCallback((itemId: string, _column: ExecutionColumn) => {
    setCompletedIds((prev) => new Set(prev).add(itemId));
    setCompletedTodayCount((c) => c + 1);
  }, []);

  const markCompleteById = useCallback(
    (itemId: string) => {
      const { fire, cash, delivery } = executionItems;
      const found =
        fire.find((x) => x.id === itemId) ??
        cash.find((x) => x.id === itemId) ??
        delivery.find((x) => x.id === itemId);
      if (found) markComplete(itemId, found.column);
    },
    [executionItems, markComplete]
  );

  const removeFromCompleted = useCallback((itemId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);
      return next;
    });
  }, []);

  const snooze = useCallback((itemId: string, until: SnoozeUntil) => {
    const date = getSnoozeDate(until);
    setSnoozedUntil((prev) => {
      const next = new Map(prev);
      next.set(itemId, date);
      return next;
    });
  }, []);

  const assign = useCallback((_itemId: string, _assignee: string) => {
    // Placeholder - no-op for now, would update assignment
  }, []);

  const value = useMemo<ActionsContextValue>(
    () => ({
      activePriorities,
      completedIds,
      snoozedUntil,
      markComplete,
      markCompleteById,
      snooze,
      assign,
      removeFromCompleted,
      executionItems,
      momentum,
      focusItems,
    }),
    [
      activePriorities,
      completedIds,
      snoozedUntil,
      markComplete,
      markCompleteById,
      snooze,
      assign,
      removeFromCompleted,
      executionItems,
      momentum,
      focusItems,
    ]
  );

  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

export function useActions() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("useActions must be used within ActionsProvider");
  return ctx;
}
