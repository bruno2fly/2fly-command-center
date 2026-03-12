"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import type { DashboardTodayCritical } from "@/lib/api";

type Props = {
  items: DashboardTodayCritical[];
};

function tabForActionType(actionType: string): string {
  if (actionType === "ads") return "ads";
  if (actionType === "task") return "tasks";
  if (actionType === "health") return "overview";
  return "overview";
}

export function CriticalSection({ items }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();

  const cardBg = isDark ? "bg-red-500/5 border-red-500/25 hover:border-red-500/50" : "bg-red-50/80 border-red-200 hover:border-red-300";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-600";
  const btnClass = "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors";

  const handleAction = (item: DashboardTodayCritical) => {
    const tab = tabForActionType(item.actionType);
    router.push(`/clients/${item.clientId}?tab=${tab}`);
  };

  if (items.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500/90">🔥 Critical — Act Now</h2>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-6 text-center ${isDark ? "text-[#c4b8a8]" : "text-gray-600"}`}
        >
          All clear 🎉
        </motion.div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-red-500/90">🔥 Critical — Act Now</h2>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <motion.li
            key={`${item.clientId}-${item.actionType}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-xl border-l-4 border-red-500/60 ${cardBg} border p-4`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={`font-medium ${text}`}>🏪 {item.clientName}</p>
                <p className={`text-sm ${muted} mt-0.5`}>{item.reason}</p>
                <p className={`text-sm ${muted} mt-1`}>→ {item.action}</p>
              </div>
              <button
                type="button"
                onClick={() => handleAction(item)}
                className={`mt-2 sm:mt-0 shrink-0 ${btnClass}`}
              >
                Action ▶
              </button>
            </div>
          </motion.li>
        ))}
      </ul>
    </section>
  );
}
