"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  getExecutionItems,
  type ExecutionItem,
  type ExecutionColumn,
  type PriorityTag,
} from "@/lib/founder/mockFounderData";
import { useActions } from "@/contexts/ActionsContext";

const COLUMN_CONFIG: Record<ExecutionColumn, { title: string; accent: string }> = {
  fire: { title: "Fire", accent: "border-red-200 bg-red-50/50" },
  cash: { title: "Cash Impact", accent: "border-amber-200 bg-amber-50/50" },
  delivery: { title: "Delivery", accent: "border-blue-200 bg-blue-50/50" },
};

const TAG_COLORS: Record<PriorityTag, string> = {
  CASH_NOW: "bg-amber-100 text-amber-800",
  PREVENT_FIRE: "bg-red-100 text-red-800",
  STRATEGIC: "bg-blue-100 text-blue-800",
};

function ExecutionColumn({
  title,
  items,
  accent,
  column,
  onDoIt,
  loadingItem,
  onCheckmark,
}: {
  title: string;
  items: ExecutionItem[];
  accent: string;
  column: ExecutionColumn;
  onDoIt: (item: ExecutionItem) => void;
  loadingItem: string | null;
  onCheckmark: (item: ExecutionItem) => void;
}) {
  return (
    <div className={`rounded-xl border ${accent} overflow-hidden flex flex-col min-h-[200px]`}>
      <div className="px-4 py-3 border-b border-gray-100 bg-white/80">
        <h3 className="font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="flex-1 p-4 space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">Nothing here</p>
        ) : (
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-white border border-gray-100 hover:border-gray-200"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{item.clientName}</p>
                  <p className="text-sm text-gray-700 truncate">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{item.context}</p>
                  <span
                    className={`inline-block mt-2 text-[10px] px-1.5 py-0.5 rounded ${TAG_COLORS[item.impactTag]}`}
                  >
                    {item.impactTag.replace("_", " ")}
                  </span>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onDoIt(item)}
                    disabled={loadingItem === item.id}
                    className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 disabled:opacity-60"
                  >
                    {loadingItem === item.id ? "…" : "Do it"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onCheckmark(item)}
                    disabled={loadingItem === item.id}
                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                  >
                    ✓
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

type Props = {
  fire: ExecutionItem[];
  cash: ExecutionItem[];
  delivery: ExecutionItem[];
};

export function ExecutionBoard({ fire, cash, delivery }: Props) {
  const { markComplete } = useActions();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const handleComplete = useCallback(
    (item: ExecutionItem) => {
      setLoadingItem(item.id);
      markComplete(item.id, item.column);

      const allItems = [...fire, ...cash, ...delivery];
      const remaining = allItems.filter((x) => x.id !== item.id).length;
      const colLabel = item.column === "fire" ? "Fire" : item.column === "cash" ? "Cash" : "Delivery";

      toast.success(`✓ Done! ${remaining > 0 ? `${remaining} more ${colLabel} items today` : "All clear!"}`);
      setTimeout(() => setLoadingItem(null), 200);
    },
    [fire, cash, delivery, markComplete]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Today&apos;s Execution Board</h2>
        <p className="text-xs text-gray-500 mt-0.5">Fire · Cash · Delivery</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <ExecutionColumn
          title={COLUMN_CONFIG.fire.title}
          items={fire}
          accent={COLUMN_CONFIG.fire.accent}
          column="fire"
          onDoIt={handleComplete}
          onCheckmark={handleComplete}
          loadingItem={loadingItem}
        />
        <ExecutionColumn
          title={COLUMN_CONFIG.cash.title}
          items={cash}
          accent={COLUMN_CONFIG.cash.accent}
          column="cash"
          onDoIt={handleComplete}
          onCheckmark={handleComplete}
          loadingItem={loadingItem}
        />
        <ExecutionColumn
          title={COLUMN_CONFIG.delivery.title}
          items={delivery}
          accent={COLUMN_CONFIG.delivery.accent}
          column="delivery"
          onDoIt={handleComplete}
          onCheckmark={handleComplete}
          loadingItem={loadingItem}
        />
      </div>
    </div>
  );
}
