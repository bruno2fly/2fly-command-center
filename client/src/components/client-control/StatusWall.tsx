"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getClientHealth } from "@/lib/client/mockClientControlData";
import { getKpis } from "@/lib/client/mockClientTabData";
import type { NoteItem, IdeaItem } from "@/lib/client/mockClientControlData";

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  return diffDays === 0 ? "today" : `${diffDays}d ago`;
}

type Props = {
  clientId: string;
  notes: NoteItem[];
  ideas: IdeaItem[];
};

export function StatusWall({ clientId, notes, ideas }: Props) {
  const { isDark } = useTheme();
  const [noteInput, setNoteInput] = useState("");
  const health = getClientHealth(clientId);
  const kpis = getKpis(clientId);

  const baseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  const lastNote = notes[0];
  const lastIdea = ideas[0];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Health */}
      <div className={`rounded-xl border p-4 ${baseCls}`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
          Health
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2">
            <span className={health?.websiteStatus === "up" ? "text-emerald-500" : "text-red-500"}>
              {health?.websiteStatus === "up" ? "✅" : "❌"}
            </span>
            Website {health?.websiteStatus === "up" ? "Up" : "Down"}
          </li>
          <li className="flex items-center gap-2">
            <span className={health?.adsStatus === "ok" ? "text-emerald-500" : "text-amber-500"}>
              {health?.adsStatus === "ok" ? "✅" : "⚠️"}
            </span>
            Ads {health?.adsRoasTrend ?? "—"}
          </li>
          <li className="flex items-center gap-2">
            <span className={health?.paymentStatus === "paid" ? "text-emerald-500" : health?.paymentStatus === "overdue" ? "text-red-500" : "text-amber-500"}>
              {health?.paymentStatus === "paid" ? "✅" : "🔴"}
            </span>
            Payment {health?.paymentStatus === "paid" ? "Paid" : health?.paymentStatus === "overdue" ? `${health.paymentDaysOverdue}d overdue` : "Pending"}
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✅</span>
            Delivery {health?.deliveryBufferDays ?? 0}d buffer
          </li>
          <li className="flex items-center gap-2">
            <span className="text-emerald-500">✅</span>
            Content OK
          </li>
        </ul>
      </div>

      {/* Performance */}
      <div className={`rounded-xl border p-4 ${baseCls}`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
          Performance
        </h3>
        <ul className="space-y-2 text-sm">
          {kpis.map((k) => (
            <li key={k.id} className="flex items-center justify-between">
              <span className={isDark ? "text-[#8a7e6d]" : "text-gray-500"}>{k.name}</span>
              <span className={`font-medium ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                {k.value}
                {k.target && ` / ${k.target}`}
                {k.trend === "up" && " ↑"}
                {k.trend === "down" && " ↓"}
              </span>
            </li>
          ))}
          {kpis.length === 0 && (
            <li className={isDark ? "text-[#5a5040]" : "text-gray-500"}>No KPIs</li>
          )}
        </ul>
      </div>

      {/* Memory */}
      <div className={`rounded-xl border p-4 ${baseCls}`}>
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
          Memory
        </h3>
        {lastNote && (
          <p className={`text-sm mb-2 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
            "{lastNote.text}" — {formatTime(lastNote.createdAt)}
          </p>
        )}
        {lastIdea && (
          <p className={`text-sm mb-2 ${isDark ? "text-[#8a7e6d]" : "text-gray-600"}`}>
            Latest idea: "{lastIdea.text}"
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="+ Add note"
            className={`flex-1 px-3 py-2 rounded-lg text-sm ${
              isDark ? "bg-[#0c0c10] border-[#1a1810] text-[#c4b8a8] placeholder-[#5a5040]" : "border border-gray-200"
            }`}
          />
          <button
            className={`px-3 py-2 text-sm font-medium rounded-lg ${
              isDark ? "bg-emerald-600/80 text-white hover:bg-emerald-500/80" : "bg-blue-600 text-white hover:bg-blue-500"
            }`}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
