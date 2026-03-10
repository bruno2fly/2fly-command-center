"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { api } from "@/lib/api";
import type { ApiContentItem } from "@/lib/api";
import { getContentCalendar } from "@/lib/client/mockClientTabData";
import { ContentKPIStrip, type ContentKPIs } from "@/components/client-control/content/ContentKPIStrip";
import { ContentCalendarCommand } from "@/components/client-control/content/ContentCalendarCommand";
import { ContentPipelineKanban } from "@/components/client-control/content/ContentPipelineKanban";
import { ContentIdeasBank, type ContentIdeaItem } from "@/components/client-control/content/ContentIdeasBank";
import { IndustryTipsCard } from "@/components/client-control/content/IndustryTipsCard";
import { InspirationBoard, type InspirationItem } from "@/components/client-control/content/InspirationBoard";

const IDEAS_KEY_PREFIX = "2fly-content-ideas-";
const INSPIRATION_KEY_PREFIX = "2fly-inspiration-";
const CONTENT_TARGET_MONTHLY = 16;

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekRange(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: weekStart, end };
}

function getStartOfMonth(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function computePostingStreak(content: ApiContentItem[]): number {
  const published = content.filter((c) => c.status === "published" && c.publishedDate);
  if (published.length === 0) return 0;
  const dates = new Set(
    published.map((c) => c.publishedDate!.slice(0, 10))
  );
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  let d = new Date();
  for (let i = 0; i < 31; i++) {
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) count++;
    else if (key <= today) break;
    d.setDate(d.getDate() - 1);
  }
  return count;
}

type Props = {
  clientId: string;
};

export function ClientContentTab({ clientId }: Props) {
  const { isDark } = useTheme();
  const [content, setContent] = useState<ApiContentItem[]>([]);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [ideas, setIdeas] = useState<ContentIdeaItem[]>([]);
  const [inspiration, setInspiration] = useState<InspirationItem[]>([]);
  const [industry, setIndustry] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
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
  }, [clientId, API]);

  useEffect(() => {
    api.getClient(clientId).then((c) => setIndustry((c as { industry?: string })?.industry ?? null)).catch(() => {});
  }, [clientId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(IDEAS_KEY_PREFIX + clientId);
      if (raw) setIdeas(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [clientId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(INSPIRATION_KEY_PREFIX + clientId);
      if (raw) setInspiration(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, [clientId]);

  useEffect(() => {
    try {
      localStorage.setItem(IDEAS_KEY_PREFIX + clientId, JSON.stringify(ideas));
    } catch {
      // ignore
    }
  }, [clientId, ideas]);

  useEffect(() => {
    try {
      localStorage.setItem(INSPIRATION_KEY_PREFIX + clientId, JSON.stringify(inspiration));
    } catch {
      // ignore
    }
  }, [clientId, inspiration]);

  const { start: weekStartDate, end: weekEndDate } = getWeekRange(weekStart);
  const startOfMonth = getStartOfMonth(new Date());

  const kpis = useMemo((): ContentKPIs => {
    const now = new Date();
    const weekStartStr = weekStartDate.getTime();
    const weekEndStr = weekEndDate.getTime();

    let scheduledThisWeek = 0;
    let inProduction = 0;
    let publishedMTD = 0;

    for (const c of content) {
      const s = (c.status || "").toLowerCase();
      const scheduled = c.scheduledDate ? new Date(c.scheduledDate).getTime() : 0;
      if (s === "scheduled" && scheduled >= weekStartStr && scheduled <= weekEndStr) scheduledThisWeek++;
      if (s === "draft" || s === "in_review" || s === "review") inProduction++;
      if (s === "published" && c.publishedDate && new Date(c.publishedDate) >= startOfMonth) publishedMTD++;
    }

    const publishedOrScheduled = content.filter(
      (c) => c.status === "published" || c.status === "scheduled"
    ).length;
    const contentScore = Math.min(100, Math.round((publishedOrScheduled / CONTENT_TARGET_MONTHLY) * 100));
    const postingStreak = computePostingStreak(content);

    return {
      scheduledThisWeek,
      inProduction,
      publishedMTD,
      contentScore,
      postingStreak,
    };
  }, [content, weekStartDate, weekEndDate]);

  const contentForCalendar = useMemo(
    () =>
      content.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type ?? c.contentType ?? "post",
        status: c.status,
        scheduledDate: c.scheduledDate,
      })),
    [content]
  );

  const contentForPipeline = contentForCalendar;

  const handleWeekChange = useCallback((delta: number) => {
    setWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + delta * 7);
      return next;
    });
  }, []);

  const bgBase = isDark ? "bg-[#06060a]" : "bg-gray-50";

  return (
    <div className={`flex-1 overflow-auto ${bgBase}`}>
      <ContentKPIStrip kpis={kpis} />

      <div className="p-4 space-y-6">
        <ContentCalendarCommand
          content={contentForCalendar}
          weekStart={weekStart}
          onWeekChange={handleWeekChange}
          onItemClick={(item) => console.log("Content clicked", item.id)}
        />

        <ContentPipelineKanban content={contentForPipeline} />

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          <div className="lg:col-span-4">
            <ContentIdeasBank
              clientId={clientId}
              ideas={ideas}
              onIdeasChange={setIdeas}
            />
          </div>
          <div className="lg:col-span-3">
            <IndustryTipsCard industry={industry} />
          </div>
          <div className="lg:col-span-3">
            <InspirationBoard items={inspiration} onItemsChange={setInspiration} />
          </div>
        </div>
      </div>
    </div>
  );
}
