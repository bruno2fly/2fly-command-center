"use client";

import { useTheme } from "@/contexts/ThemeContext";

export type ActivityEntry = {
  id: string;
  text: string;
  time: string;
};

type Props = {
  entries: ActivityEntry[];
};

export function ActivityLog({ entries }: Props) {
  const { isDark } = useTheme();

  const panelCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-700";
  const metaCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const dotCls = "bg-emerald-500";
  const rowCls = isDark ? "hover:bg-[#0c0c10]" : "hover:bg-gray-50/50";

  return (
    <section className={`rounded-xl border overflow-hidden ${panelCls}`}>
      <div
        className={`px-3 py-2.5 border-b ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        <h2
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? "text-[#8a7e6d]" : "text-gray-600"
          }`}
        >
          Activity Log
        </h2>
      </div>
      <div className={`divide-y max-h-[200px] overflow-y-auto ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
        {entries.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className={`text-xs ${metaCls}`}>No recent activity</p>
          </div>
        ) : (
          entries.map((e) => (
            <div
              key={e.id}
              className={`flex items-start gap-2 px-3 py-2 transition-colors ${rowCls}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${dotCls}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-xs truncate ${textCls}`}>{e.text}</p>
                <p className={`text-[10px] mt-0.5 ${metaCls}`}>{e.time}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
