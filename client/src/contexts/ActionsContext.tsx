"use client";

import {
  createContext,
  useCallback,
  useContext,
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
} from "@/lib/founder/mockFounderData";
import { MOCK_MOMENTUM } from "@/lib/founder/mockFounderData";
import type { TaskPriority } from "@/lib/founderConfig";

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

export function ActionsProvider({ children }: { children: ReactNode }) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [snoozedUntil, setSnoozedUntil] = useState<Map<string, string>>(() => new Map());
  const [completedTodayCount, setCompletedTodayCount] = useState(MOCK_MOMENTUM.completedToday);

  const activePriorities = useMemo(() => {
    const now = new Date().toISOString();
    return MOCK_PRIORITY_ITEMS.filter((p) => {
      if (completedIds.has(p.id)) return false;
      const snooze = snoozedUntil.get(p.id);
      if (snooze && snooze > now) return false;
      return true;
    });
  }, [completedIds, snoozedUntil]);

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
      completedThisWeek: Math.max(MOCK_MOMENTUM.completedThisWeek, completedTodayCount),
      streak: MOCK_MOMENTUM.streak,
    }),
    [completedTodayCount]
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
