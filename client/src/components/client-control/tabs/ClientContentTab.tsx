"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { ApiContentItem } from "@/lib/api";
import { getContentCalendar } from "@/lib/client/mockClientTabData";
import { ContentKPIStrip, type ContentKPIs } from "@/components/client-control/content/ContentKPIStrip";
import { AIContentIdeasSection } from "@/components/client-control/content/AIContentIdeasSection";
import { ReelIdeasRow, type ReelIdeaCard } from "@/components/client-control/content/ReelIdeasRow";
import { ReferenceLinksRow } from "@/components/client-control/content/ReferenceLinksRow";
import { MonthlyPlannerCompact } from "@/components/client-control/content/MonthlyPlannerCompact";
import type { ContentIdea, ReferenceLink } from "@/components/client-control/content/contentIdeaTypes";
import { generateIdeaId, generateRefId } from "@/components/client-control/content/contentIdeaTypes";
import {
  getIndustryForClient,
  getPreSeededIdeas,
} from "@/components/client-control/content/contentIdeasSeed";

const IDEAS_KEY_PREFIX = "2fly-content-ideas-";
const REFERENCES_KEY_PREFIX = "2fly-references-";
const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function computePostingStreak(content: ApiContentItem[]): number {
  const published = content.filter((c) => c.status === "published" && (c as { publishedDate?: string }).publishedDate);
  if (published.length === 0) return 0;
  const dates = new Set(
    published.map((c) => ((c as { publishedDate?: string }).publishedDate ?? "").slice(0, 10))
  );
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  const d = new Date();
  for (let i = 0; i < 31; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) count++;
    else if (key <= today) break;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

function getStartOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

type Props = {
  clientId: string;
};

export function ClientContentTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [content, setContent] = useState<ApiContentItem[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [references, setReferences] = useState<ReferenceLink[]>([]);
  const [clientName, setClientName] = useState<string | null>(null);
  const [schedulingIdea, setSchedulingIdea] = useState<ContentIdea | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>("");

  // Load ideas from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(IDEAS_KEY_PREFIX + clientId);
      if (raw) {
        const parsed = JSON.parse(raw) as ContentIdea[];
        if (Array.isArray(parsed)) {
          setIdeas(parsed.length > 0 ? parsed : []);
          return;
        }
      }
      setIdeas([]);
    } catch {
      setIdeas([]);
    }
  }, [clientId]);

  // Load references from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(REFERENCES_KEY_PREFIX + clientId);
      if (raw) setReferences(JSON.parse(raw) as ReferenceLink[]);
    } catch {
      // ignore
    }
  }, [clientId]);

  // Client name for industry detection + pre-seed ideas when localStorage is empty
  useEffect(() => {
    api.getClient(clientId).then((c) => {
      const name = (c as { name?: string })?.name ?? null;
      setClientName(name ?? null);
      const raw = localStorage.getItem(IDEAS_KEY_PREFIX + clientId);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ContentIdea[];
          if (Array.isArray(parsed) && parsed.length > 0) return;
        } catch {
          // fall through to seed
        }
      }
      const industry = getIndustryForClient(clientId, name ?? undefined);
      const seeded = getPreSeededIdeas(clientId, industry);
      if (seeded.length > 0) setIdeas(seeded);
    }).catch(() => {});
  }, [clientId]);

  // Persist ideas
  useEffect(() => {
    if (ideas.length === 0) return;
    try {
      localStorage.setItem(IDEAS_KEY_PREFIX + clientId, JSON.stringify(ideas));
    } catch {
      // ignore
    }
  }, [clientId, ideas]);

  // Persist references
  useEffect(() => {
    try {
      localStorage.setItem(REFERENCES_KEY_PREFIX + clientId, JSON.stringify(references));
    } catch {
      // ignore
    }
  }, [clientId, references]);

  // Fetch content from API (main API has agent-created items with source/directiveId)
  useEffect(() => {
    fetch(`${API}/api/content?clientId=${clientId}`)
      .then((r) => r.json())
      .then((d: ApiContentItem[] | { content?: ApiContentItem[]; items?: ApiContentItem[] }) => {
        const list = Array.isArray(d) ? d : (d as { content?: ApiContentItem[]; items?: ApiContentItem[] }).content ?? (d as { content?: ApiContentItem[]; items?: ApiContentItem[] }).items ?? [];
        setContent(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        fetch(`${API}/api/agent-tools/content?clientId=${clientId}`)
          .then((r) => r.json())
          .then((d: { content?: ApiContentItem[]; items?: ApiContentItem[] }) => {
            const list = d.content ?? d.items ?? [];
            setContent(Array.isArray(list) ? list : []);
          })
          .catch(() => {
            const mock = getContentCalendar(clientId);
            setContent(
              mock.map((c) => ({
                id: c.id,
                clientId: c.clientId,
                title: c.title,
                platform: "instagram",
                status: c.status,
                scheduledDate: c.date,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: c.type,
                contentType: c.type,
              }))
            );
          });
      });
  }, [clientId]);

  const startOfMonth = getStartOfMonth(new Date());

  const kpis = useMemo((): ContentKPIs => {
    let approved = 0;
    let scheduled = 0;
    let publishedMTD = 0;
    for (const i of ideas) {
      if (i.status === "approved") approved++;
      if (i.status === "scheduled") scheduled++;
    }
    for (const c of content) {
      const s = (c.status || "").toLowerCase();
      if (s === "published" && (c as { publishedDate?: string }).publishedDate) {
        if (new Date((c as { publishedDate: string }).publishedDate) >= startOfMonth) publishedMTD++;
      }
    }
    const streak = computePostingStreak(content);
    return {
      ideasGenerated: ideas.length,
      approved,
      scheduled,
      publishedMTD,
      streak,
    };
  }, [ideas, content, startOfMonth]);

  const reelCards = useMemo((): ReelIdeaCard[] => {
    return ideas
      .filter((i) => i.type === "reel")
      .map((i) => ({
        id: i.id,
        title: i.title,
        description: i.hook || i.whyItWorks || "",
        tag: "High Engagement" as const,
        refLink: i.references?.[0],
      }));
  }, [ideas]);

  const scheduledForPlanner = useMemo(
    () =>
      content
        .filter((c) => c.scheduledDate)
        .map((c) => ({
          id: c.id,
          title: c.title,
          type: (c as { type?: string }).type ?? (c as { contentType?: string }).contentType,
          scheduledDate: c.scheduledDate!,
        })),
    [content]
  );

  // Also add ideas that have scheduledDate
  const scheduledIdeasForPlanner = useMemo(
    () =>
      ideas
        .filter((i) => i.status === "scheduled" && i.scheduledDate)
        .map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          scheduledDate: i.scheduledDate!,
        })),
    [ideas]
  );

  const allScheduledItems = useMemo(
    () => [...scheduledForPlanner, ...scheduledIdeasForPlanner],
    [scheduledForPlanner, scheduledIdeasForPlanner]
  );

  const agentCreatedContent = useMemo(
    () => content.filter((c) => (c as ApiContentItem & { source?: string }).source === "agent"),
    [content]
  );

  const handleSchedule = useCallback(
    (idea: ContentIdea) => {
      setSchedulingIdea(idea);
      setScheduleDate(new Date().toISOString().slice(0, 16));
    },
    []
  );

  const confirmSchedule = useCallback(() => {
    if (!schedulingIdea) return;
    const dateStr = scheduleDate.slice(0, 10);
    setIdeas((prev) =>
      prev.map((i) =>
        i.id === schedulingIdea.id
          ? { ...i, status: "scheduled" as const, scheduledDate: dateStr }
          : i
      )
    );
    setSchedulingIdea(null);
    setScheduleDate("");
  }, [schedulingIdea, scheduleDate]);

  const addReelIdea = useCallback(() => {
    const newIdea: ContentIdea = {
      id: generateIdeaId(),
      clientId,
      type: "reel",
      title: "New Reel Idea",
      caption: "",
      hook: "",
      format: "9:16 vertical",
      bestTime: "",
      hashtags: [],
      whyItWorks: "",
      references: [],
      status: "idea",
      source: "ai",
      createdAt: new Date().toISOString(),
    };
    setIdeas((prev) => [...prev, newIdea]);
  }, [clientId]);

  const addReference = useCallback(() => {
    const newRef: ReferenceLink = {
      id: generateRefId(),
      title: "New reference",
      url: "https://",
      source: "other",
    };
    setReferences((prev) => [...prev, newRef]);
  }, []);

  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";

  return (
    <div className={`flex-1 overflow-auto ${bgBase}`}>
      <ContentKPIStrip kpis={kpis} />

      <div className="p-4 space-y-6">
        {/* Main: AI Content Ideas — ~60% visual weight */}
        <div className="min-h-[400px]">
          <AIContentIdeasSection
            ideas={ideas}
            onIdeasChange={setIdeas}
            onSchedule={handleSchedule}
          />
        </div>

        {/* Reel Ideas row */}
        <ReelIdeasRow
          items={reelCards}
          onAddNew={addReelIdea}
        />

        {/* Reference Links */}
        <ReferenceLinksRow
          items={references}
          onItemsChange={setReferences}
          onAdd={addReference}
        />

        {/* From Agent Directives */}
        {agentCreatedContent.length > 0 && (
          <div className={`rounded-2xl border overflow-hidden ${isDark ? "border-[#1a1810] bg-[#0a0a0e]" : "border-gray-200 bg-white"}`}>
            <div className={`px-4 py-3 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
              <h2 className={`text-xs font-semibold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                🤖 From Agent Directives
              </h2>
            </div>
            <ul className={`divide-y ${isDark ? "divide-[#1a1810]" : "divide-gray-100"}`}>
              {agentCreatedContent.map((item) => (
                <li key={item.id} className={`px-4 py-2.5 flex items-center justify-between gap-2 ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                  <span className="text-sm truncate">{item.title}</span>
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-400">
                    🤖 Agent Created
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Monthly Planner — compact */}
        <MonthlyPlannerCompact items={allScheduledItems} />
      </div>

      {/* Schedule date picker modal */}
      {schedulingIdea && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSchedulingIdea(null)}
        >
          <div
            className={`rounded-2xl border p-6 shadow-xl min-w-[280px] ${isDark ? "bg-[#0f0f14] border-slate-700" : "bg-white border-gray-200"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold mb-2">Schedule &quot;{schedulingIdea.title}&quot;</h3>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-sm ${isDark ? "bg-slate-800 border-slate-600 text-white" : "bg-white border-gray-300 text-gray-900"}`}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setSchedulingIdea(null)}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSchedule}
                className="px-3 py-1.5 rounded-lg text-sm bg-blue-500 text-white"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
