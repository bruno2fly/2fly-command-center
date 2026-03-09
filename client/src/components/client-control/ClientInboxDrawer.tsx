"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { InboxItem } from "@/lib/client/mockClientControlData";

type Props = {
  item: InboxItem | null;
  onClose: () => void;
  onConvertToTask: (id: string) => void;
  onMarkDone: (id: string) => void;
};

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  "2flyflow": "2FlyFlow",
  manual: "Manual",
};

const TAG_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-800",
  approval: "bg-amber-100 text-amber-800",
  payment: "bg-emerald-100 text-emerald-800",
  content: "bg-blue-100 text-blue-800",
  ads: "bg-purple-100 text-purple-800",
  support: "bg-gray-100 text-gray-800",
};

export function ClientInboxDrawer({ item, onClose, onConvertToTask, onMarkDone }: Props) {
  if (!item) return null;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/20"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            {SOURCE_LABEL[item.source] ?? item.source}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">{item.summary}</h3>
            <p className="text-xs text-gray-500 mt-1">{formatTime(item.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.tags.map((t) => (
              <span
                key={t}
                className={`px-2 py-0.5 rounded text-xs font-medium ${TAG_COLORS[t] ?? "bg-gray-100 text-gray-700"}`}
              >
                {t}
              </span>
            ))}
          </div>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{item.body}</p>
          {item.suggestedAction && (
            <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
              <p className="text-xs font-medium text-amber-800 uppercase tracking-wider">AI suggested</p>
              <p className="text-sm text-amber-900 mt-1">{item.suggestedAction}</p>
            </div>
          )}
          <p className="text-xs text-gray-400">Linked tasks will appear here when integrated.</p>
        </div>
        <div className="p-4 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onConvertToTask(item.id)}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500"
          >
            Convert to Task
          </button>
          <button
            onClick={() => onMarkDone(item.id)}
            className="px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
          >
            Mark done
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
