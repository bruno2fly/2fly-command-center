"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ApiAction } from "@/lib/api";
import { ActionCard } from "./ActionCard";
import { EmptyActions } from "./EmptyActions";

type Props = {
  clientId: string;
  clientName?: string;
};

export function FocusedActionFlow({ clientId, clientName }: Props) {
  const [queue, setQueue] = useState<ApiAction[]>([]);
  const [clientNameState, setClientNameState] = useState(clientName ?? "");
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(() => {
    if (!clientId) return;
    setLoading(true);
    api
      .getClientActions(clientId)
      .then((r) => {
        setQueue(r.actions ?? []);
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

  const handleRejectAgentAction = useCallback(() => {
    if (!current || current.entityType !== "agent_action") return;
    api.patchAgentAction(current.entityId, { status: "rejected" }).then(removeCurrentAndNext).catch(() => {});
  }, [current]);

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
          onSkip={skipCurrent}
        />
      </motion.div>
    </AnimatePresence>
  );
}
