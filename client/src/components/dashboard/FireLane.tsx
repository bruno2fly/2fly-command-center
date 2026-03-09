"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { useActions } from "@/contexts/ActionsContext";
import { sortPriorities, type PriorityItem } from "@/lib/founder/mockFounderData";
import { toast } from "sonner";
import { SeverityBadge, type SeverityLevel } from "@/components/ui/SeverityBadge";
import { CommandSection } from "@/components/ui/CommandSection";

const TAG_LABELS: Record<string, string> = {
  CASH_NOW: "CASH NOW",
  PREVENT_FIRE: "BLOCKED",
  STRATEGIC: "STRATEGIC",
};

function riskToSeverity(riskLevel: string): SeverityLevel {
  if (riskLevel === "red") return "critical";
  if (riskLevel === "yellow") return "important";
  return "routine";
}

function formatAge(dueAt: string) {
  const d = new Date(dueAt);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff > 0) return `${diff}d overdue`;
  const until = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (until === 0) return "Today";
  if (until === 1) return "Tomorrow";
  return `${until}d`;
}

type Props = {
  items: PriorityItem[];
};

export function FireLane({ items }: Props) {
  const { isDark } = useTheme();
  const { markCompleteById } = useActions();
  const top = sortPriorities([...items]).slice(0, 5);

  const getCardStyles = (severity: SeverityLevel) => {
    const base = "flex flex-col gap-2 p-4 rounded-lg border min-w-[200px]";
    if (severity === "critical") {
      return `${base} max-w-[280px] ${
        isDark
          ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40"
          : "bg-red-50/80 border-red-200 hover:border-red-300"
      }`;
    }
    if (severity === "important") {
      return `${base} max-w-[260px] ${
        isDark
          ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40"
          : "bg-amber-50/60 border-amber-200 hover:border-amber-300"
      }`;
    }
    return `${base} max-w-[260px] ${
      isDark
        ? "bg-[#0a0a0e] border-[#1a1810] hover:border-[#2a2018]"
        : "bg-white border-gray-200 hover:border-gray-300"
    }`;
  };

  const tagCls = (tag: string) =>
    tag === "CASH_NOW"
      ? isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-100 text-amber-800"
      : tag === "PREVENT_FIRE"
        ? isDark ? "bg-red-500/20 text-red-400" : "bg-red-100 text-red-700"
        : isDark ? "bg-blue-500/20 text-blue-400" : "bg-blue-100 text-blue-700";

  return (
    <CommandSection
      title="Fire Lane"
      accent="fire"
      action={
        <Link
          href="/clients"
          className={`text-xs font-medium ${isDark ? "text-[#8a7e6d] hover:text-emerald-400" : "text-gray-500 hover:text-blue-600"}`}
        >
          see all →
        </Link>
      }
    >
      <div className="p-4">
        <p className={`text-xs mb-3 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          Top 3–5 items needing action now
        </p>
        <div className="flex flex-wrap gap-3">
          {top.length === 0 ? (
            <p className={`text-sm py-4 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
              All clear
            </p>
          ) : (
            top.map((item) => {
              const severity = riskToSeverity(item.riskLevel);
              const tag = item.tags[0] ?? "STRATEGIC";
              return (
                <div
                  key={item.id}
                  className={getCardStyles(severity)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <SeverityBadge level={severity} size={severity === "critical" ? "md" : "sm"} />
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${tagCls(tag)}`}>
                      {TAG_LABELS[tag]}
                    </span>
                  </div>
                  <p
                    className={`font-medium text-sm ${
                      severity === "critical"
                        ? isDark ? "text-[#e8e0d4]" : "text-gray-900"
                        : isDark ? "text-[#c4b8a8]" : "text-gray-800"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p className={`text-xs ${isDark ? "text-[#8a7e6d]" : "text-gray-500"}`}>
                    {item.clientName} · {formatAge(item.dueAt)}
                  </p>
                  {item.cashImpact > 0 && (
                    <p className={`text-xs font-medium ${isDark ? "text-amber-400" : "text-amber-600"}`}>
                      ${item.cashImpact.toLocaleString()}
                    </p>
                  )}
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => {
                        markCompleteById(item.id);
                        toast.success("✓ Done");
                      }}
                      className={`px-3 py-1.5 rounded text-xs font-medium ${
                        isDark
                          ? "bg-emerald-600/80 text-white hover:bg-emerald-500/80"
                          : "bg-blue-600 text-white hover:bg-blue-500"
                      }`}
                    >
                      Do it
                    </button>
                    <Link
                      href={`/clients/${item.clientId}`}
                      className={`px-3 py-1.5 rounded text-xs font-medium ${
                        isDark
                          ? "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810]"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      View
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </CommandSection>
  );
}
