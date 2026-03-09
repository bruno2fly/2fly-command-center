"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { toast } from "sonner";
import { useActions } from "@/contexts/ActionsContext";
import type { PriorityItem, PriorityTag } from "@/lib/founder/mockFounderData";

const TAG_BADGE: Record<PriorityTag, { class: string; label: string }> = {
  CASH_NOW: { class: "bg-amber-100 text-amber-700", label: "Cash" },
  PREVENT_FIRE: { class: "bg-red-100 text-red-700", label: "Fire" },
  STRATEGIC: { class: "bg-blue-100 text-blue-700", label: "Delivery" },
};

type Props = {
  items: PriorityItem[];
};

export function NextQueue({ items }: Props) {
  const { markCompleteById } = useActions();

  const handleDo = useCallback(
    (id: string, title: string) => {
      markCompleteById(id);
      toast.success(`Done: ${title}`);
    },
    [markCompleteById]
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Next up</h3>
        <Link
          href="#"
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          View full board →
        </Link>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => {
          const tag = item.tags[0] ?? "STRATEGIC";
          const badge = TAG_BADGE[tag];

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.2 }}
              className="group flex items-center gap-3 rounded-xl bg-white border border-gray-100 px-4 py-3 hover:border-gray-200 transition-colors"
            >
              {/* Tag */}
              <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badge.class}`}>
                {badge.label}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.title}
                  <span className="text-gray-400 font-normal"> · {item.clientName}</span>
                </p>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={() => handleDo(item.id, item.title)}
                className="shrink-0 opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition-all"
              >
                Do it
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
