"use client";

import { useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { ApiContentItem } from "@/lib/api";

export type ContentItemForPipeline = {
  id: string;
  title: string;
  type?: string;
  status: string;
  scheduledDate?: string | null;
};

const PIPELINE_COLUMNS = [
  { id: "ideation", label: "Ideation" },
  { id: "creation", label: "Creation" },
  { id: "review", label: "Review" },
  { id: "approved", label: "Approved" },
  { id: "scheduled", label: "Scheduled" },
] as const;

const STATUS_OPTIONS = ["draft", "review", "scheduled", "approved", "published", "cancelled"] as const;

const ROWS = [
  { id: "feed", label: "Feed 📸", types: ["post", "blog", "ad_creative"] },
  { id: "reels", label: "Reels 🎬", types: ["reel", "video"] },
  { id: "story", label: "Story 📱", types: ["story"] },
  { id: "carousel", label: "Carousel 🎠", types: ["carousel"] },
];

function statusToColumn(status: string, hasScheduledDate: boolean): (typeof PIPELINE_COLUMNS)[number]["id"] {
  const s = (status || "draft").toLowerCase();
  if (s === "scheduled") return "scheduled";
  if (s === "approved") return "approved";
  if (s === "in_review" || s === "review") return "review";
  if (s === "draft" && hasScheduledDate) return "creation";
  if (s === "draft") return "ideation";
  return "ideation";
}

function typeToRow(type: string): (typeof ROWS)[number]["id"] {
  const t = (type || "post").toLowerCase();
  for (const row of ROWS) {
    if (row.types.includes(t)) return row.id;
  }
  return "feed";
}

function toPipelineItem(c: ApiContentItem): ContentItemForPipeline & { _raw: ApiContentItem } {
  return {
    id: c.id,
    title: c.title,
    type: c.contentType ?? c.type ?? "post",
    status: c.status ?? "draft",
    scheduledDate: c.scheduledDate ?? null,
    _raw: c,
  };
}

export function columnIdToDefaultStatus(columnId: string): string {
  const map: Record<string, string> = {
    ideation: "draft",
    creation: "draft",
    review: "review",
    approved: "approved",
    scheduled: "scheduled",
  };
  return map[columnId] ?? "draft";
}

type Props = {
  content: ApiContentItem[];
  onItemClick?: (item: ApiContentItem) => void;
  onStatusChange?: (itemId: string, newStatus: string) => void;
  onAddInColumn?: (columnId: string) => void;
};

export function ContentPipelineKanban({ content, onItemClick, onStatusChange, onAddInColumn }: Props) {
  const { isDark } = useTheme();
  const [changingId, setChangingId] = useState<string | null>(null);

  const pipelineItems = useMemo(() => content.map(toPipelineItem), [content]);

  const byRowAndCol = useMemo(() => {
    const map: Record<string, Record<string, (ContentItemForPipeline & { _raw: ApiContentItem })[]>> = {};
    for (const row of ROWS) {
      map[row.id] = {};
      for (const col of PIPELINE_COLUMNS) {
        map[row.id][col.id] = [];
      }
    }
    for (const item of pipelineItems) {
      const row = typeToRow(item.type ?? "post");
      const col = statusToColumn(item.status, !!(item.scheduledDate && item.status === "draft"));
      if (map[row] && map[row][col]) map[row][col].push(item);
    }
    return map;
  }, [pipelineItems]);

  const cardBg = isDark ? "bg-[rgba(30,41,59,0.8)]" : "bg-white";
  const cardBorder = isDark ? "border-[rgba(51,65,85,0.5)]" : "border-gray-200";
  const headerBg = isDark ? "bg-slate-900/80" : "bg-white";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <div className={`rounded-2xl border ${cardBorder} overflow-hidden ${isDark ? "bg-[rgba(30,41,59,0.3)]" : "bg-slate-50/50"}`}>
      <div className={`px-4 py-3 border-b ${cardBorder}`}>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Production Pipeline
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] border-collapse">
          <thead>
            <tr>
              <th className={`w-28 py-2 px-2 text-left text-[10px] font-semibold uppercase tracking-wider ${mutedCls} ${headerBg} border-r ${cardBorder} sticky left-0 z-10`} />
              {PIPELINE_COLUMNS.map((col) => (
                <th
                  key={col.id}
                  className={`py-2 px-2 text-center text-[10px] font-semibold uppercase tracking-wider ${mutedCls} border-r last:border-r-0 ${cardBorder} min-w-[120px]`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, rowIdx) => (
              <tr key={row.id} className={rowIdx > 0 ? `border-t ${cardBorder}` : ""}>
                <td
                  className={`py-2 px-2 text-xs font-medium ${textCls} ${headerBg} border-r ${cardBorder} sticky left-0 z-10`}
                >
                  {row.label}
                </td>
                {PIPELINE_COLUMNS.map((col) => {
                  const items = byRowAndCol[row.id]?.[col.id] ?? [];
                  return (
                    <td
                      key={col.id}
                      className={`align-top py-2 px-2 border-r last:border-r-0 ${cardBorder} min-h-[80px]`}
                    >
                      <div className="space-y-2">
                        {items.map((item, i) => (
                          <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 8 }}
                            transition={{ delay: i * 0.03 }}
                            className={`rounded-xl border ${cardBorder} ${cardBg} p-2.5 hover:shadow-md hover:border-blue-500/20 transition-all duration-200 ${onItemClick ? "cursor-pointer" : ""}`}
                            onClick={() => onItemClick?.(item._raw)}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className={`text-xs font-medium truncate flex-1 min-w-0 ${textCls}`}>{item.title}</p>
                              {onStatusChange && (
                                <select
                                  value={item.status}
                                  disabled={!!changingId}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(e) => {
                                    const newStatus = e.target.value;
                                    setChangingId(item.id);
                                    onStatusChange(item.id, newStatus);
                                    toast.success(`📝 Moved to ${newStatus}`);
                                    setChangingId(null);
                                  }}
                                  className={`text-[10px] rounded border px-1.5 py-0.5 min-w-0 shrink-0 ${isDark ? "bg-[#1a1818] border-[#2a2520] text-[#e8e4dc]" : "bg-gray-100 border-gray-300 text-gray-800"}`}
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </motion.div>
                        ))}
                        {onAddInColumn && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddInColumn(col.id);
                            }}
                            className={`w-full text-left text-[10px] py-1.5 rounded-lg border border-dashed ${isDark ? "border-gray-600 text-gray-500 hover:border-blue-500/50 hover:text-blue-400" : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600"}`}
                          >
                            + Add
                          </button>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
