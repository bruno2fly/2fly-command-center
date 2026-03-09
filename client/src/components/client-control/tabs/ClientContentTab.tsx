"use client";

import {
  getContentCalendar,
  getContentPipeline,
  getContentIdeas,
} from "@/lib/client/mockClientTabData";
import { ContentCalendar } from "@/components/ContentCalendar";
import { useTheme } from "@/contexts/ThemeContext";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

type Props = {
  clientId: string;
};

export function ClientContentTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const calendar = getContentCalendar(clientId);
  const pipeline = getContentPipeline(clientId);
  const ideas = getContentIdeas(clientId);

  const sectionCls = isDark ? "text-[#5a5040]" : "text-gray-700";
  const cardCls = isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-100 bg-white";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl space-y-8">
        <section>
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${sectionCls}`}>Content calendar</h2>
          <ContentCalendar clientId={clientId} items={calendar} />
        </section>

        <section>
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${sectionCls}`}>Production pipeline</h2>
          <div className="grid grid-cols-4 gap-4">
            {["ideation", "creation", "review", "scheduled"].map((stage) => {
              const items = pipeline.filter((p) => p.stage === stage);
              return (
                <div
                  key={stage}
                  className={`rounded-lg border p-4 min-h-[120px] ${cardCls}`}
                >
                  <h3 className={`text-xs font-medium mb-3 capitalize ${mutedCls}`}>{stage}</h3>
                  <ul className="space-y-2">
                    {items.map((p) => (
                      <li key={p.id} className={`text-sm font-medium truncate ${textCls}`}>
                        {p.title}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className={`text-sm font-semibold uppercase tracking-wider mb-4 ${sectionCls}`}>Content ideas</h2>
          <ul className="space-y-2">
            {ideas.length === 0 ? (
              <li className={`text-sm py-4 rounded-lg border border-dashed ${isDark ? "border-[#1a1810] bg-[#0a0a0e]/50 text-[#5a5040]" : "border-gray-200 bg-gray-50/50 text-gray-500"}`}>
                No ideas yet
              </li>
            ) : (
              ideas.map((i) => (
                <li
                  key={i.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${cardCls}`}
                >
                  <p className={`text-sm flex-1 ${textCls}`}>{i.text}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${mutedCls}`}>{i.source}</span>
                    <span className={`text-xs ${isDark ? "text-[#5a5040]" : "text-gray-400"}`}>{formatTime(i.createdAt)}</span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
