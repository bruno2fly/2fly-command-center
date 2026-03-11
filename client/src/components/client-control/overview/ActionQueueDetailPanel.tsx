"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import type { ActionQueueItem } from "./ActionQueue";
import type { ApiContentItem, ApiRequestItem, ApiTask } from "@/lib/api";

type Props = {
  item: ActionQueueItem | null;
  content?: ApiContentItem | null;
  task?: ApiTask | null;
  request?: ApiRequestItem | null;
  onClose: () => void;
  onSwitchToContent?: (contentId?: string) => void;
  onSwitchToTasks?: (taskId?: string) => void;
  onSwitchToRequests?: (requestId?: string) => void;
  onApproveContent?: (id: string) => void;
  onRejectContent?: (id: string) => void;
  onCompleteTask?: (id: string) => void;
  onAcknowledgeRequest?: (id: string) => void;
  onResolveRequest?: (id: string) => void;
};

export function ActionQueueDetailPanel({
  item,
  content,
  task,
  request,
  onClose,
  onSwitchToContent,
  onSwitchToTasks,
  onSwitchToRequests,
  onApproveContent,
  onRejectContent,
  onCompleteTask,
  onAcknowledgeRequest,
  onResolveRequest,
}: Props) {
  const { isDark } = useTheme();
  const panelBg = isDark ? "bg-[#0f172a] border-[#1e293b]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[100]"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed top-0 right-0 w-full max-w-md h-full border-l shadow-2xl z-[101] ${panelBg}`}
          >
            <div className="p-4 border-b border-inherit flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${textCls}`}>{item.type} detail</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 text-gray-500"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className={`text-sm font-medium ${textCls}`}>{item.title}</p>
              {item.dueAt && (
                <p className={`text-xs mt-1 ${mutedCls}`}>Due: {new Date(item.dueAt).toLocaleDateString()}</p>
              )}
              {item.status && (
                <p className={`text-xs mt-0.5 ${mutedCls}`}>Status: {item.status}</p>
              )}

              {item.entityType === "content" && content && (
                <div className="mt-4 space-y-3">
                  <p className={`text-xs ${mutedCls}`}>
                    Type: {(content as { contentType?: string }).contentType ?? content.type ?? "—"}
                  </p>
                  {content.scheduledDate && (
                    <p className={`text-xs ${mutedCls}`}>
                      Scheduled: {new Date(content.scheduledDate).toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        onApproveContent?.(content.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRejectContent?.(content.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-gray-700"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchToContent?.(content.id);
                        onClose();
                      }}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Open in Content tab →
                    </button>
                  </div>
                </div>
              )}

              {item.entityType === "task" && task && (
                <div className="mt-4 space-y-3">
                  {task.description && (
                    <p className={`text-xs ${mutedCls}`}>{task.description}</p>
                  )}
                  <p className={`text-xs ${mutedCls}`}>Priority: {task.priority}</p>
                  {task.assignedTo && (
                    <p className={`text-xs ${mutedCls}`}>Assigned: {task.assignedTo}</p>
                  )}
                  {task.dueDate && (
                    <p className={`text-xs ${mutedCls}`}>Due: {new Date(task.dueDate).toLocaleDateString()}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {task.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => {
                          onCompleteTask?.(task.id);
                          onClose();
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white"
                      >
                        Mark complete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchToTasks?.(task.id);
                        onClose();
                      }}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Open in Tasks tab →
                    </button>
                  </div>
                </div>
              )}

              {item.entityType === "request" && request && (
                <div className="mt-4 space-y-3">
                  {(request as { description?: string }).description && (
                    <p className={`text-xs ${mutedCls}`}>{(request as { description?: string }).description}</p>
                  )}
                  <p className={`text-xs ${mutedCls}`}>Priority: {request.priority}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        onAcknowledgeRequest?.(request.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-500 text-white"
                    >
                      Acknowledge
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onResolveRequest?.(request.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 text-white"
                    >
                      Resolve
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onSwitchToRequests?.(request.id);
                        onClose();
                      }}
                      className="text-sm text-blue-500 hover:underline"
                    >
                      Open in Tasks & Requests →
                    </button>
                  </div>
                </div>
              )}

              {(item.entityType === "blocker" || item.entityType === "approval") && (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToRequests?.();
                      onClose();
                    }}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    View in Tasks & Requests →
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
