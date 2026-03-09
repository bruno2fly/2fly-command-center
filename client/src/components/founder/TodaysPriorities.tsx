"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  sortPriorities,
  type PriorityItem,
  type PriorityTag,
} from "@/lib/founder/mockFounderData";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDue(item: PriorityItem) {
  if (item.isOverdue) return "Overdue";
  if (item.dueToday) return "Today";
  return new Date(item.dueAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const TAG_COLORS: Record<PriorityTag, string> = {
  CASH_NOW: "bg-amber-100 text-amber-800",
  PREVENT_FIRE: "bg-red-100 text-red-800",
  STRATEGIC: "bg-blue-100 text-blue-800",
};

const RISK_DOT: Record<string, string> = {
  red: "bg-red-500",
  yellow: "bg-amber-500",
  green: "bg-emerald-500",
};

type Props = {
  items: PriorityItem[];
};

export function TodaysPriorities({ items }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const sorted = sortPriorities(items);

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500 font-medium">No priorities today</p>
        <p className="text-sm text-gray-400 mt-1">
          Add a note or capture a request to get started
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">Today&apos;s Priorities</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Sorted by cash impact, due date, risk
        </p>
      </div>
      <div className="divide-y divide-gray-50">
        {sorted.map((item) => {
          const isExpanded = expandedId === item.id;
          return (
            <motion.div
              key={item.id}
              layout
              className="transition-colors hover:bg-gray-50/50"
            >
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${RISK_DOT[item.riskLevel]}`} />
                <span className="font-medium text-gray-900">{item.title}</span>
                <span className="text-gray-500">· {item.clientName}</span>
                <div className="flex gap-1.5 flex-wrap">
                  {item.tags.map((t) => (
                    <span
                      key={t}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${TAG_COLORS[t]}`}
                    >
                      {t.replace("_", " ")}
                    </span>
                  ))}
                </div>
                <span
                  className={`text-xs ${
                    item.isOverdue ? "text-red-600" : item.dueToday ? "text-amber-600" : "text-gray-500"
                  }`}
                >
                  {formatDue(item)}
                </span>
                {item.cashImpact > 0 && (
                  <span className="text-xs font-medium text-emerald-600">
                    {formatCurrency(item.cashImpact)}
                  </span>
                )}
                <span className="ml-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500"
                  >
                    Do it
                  </button>
                </span>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-0 pl-9 space-y-3 border-t border-gray-100 bg-gray-50/50">
                      <p className="text-sm text-gray-600">{item.summary}</p>
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Assigned: {item.assignedTo}</span>
                        <span>Source: {item.source}</span>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Link
                          href={`/clients/${item.clientId}`}
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Open Client
                        </Link>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Mark Done
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-100"
                        >
                          Snooze
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
