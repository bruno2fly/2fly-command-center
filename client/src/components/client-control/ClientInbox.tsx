"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { tagColors } from "@/lib/themeStyles";
import type { InboxItem, InboxSource } from "@/lib/client/mockClientControlData";
import { ClientInboxDrawer } from "./ClientInboxDrawer";

type Props = {
  items: InboxItem[];
  onConvertToTask: (id: string) => void;
  onMarkDone: (id: string) => void;
};

const TABS: { id: string; label: string; filter?: InboxSource }[] = [
  { id: "all", label: "All" },
  { id: "whatsapp", label: "WhatsApp", filter: "whatsapp" },
  { id: "2flyflow", label: "2FlyFlow", filter: "2flyflow" },
  { id: "approvals", label: "Approvals" },
  { id: "payments", label: "Payments" },
];

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

export function ClientInbox({ items, onConvertToTask, onMarkDone }: Props) {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedItem, setSelectedItem] = useState<InboxItem | null>(null);
  const tags = isDark ? tagColors.dark : tagColors.light;

  const filtered = useMemo(() => {
    const tab = TABS.find((t) => t.id === activeTab);
    if (!tab) return items;
    if (tab.filter) return items.filter((i) => i.source === tab.filter);
    if (tab.id === "approvals") return items.filter((i) => i.tags.includes("approval"));
    if (tab.id === "payments") return items.filter((i) => i.tags.includes("payment"));
    return items;
  }, [items, activeTab]);

  return (
    <div className="flex flex-col h-full">
      <h2 className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-700"}`}>Inbox</h2>
      <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                : isDark ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810] hover:text-[#c4b8a8]" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto min-h-0">
        {filtered.length === 0 ? (
          <div className={`py-8 px-4 text-center text-sm rounded-lg border border-dashed ${
            isDark ? "border-[#1a1810] bg-[#08080c]/50 text-[#5a5040]" : "border-gray-200 bg-gray-50/50 text-gray-500"
          }`}>
            <p className={isDark ? "font-medium text-[#8a7e6d]" : "font-medium text-gray-600"}>No new requests</p>
            <p className="mt-1">Add a note or capture a request to stay on top of things</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {filtered.map((item, idx) => (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                onClick={() => setSelectedItem(item)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border border-transparent ${
                  isDark ? "hover:bg-[#141210] hover:border-[#1a1810]" : "hover:bg-gray-50 hover:border-gray-100"
                }`}
              >
                <span className={`mt-0.5 ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>
                  {item.source === "whatsapp" ? (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                  ) : item.source === "2flyflow" ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>{item.summary}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{SOURCE_LABEL[item.source] ?? item.source}</span>
                    <span className={`text-xs ${isDark ? "text-[#4a4030]" : "text-gray-400"}`}>·</span>
                    <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>{formatTime(item.createdAt)}</span>
                    {item.tags.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className={`px-1.5 py-0.5 rounded text-xs ${tags[t] ?? (isDark ? "bg-[#1a1810] text-[#8a7e6d]" : "bg-gray-100 text-gray-600")}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
      <AnimatePresence>
        {selectedItem && (
          <ClientInboxDrawer
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onConvertToTask={onConvertToTask}
            onMarkDone={onMarkDone}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
