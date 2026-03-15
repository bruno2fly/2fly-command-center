"use client";

import { useTheme } from "@/contexts/ThemeContext";
import type { ApiContentItem } from "@/lib/api";
import { ApprovedContentCard } from "./ApprovedContentCard";

type Props = {
  items: ApiContentItem[];
  clientId: string;
  onSchedule: (item: ApiContentItem, date: string) => void;
  onSendToTeam: (item: ApiContentItem) => Promise<void>;
  onRefresh?: () => void;
};

export function ApprovedContentSection({ items, clientId, onSchedule, onSendToTeam }: Props) {
  const { isDark } = useTheme();
  const mutedCls = isDark ? "text-gray-500" : "text-gray-500";

  if (items.length === 0) {
    return (
      <div className={`rounded-xl border ${isDark ? "border-white/5 bg-white/[0.02]" : "border-gray-200 bg-gray-50"} p-8 text-center`}>
        <p className={mutedCls}>✅ No approved content yet — Approve ideas above to move them here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ApprovedContentCard
          key={item.id}
          item={item}
          onSchedule={onSchedule}
          onSendToTeam={onSendToTeam}
        />
      ))}
    </div>
  );
}
