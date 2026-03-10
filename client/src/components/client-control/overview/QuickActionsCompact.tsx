"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

const ACTIONS = [
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  { id: "new_request", label: "New Request", icon: "📝" },
  { id: "drive", label: "Drive Folder", icon: "📁" },
  { id: "ads", label: "Ad Platform", icon: "🎯" },
] as const;

type ActionId = (typeof ACTIONS)[number]["id"];

type Props = {
  onWhatsApp?: () => void;
  onNewRequest?: () => void;
  onDrive?: () => void;
  onAdPlatform?: () => void;
};

export function QuickActionsCompact({
  onWhatsApp,
  onNewRequest,
  onDrive,
  onAdPlatform,
}: Props) {
  const { isDark } = useTheme();

  const sectionCls = isDark
    ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]"
    : "bg-white border-[rgba(226,232,240,1)]";
  const headerCls = "text-xs font-semibold uppercase tracking-wider text-gray-500";
  const btnCls = isDark
    ? "hover:bg-[rgba(51,65,85,0.4)] text-[#94a3b8]"
    : "hover:bg-gray-100 text-gray-600";

  const handlers: Record<ActionId, (() => void) | undefined> = {
    whatsapp: onWhatsApp,
    new_request: onNewRequest,
    drive: onDrive,
    ads: onAdPlatform,
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05, ease: "easeOut" }}
      className={`rounded-2xl border backdrop-blur-[8px] overflow-hidden ${sectionCls}`}
    >
      <div className="px-4 py-3 border-b border-inherit">
        <h2 className={headerCls}>⚡ Quick Actions</h2>
      </div>
      <div className="p-2 grid grid-cols-2 gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => handlers[a.id]?.()}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-all duration-200 ${btnCls}`}
          >
            <span className="text-base" aria-hidden>
              {a.icon}
            </span>
            {a.label}
          </button>
        ))}
      </div>
    </motion.section>
  );
}
