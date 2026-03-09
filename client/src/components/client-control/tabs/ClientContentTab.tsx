"use client";

import {
  getContentCalendar,
  getContentPipeline,
  getContentIdeas,
} from "@/lib/client/mockClientTabData";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

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
  const calendar = getContentCalendar(clientId);
  const pipeline = getContentPipeline(clientId);
  const ideas = getContentIdeas(clientId);

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl space-y-8">
        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Content calendar</h2>
          <ul className="space-y-2">
            {calendar.length === 0 ? (
              <li className="text-sm text-gray-500 py-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                No scheduled content
              </li>
            ) : (
              calendar.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-900">{c.title}</span>
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 capitalize">{c.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{formatDate(c.date)}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                        c.status === "scheduled" ? "bg-blue-100 text-blue-700" : c.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Production pipeline</h2>
          <div className="grid grid-cols-4 gap-4">
            {["ideation", "creation", "review", "scheduled"].map((stage) => {
              const items = pipeline.filter((p) => p.stage === stage);
              return (
                <div
                  key={stage}
                  className="rounded-lg border border-gray-100 bg-white p-4 min-h-[120px]"
                >
                  <h3 className="text-xs font-medium text-gray-500 mb-3 capitalize">{stage}</h3>
                  <ul className="space-y-2">
                    {items.map((p) => (
                      <li key={p.id} className="text-sm font-medium text-gray-900 truncate">
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
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Content ideas</h2>
          <ul className="space-y-2">
            {ideas.length === 0 ? (
              <li className="text-sm text-gray-500 py-4 rounded-lg border border-dashed border-gray-200 bg-gray-50/50">
                No ideas yet
              </li>
            ) : (
              ideas.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100"
                >
                  <p className="text-sm text-gray-900 flex-1">{i.text}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">{i.source}</span>
                    <span className="text-xs text-gray-400">{formatTime(i.createdAt)}</span>
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
