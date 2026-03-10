"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ApiClient, ApiRequestItem, ApiContentItem } from "@/lib/api";
import { getAdsKPIData } from "@/lib/client/mockAdsData";
import { getGoals, getRoadmap } from "@/lib/client/mockClientTabData";

const STORAGE_KEY_PREFIX = "2fly-plan-";

export type GoalStatus = "active" | "achieved" | "at_risk" | "paused";

export type PlanGoal = {
  id: string;
  clientId: string;
  text: string;
  status: GoalStatus;
  targetDate: string | null;
};

export type RoadmapStatus = "planned" | "in_progress" | "done";

export type PlanRoadmapItem = {
  id: string;
  clientId: string;
  title: string;
  quarter: string;
  status: RoadmapStatus;
};

export type ClientPlanData = {
  goals: PlanGoal[];
  roadmap: PlanRoadmapItem[];
};

function generateId(): string {
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getDefaultGoals(clientId: string, client: ApiClient | null): PlanGoal[] {
  const retainer = client?.monthlyRetainer ?? 0;
  const adBudget = client?.adBudget ?? 0;
  const roasTarget = client?.roasTarget ?? 0;
  const industry = (client as { industry?: string })?.industry ?? "client";

  return [
    {
      id: generateId(),
      clientId,
      text: adBudget > 0 ? `Hit ${roasTarget}x ROAS target on paid media` : "Define paid media strategy and ROAS target",
      status: "active",
      targetDate: new Date(new Date().getFullYear(), 11, 31).toISOString().slice(0, 10),
    },
    {
      id: generateId(),
      clientId,
      text: retainer > 0 ? "Maintain content buffer and on-time delivery" : "Establish retainer and delivery cadence",
      status: "active",
      targetDate: new Date(new Date().getFullYear(), 2, 31).toISOString().slice(0, 10),
    },
    {
      id: generateId(),
      clientId,
      text: `Grow ${industry} pipeline with qualified leads`,
      status: "active",
      targetDate: new Date(new Date().getFullYear() + 1, 5, 30).toISOString().slice(0, 10),
    },
  ];
}

const QUARTERS = ["Q1 2026", "Q2 2026", "Q3 2026", "Q4 2026"];

function getDefaultRoadmap(clientId: string): PlanRoadmapItem[] {
  return [
    { id: generateId(), clientId, title: "Spring campaign launch", quarter: "Q1 2026", status: "in_progress" },
    { id: generateId(), clientId, title: "UGC + lookalike tests", quarter: "Q2 2026", status: "planned" },
    { id: generateId(), clientId, title: "Scale Meta budget", quarter: "Q2 2026", status: "planned" },
    { id: generateId(), clientId, title: "Q3 initiatives", quarter: "Q3 2026", status: "planned" },
    { id: generateId(), clientId, title: "Year-end review", quarter: "Q4 2026", status: "planned" },
  ];
}

function loadPlanFromStorage(clientId: string): ClientPlanData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${clientId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ClientPlanData;
    if (parsed.goals && Array.isArray(parsed.goals) && parsed.roadmap && Array.isArray(parsed.roadmap)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function savePlanToStorage(clientId: string, data: ClientPlanData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${clientId}`, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export type ClientPlanApiData = {
  client: ApiClient | null;
  contentDeliveryPct: number | null;
  activeRequestsCount: number;
  retainer: number | null;
  roasFromAds: number | null;
  roasTarget: number | null;
  adSpend: number | null;
  healthOverall: "green" | "yellow" | "red" | null;
};

export function useClientPlan(clientId: string) {
  const [goals, setGoalsState] = useState<PlanGoal[]>([]);
  const [roadmap, setRoadmapState] = useState<PlanRoadmapItem[]>([]);
  const [apiData, setApiData] = useState<ClientPlanApiData>({
    client: null,
    contentDeliveryPct: null,
    activeRequestsCount: 0,
    retainer: null,
    roasFromAds: null,
    roasTarget: null,
    adSpend: null,
    healthOverall: null,
  });
  const [hydrated, setHydrated] = useState(false);

  const persistPlan = useCallback(
    (nextGoals: PlanGoal[], nextRoadmap: PlanRoadmapItem[]) => {
      savePlanToStorage(clientId, { goals: nextGoals, roadmap: nextRoadmap });
    },
    [clientId]
  );

  const setGoals = useCallback(
    (next: PlanGoal[] | ((prev: PlanGoal[]) => PlanGoal[])) => {
      setGoalsState((prev) => {
        const nextGoals = typeof next === "function" ? next(prev) : next;
        persistPlan(nextGoals, roadmap);
        return nextGoals;
      });
    },
    [roadmap, persistPlan]
  );

  const setRoadmap = useCallback(
    (next: PlanRoadmapItem[] | ((prev: PlanRoadmapItem[]) => PlanRoadmapItem[])) => {
      setRoadmapState((prev) => {
        const nextRoadmap = typeof next === "function" ? next(prev) : next;
        persistPlan(goals, nextRoadmap);
        return nextRoadmap;
      });
    },
    [goals, persistPlan]
  );

  useEffect(() => {
    const stored = loadPlanFromStorage(clientId);
    if (stored) {
      setGoalsState(stored.goals);
      setRoadmapState(stored.roadmap);
    }
    setHydrated(true);
  }, [clientId]);

  useEffect(() => {
    if (!hydrated) return;

    const stored = loadPlanFromStorage(clientId);
    let initialGoals = stored?.goals ?? null;
    let initialRoadmap = stored?.roadmap ?? null;

    Promise.all([
      api.getClient(clientId).catch(() => null),
      api.getContentItems(clientId).catch(() => [] as ApiContentItem[]),
      api.getRequestsRaw(clientId).then((r) => r.requests ?? []).catch(() => [] as ApiRequestItem[]),
      api.getHealth().catch(() => null),
    ]).then(([client, contentItems, requests, healthRes]) => {
      const clientData = client as ApiClient | null;
      if (!initialGoals) {
        initialGoals = clientData
          ? getDefaultGoals(clientId, clientData)
          : getGoals(clientId).map((g) => ({
              id: g.id,
              clientId: g.clientId,
              text: g.text,
              status: (g.status === "achieved" ? "achieved" : g.status === "paused" ? "paused" : "active") as GoalStatus,
              targetDate: g.targetDate,
            }));
      }
      if (!initialRoadmap) {
        initialRoadmap = getRoadmap(clientId).map((r) => ({
          id: r.id,
          clientId: r.clientId,
          title: r.title,
          quarter: r.quarter,
          status: r.status as RoadmapStatus,
        }));
        if (initialRoadmap.length === 0) initialRoadmap = getDefaultRoadmap(clientId);
      }

      if (!stored) {
        setGoalsState(initialGoals);
        setRoadmapState(initialRoadmap);
        savePlanToStorage(clientId, { goals: initialGoals, roadmap: initialRoadmap });
      }

      const totalContent = contentItems.length;
      const completedContent = contentItems.filter(
        (c) =>
          c.status === "published" ||
          c.status === "completed" ||
          c.status === "delivered" ||
          c.status === "scheduled"
      ).length;
      const contentDeliveryPct = totalContent > 0 ? Math.round((completedContent / totalContent) * 100) : null;

      const activeRequestsCount = (requests as ApiRequestItem[]).filter(
        (r) => r.status !== "completed" && r.status !== "closed"
      ).length;

      const adsKpi = getAdsKPIData(clientId);
      const healthClients = (healthRes as { clients?: Array<{ clientId?: string; overall?: string }> })?.clients ?? [];
      const healthClient = healthClients.find((c: { clientId?: string }) => c.clientId === clientId);
      const healthOverall = (healthClient?.overall as "green" | "yellow" | "red") ?? null;

      setApiData({
        client: clientData ?? null,
        contentDeliveryPct,
        activeRequestsCount,
        retainer: clientData?.monthlyRetainer ?? null,
        roasFromAds: adsKpi?.roas ?? null,
        roasTarget: clientData?.roasTarget ?? null,
        adSpend: adsKpi?.spend ?? null,
        healthOverall,
      });
    });
  }, [clientId, hydrated]);

  return {
    goals,
    roadmap,
    setGoals,
    setRoadmap,
    persistPlan,
    apiData,
    hydrated,
  };
}
