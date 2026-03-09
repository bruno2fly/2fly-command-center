"use client";

import { useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useClients } from "@/contexts/ClientsContext";
import { ContentCalendar } from "@/components/ContentCalendar";
import { getContentCalendar } from "@/lib/client/mockClientTabData";
import type { ContentCalendarItem } from "@/lib/client/mockClientTabData";

export default function ContentCalendarPage() {
  const { isDark } = useTheme();
  const { clients } = useClients();

  const allItems = useMemo(() => {
    const items: ContentCalendarItem[] = [];
    for (const c of clients) {
      const cal = getContentCalendar(c.id);
      for (const item of cal) {
        items.push({ ...item, clientId: c.id });
      }
    }
    return items;
  }, [clients]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDark ? "text-[#e8e0d4]" : "text-gray-900"}`}>
          📅 Content Calendar
        </h1>
        <p className={`text-sm mt-1 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          All clients · Week view
        </p>
      </div>

      <ContentCalendar items={allItems} />
    </div>
  );
}
