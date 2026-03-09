"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  Task,
  TaskBucket,
  TaskStatus,
  TimeBlock,
  WorkMode,
} from "@/lib/planner/types";
import { SEED_TASKS, DEFAULT_TIME_BLOCKS } from "@/lib/planner/mockTasks";

type DailyPlannerContextValue = {
  tasks: Task[];
  timeBlocks: TimeBlock[];
  workMode: WorkMode;
  focusLockUntil: number | null;

  tasksByBucket: (bucket: TaskBucket) => Task[];
  getTask: (id: string) => Task | undefined;
  doneCount: number;
  totalCount: number;

  moveTask: (taskId: string, bucket: TaskBucket) => void;
  setStatus: (taskId: string, status: TaskStatus) => void;
  assignToBlock: (taskId: string, blockId: string) => void;
  removeFromBlock: (taskId: string, blockId: string) => void;
  setWorkMode: (mode: WorkMode) => void;
  startFocusLock: (minutes: number) => void;
  addTask: (task: Task) => void;
  promoteToInbox: (taskId: string) => void;
};

const DailyPlannerContext = createContext<DailyPlannerContextValue | null>(null);

export function DailyPlannerProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(DEFAULT_TIME_BLOCKS);
  const [workMode, setWorkMode] = useState<WorkMode>("deep");
  const [focusLockUntil, setFocusLockUntil] = useState<number | null>(null);

  const tasksByBucket = useCallback(
    (bucket: TaskBucket) =>
      tasks
        .filter((t) => t.bucket === bucket && t.status !== "done")
        .sort((a, b) => a.priority - b.priority),
    [tasks]
  );

  const getTask = useCallback(
    (id: string) => tasks.find((t) => t.id === id),
    [tasks]
  );

  const doneCount = useMemo(
    () => tasks.filter((t) => t.status === "done").length,
    [tasks]
  );

  const totalCount = useMemo(
    () => tasks.filter((t) => t.bucket !== "inbox").length,
    [tasks]
  );

  const moveTask = useCallback((taskId: string, bucket: TaskBucket) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, bucket } : t))
    );
  }, []);

  const setStatus = useCallback((taskId: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
  }, []);

  const assignToBlock = useCallback((taskId: string, blockId: string) => {
    setTimeBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId && !b.assignedTaskIds.includes(taskId)
          ? { ...b, assignedTaskIds: [...b.assignedTaskIds, taskId] }
          : b
      )
    );
  }, []);

  const removeFromBlock = useCallback((taskId: string, blockId: string) => {
    setTimeBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, assignedTaskIds: b.assignedTaskIds.filter((id) => id !== taskId) }
          : b
      )
    );
  }, []);

  const startFocusLock = useCallback((minutes: number) => {
    setFocusLockUntil(Date.now() + minutes * 60 * 1000);
  }, []);

  const addTask = useCallback((task: Task) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const promoteToInbox = useCallback((taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, bucket: "later" as TaskBucket } : t
      )
    );
  }, []);

  const value = useMemo<DailyPlannerContextValue>(
    () => ({
      tasks,
      timeBlocks,
      workMode,
      focusLockUntil,
      tasksByBucket,
      getTask,
      doneCount,
      totalCount,
      moveTask,
      setStatus,
      assignToBlock,
      removeFromBlock,
      setWorkMode,
      startFocusLock,
      addTask,
      promoteToInbox,
    }),
    [
      tasks,
      timeBlocks,
      workMode,
      focusLockUntil,
      tasksByBucket,
      getTask,
      doneCount,
      totalCount,
      moveTask,
      setStatus,
      assignToBlock,
      removeFromBlock,
      startFocusLock,
      addTask,
      promoteToInbox,
    ]
  );

  return (
    <DailyPlannerContext.Provider value={value}>
      {children}
    </DailyPlannerContext.Provider>
  );
}

export function useDailyPlanner() {
  const ctx = useContext(DailyPlannerContext);
  if (!ctx)
    throw new Error("useDailyPlanner must be used within DailyPlannerProvider");
  return ctx;
}
