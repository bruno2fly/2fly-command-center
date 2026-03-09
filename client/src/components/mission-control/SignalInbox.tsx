"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { tagColors } from "@/lib/themeStyles";
import type { InboxItem } from "@/lib/client/mockClientControlData";
import { ClientInboxDrawer } from "@/components/client-control/ClientInboxDrawer";

const SOURCE_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  "2flyflow": "2FlyFlow",
  manual: "Manual",
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

type Props = {
  items: InboxItem[];
  openItemId?: string | null;
  onCloseDrawer?: () => void;
  onConvertToTask: (id: string) => void;
  onMarkDone: (id: string) => void;
};

type Group = "needs_reply" | "needs_approval" | "fyi" | "escalations";

function groupItems(items: InboxItem[]): Record<Group, InboxItem[]> {
  const needsReply: InboxItem[] = [];
  const needsApproval: InboxItem[] = [];
  const escalations: InboxItem[] = [];
  const fyi: InboxItem[] = [];

  for (const item of items) {
    if (item.tags.includes("urgent") && !item.tags.includes("approval")) {
      escalations.push(item);
    } else if (item.tags.includes("approval")) {
      needsApproval.push(item);
    } else if (item.priority === "high" || item.tags.includes("payment")) {
      needsReply.push(item);
    } else {
      fyi.push(item);
    }
  }

  return { needs_reply: needsReply, needs_approval: needsApproval, fyi, escalations };
}

const GROUP_LABELS: Record<Group, string> = {
  needs_reply: "Needs Reply",
  needs_approval: "Needs Approval",
  fyi: "FYI / Low Priority",
  escalations: "Escalations",
};

export function SignalInbox({
  items,
  openItemId,
  onCloseDrawer,
  onConvertToTask,
  onMarkDone,
}: Props) {
  const { isDark } = useTheme();
  const [internalSelected, setInternalSelected] = useState<InboxItem | null>(null);
  const selectedItem =
    internalSelected ??
    (openItemId ? (items.find((i) => i.id === openItemId) ?? null) : null);
  const tags = isDark ? tagColors.dark : tagColors.light;

  const groups = useMemo(() => groupItems(items), [items]);

  const totalCount = items.length;
  const urgentCount =
    groups.escalations.length + groups.needs_approval.length + groups.needs_reply.length;

  return (
    <section
      className={`rounded-xl border overflow-hidden ${
        isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"
      }`}
    >
      <div
        className={`px-4 py-3 border-b ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2
            className={`text-xs font-semibold uppercase tracking-wider ${
              isDark ? "text-[#8a7e6d]" : "text-gray-600"
            }`}
          >
            Signal Inbox
          </h2>
          {urgentCount > 0 && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-700"
              }`}
            >
              {urgentCount} need action
            </span>
          )}
        </div>
      </div>

      <div className="max-h-[280px] overflow-auto">
        {totalCount === 0 ? (
          <div
            className={`px-4 py-8 text-center text-sm ${
              isDark ? "text-[#5a5040]" : "text-gray-500"
            }`}
          >
            <p>No signals</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1810]">
            {(["escalations", "needs_approval", "needs_reply", "fyi"] as const).map(
              (groupKey) => {
                const groupItemsList = groups[groupKey];
                if (groupItemsList.length === 0) return null;

                return (
                  <div key={groupKey}>
                    <div
                      className={`px-4 py-2 ${
                        isDark ? "bg-[#08080c]/50" : "bg-gray-50/50"
                      }`}
                    >
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isDark ? "text-[#5a5040]" : "text-gray-500"
                        }`}
                      >
                        {GROUP_LABELS[groupKey]}
                      </p>
                    </div>
                    {groupItemsList.map((item, idx) => (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => setInternalSelected(item)}
                        className={`w-full flex items-start gap-3 px-4 py-2.5 text-left ${
                          isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className={`mt-0.5 flex-shrink-0 ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                          {item.source === "whatsapp" ? (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-medium truncate ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                            {item.summary}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
                              {SOURCE_LABEL[item.source]} · {formatTime(item.createdAt)}
                            </span>
                            {item.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className={`px-1.5 py-0.5 rounded text-[10px] ${tags[t] ?? (isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-100 text-gray-600")}`}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>

      {selectedItem && (
        <ClientInboxDrawer
          item={selectedItem}
          onClose={() => {
            setInternalSelected(null);
            onCloseDrawer?.();
          }}
          onConvertToTask={(id) => {
            onConvertToTask(id);
            setInternalSelected(null);
            onCloseDrawer?.();
          }}
          onMarkDone={(id) => {
            onMarkDone(id);
            setInternalSelected(null);
            onCloseDrawer?.();
          }}
        />
      )}
    </section>
  );
}
