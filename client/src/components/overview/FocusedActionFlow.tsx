"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ApiAction } from "@/lib/api";
import { ActionCard } from "./ActionCard";
import { EmptyActions } from "./EmptyActions";

type Props = {
  clientId: string;
  clientName?: string;
  onOpenTaskDetail?: (taskId: string) => void;
};

export function FocusedActionFlow({ clientId, clientName, onOpenTaskDetail }: Props) {
  const [queue, setQueue] = useState<ApiAction[]>([]);
  const [clientNameState, setClientNameState] = useState(clientName ?? "");
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(() => {
    if (!clientId) return;
    setLoading(true);
    api
      .getClientActions(clientId)
      .then((r) => {
        const actions = r.actions ?? [];
        // Agent actions (proposals) first, then rest by overdue + priority
        const agentFirst = [...actions].sort((a, b) => {
          const aAgent = a.entityType === "agent_action" ? 1 : 0;
          const bAgent = b.entityType === "agent_action" ? 1 : 0;
          if (aAgent !== bAgent) return bAgent - aAgent; // agent_action first
          if (a.isOverdue && !b.isOverdue) return -1;
          if (!a.isOverdue && b.isOverdue) return 1;
          const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
          const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
          const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
          return pa - pb;
        });
        setQueue(agentFirst);
      })
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
    if (!clientName) {
      api.getClient(clientId).then((c) => setClientNameState((c as { name?: string })?.name ?? "")).catch(() => {});
    } else {
      setClientNameState(clientName);
    }
  }, [clientId, clientName]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  // Refetch when clientId changes (e.g. navigation) so we never show another client's actions
  useEffect(() => {
    setQueue([]);
  }, [clientId]);

  const current = queue[0];
  const total = queue.length;
  const position = 1;

  const removeCurrentAndNext = () => {
    setQueue((prev) => prev.slice(1));
  };

  const skipCurrent = () => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev;
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  };

  const handleApprove = useCallback(() => {
    if (!current || current.entityType !== "content") return;
    api.patchContent(current.entityId, { status: "approved" }).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

  const handleReject = useCallback(() => {
    if (!current || current.entityType !== "content") return;
    api.patchContent(current.entityId, { status: "cancelled" }).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

  const handleStart = useCallback(() => {
    if (!current || current.entityType !== "task") return;
    api
      .patchClientTask(clientId, current.entityId, { status: "in_progress" })
      .then(() => fetchActions())
      .catch(() => {});
  }, [clientId, current, fetchActions]);

  const handleComplete = useCallback(() => {
    if (!current || current.entityType !== "task") return;
    api.patchClientTask(clientId, current.entityId, { status: "completed" }).then(removeCurrentAndNext).catch(() => {});
  }, [clientId, current]);

  const handleAcknowledge = useCallback(() => {
    if (!current || current.entityType !== "request") return;
    api.patchRequest(current.entityId, { status: "acknowledged" }).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

  const handleResolve = useCallback(() => {
    if (!current || current.entityType !== "request") return;
    api.patchRequest(current.entityId, { status: "completed" }).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

  const handleExecute = useCallback(() => {
    if (!current || current.entityType !== "agent_action") return;
    api.executeAgentAction(current.entityId).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

  const handleApproveAgentAction = useCallback(() => {
    if (!current || current.entityType !== "agent_action") return;
    api.patchAgentAction(current.entityId, { status: "approved" }).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

  const handleConvertToTasks = useCallback(() => {
    if (!current || current.entityType !== "agent_action") return;
    api
      .convertAgentActionToTasks(current.entityId, clientId)
      .then(() => {
        removeCurrentAndNext();
      })
      .catch(() => {});
  }, [clientId, current]);

  const handleRejectAgentAction = useCallback(() => {
    if (!current || current.entityType !== "agent_action") return;
    api.patchAgentAction(current.entityId, { status: "rejected" }).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

  const handleDueDateChange = useCallback(
    (taskId: string, dueDate: string | null) => {
      api
        .patchClientTask(clientId, taskId, { dueDate })
        .then(() => fetchActions())
        .catch(() => {});
    },
    [clientId, fetchActions]
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 text-sm">
        Loading actions…
      </div>
    );
  }

  if (queue.length === 0) {
    return <EmptyActions clientName={clientNameState || "this client"} />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current?.id}
        initial={{ opacity: 0, x: 80 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -80 }}
        transition={{ duration: 0.3 }}
      >
        <ActionCard
          action={current!}
          position={position}
          total={total}
          onApprove={current?.entityType === "content" ? handleApprove : undefined}
          onReject={current?.entityType === "content" ? handleReject : current?.entityType === "agent_action" ? handleRejectAgentAction : undefined}
          onComplete={current?.entityType === "task" && current?.taskStatus === "in_progress" ? handleComplete : undefined}
          onStart={current?.entityType === "task" && current?.taskStatus === "pending" ? handleStart : undefined}
          onAcknowledge={current?.entityType === "request" ? handleAcknowledge : undefined}
          onResolve={current?.entityType === "request" ? handleResolve : undefined}
          onExecute={current?.entityType === "agent_action" ? handleExecute : undefined}
          onApproveAgentAction={current?.entityType === "agent_action" ? handleApproveAgentAction : undefined}
          onConvertToTasks={current?.entityType === "agent_action" ? handleConvertToTasks : undefined}
          onDueDateChange={current?.entityType === "task" ? handleDueDateChange : undefined}
          onSkip={skipCurrent}
          onOpenTaskDetail={current?.entityType === "task" ? onOpenTaskDetail : undefined}
        />
      </motion.div>
    </AnimatePresence>
  );
}
