"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

export type ActivityTimelineEntry = {
  id: string;
  text: string;
  time: string;
  type?: "completed" | "info" | "blocker" | "waiting";
};

const container = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -8 },
  visible: { opacity: 1, x: 0 },
};

type Props = {
  entries: ActivityTimelineEntry[];
};

function dotClass(type: ActivityTimelineEntry["type"], isDark: boolean) {
  switch (type) {
    case "completed":
      return "bg-emerald-500";
    case "info":
      return isDark ? "bg-blue-400" : "bg-blue-500";
    case "blocker":
      return "bg-red-500";
    case "waiting":
      return "bg-amber-500";
    default:
      return isDark ? "bg-blue-400" : "bg-blue-500";
  }
}

export function ActivityTimeline({ entries }: Props) {
  const { isDark } = useTheme();

  const sectionCls = isDark
    ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]"
    : "bg-white border-[rgba(226,232,240,1)]";
  const headerCls = "text-xs font-semibold uppercase tracking-wider text-gray-500";
  const lineCls = isDark ? "bg-[rgba(51,65,85,0.6)]" : "bg-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const metaCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`rounded-2xl border backdrop-blur-[8px] overflow-hidden ${sectionCls}`}
    >
      <div className="px-4 py-3 border-b border-inherit">
        <h2 className={headerCls}>🕐 Activity Timeline</h2>
      </div>
      <div className="p-4 max-h-[280px] overflow-y-auto">
        <motion.ul
          variants={container}
          initial="hidden"
          animate="visible"
          className="relative"
        >
          {entries.length === 0 ? (
            <p className={`text-sm py-4 ${metaCls}`}>No recent activity</p>
          ) : (
            entries.map((entry, index) => (
              <motion.li
                key={entry.id}
                variants={itemVariants}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {/* vertical line */}
                {index < entries.length - 1 && (
                  <span
                    className={`absolute left-[5px] top-5 bottom-0 w-px ${lineCls}`}
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-[1] w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${dotClass(entry.type, isDark)}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${textCls}`}>{entry.text}</p>
                  <p className={`text-[10px] mt-0.5 ${metaCls}`}>{entry.time}</p>
                </div>
              </motion.li>
            ))
          )}
        </motion.ul>
      </div>
    </motion.section>
  );
}
