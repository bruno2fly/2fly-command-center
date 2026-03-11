"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";

export type ActionQueuePriority = "urgent" | "warning" | "on_track";

export type ActionQueueItem = {
  id: string;
  title: string;
  dueAt: string | null;
  type: string;
  source: string;
  status: string;
  priority: ActionQueuePriority;
  /** For navigation: content | task | request | blocker | approval */
  entityType?: "content" | "task" | "request" | "blocker" | "approval";
  /** Real entity id for API (e.g. content id, task id, request id) */
  entityId?: string;
};

function formatDue(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

type Props = {
  items: ActionQueueItem[];
  viewAllHref?: string;
  onViewAll?: () => void;
  onItemClick?: (item: ActionQueueItem) => void;
};

export function ActionQueue({ items, viewAllHref, onViewAll, onItemClick }: Props) {
  const { isDark } = useTheme();

  const sectionCls = isDark
    ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]"
    : "bg-white border-[rgba(226,232,240,1)]";
  const headerCls = "text-xs font-semibold uppercase tracking-wider text-gray-500";
  const cardBg = isDark ? "bg-[rgba(30,41,59,0.5)]" : "bg-white";
  const borderCls = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const metaCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  const priorityBorder = {
    urgent: "border-l-red-500",
    warning: "border-l-amber-500",
    on_track: "border-l-emerald-500",
  };

  const priorityDot = {
    urgent: "bg-red-500",
    warning: "bg-amber-500",
    on_track: "bg-emerald-500",
  };

  const statusPillCls = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes("overdue") || s.includes("critical") || s.includes("urgent"))
      return "bg-red-500/10 text-red-400 border-red-500/20";
    if (s.includes("review") || s.includes("progress") || s.includes("waiting"))
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    if (s.includes("progress") || s.includes("track")) return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    return isDark ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : "bg-blue-100 text-blue-700 border-blue-200";
  };

  const typeBadgeCls = isDark ? "bg-[#1e293b] text-[#94a3b8]" : "bg-gray-100 text-gray-600";

  const displayItems = items.slice(0, 5);

  return (
    <section
      className={`rounded-2xl border backdrop-blur-[8px] overflow-hidden ${sectionCls}`}
    >
      <div className="px-4 py-3 border-b border-inherit">
        <h2 className={headerCls}>🔥 Action Queue</h2>
      </div>
      <div className="p-3 space-y-2">
        <motion.div
          variants={container}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          <AnimatePresence mode="popLayout">
            {displayItems.length === 0 ? (
              <motion.p
                variants={itemVariants}
                className={`text-sm py-6 text-center ${metaCls}`}
              >
                No items in queue
              </motion.p>
            ) : (
              displayItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  variants={itemVariants}
                  onClick={() => onItemClick?.(item)}
                  className={`rounded-xl border border-l-4 ${priorityBorder[item.priority]} ${cardBg} ${borderCls} p-3 transition-all duration-200 hover:shadow-md hover:shadow-blue-500/5 hover:border-blue-500/20 cursor-pointer flex items-center justify-between gap-2 group`}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0 flex-1">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${priorityDot[item.priority]}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate ${textCls}`}>
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.dueAt && (
                            <span className={`text-[10px] ${metaCls}`}>
                              Due: {formatDue(item.dueAt)}
                            </span>
                          )}
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${typeBadgeCls}`}
                          >
                            {item.type}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] ${metaCls} border border-inherit`}
                          >
                            {item.source}
                          </span>
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium border ${statusPillCls(item.status)}`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-gray-400 shrink-0 ${metaCls} group-hover:text-blue-500 transition-colors`} aria-hidden>
                      →
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
        {items.length > 5 && (
          <div className="pt-1">
            {viewAllHref ? (
              <a
                href={viewAllHref}
                className="text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline"
              >
                View all →
              </a>
            ) : (
              <button
                type="button"
                onClick={onViewAll}
                className="text-xs font-medium text-blue-500 hover:text-blue-600 hover:underline"
              >
                View all →
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
