"use client";

import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";

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

type Props = {
  content: ContentItemForPipeline[];
};

export function ContentPipelineKanban({ content }: Props) {
  const { isDark } = useTheme();

  const byRowAndCol = useMemo(() => {
    const map: Record<string, Record<string, ContentItemForPipeline[]>> = {};
    for (const row of ROWS) {
      map[row.id] = {};
      for (const col of PIPELINE_COLUMNS) {
        map[row.id][col.id] = [];
      }
    }
    for (const item of content) {
      const row = typeToRow(item.type ?? "post");
      const col = statusToColumn(item.status, !!(item.scheduledDate && item.status === "draft"));
      if (map[row] && map[row][col]) map[row][col].push(item);
    }
    return map;
  }, [content]);

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
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className={`rounded-xl border ${cardBorder} ${cardBg} p-2.5 cursor-grab hover:shadow-md hover:border-blue-500/20 transition-all duration-200`}
                          >
                            <p className={`text-xs font-medium truncate ${textCls}`}>{item.title}</p>
                          </motion.div>
                        ))}
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
