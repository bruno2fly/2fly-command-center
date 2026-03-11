"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { HealthRow, type HealthStatus } from "./HealthRow";

type ClientDetail = Awaited<ReturnType<typeof api.getClientMain>>;

function computeMetaAds(client: ClientDetail | null): { status: HealthStatus; summary: string } {
  if (!client) return { status: "good", summary: "—" };
  const reports = (client as ClientDetail & { adReports?: Array<{ roas?: number; spend?: number }> }).adReports ?? [];
  const target = (client as ClientDetail & { roasTarget?: number }).roasTarget ?? 3;
  const adBudget = (client as ClientDetail & { adBudget?: number }).adBudget ?? 0;
  const pendingActions = (client as ClientDetail & { pendingAgentActionsCount?: number }).pendingAgentActionsCount ?? 0;
  const actionSuffix = pendingActions > 0 ? ` · ⚠️ ${pendingActions} action${pendingActions === 1 ? "" : "s"} pending approval` : "";
  const latest = reports[0];
  if (!latest || latest.roas == null) {
    const base = "No campaigns active";
    return { status: adBudget > 0 ? "attention" : "good", summary: base + actionSuffix };
  }
  const pct = target > 0 ? (latest.roas / target) * 100 : 100;
  const spendStr = `$${((latest.spend as number) ?? adBudget).toLocaleString()}/mo spend`;
  if (pct >= 100) return { status: "good", summary: `ROAS ${latest.roas.toFixed(1)}x · ${spendStr}${actionSuffix}` };
  if (pct >= 80) return { status: "attention", summary: `ROAS ${latest.roas.toFixed(1)}x · ${spendStr}${actionSuffix}` };
  return { status: "critical", summary: `ROAS ${latest.roas.toFixed(1)}x below target · ${spendStr}${actionSuffix}` };
}

function computeContent(client: ClientDetail | null): { status: HealthStatus; summary: string } {
  if (!client) return { status: "good", summary: "—" };
  const items = (client as ClientDetail & { contentItems?: Array<{ status: string; scheduledDate?: string }> }).contentItems ?? [];
  const now = new Date();
  const scheduled = items.filter((c) => c.status === "scheduled" || c.status === "approved");
  const draftOrReview = items.filter((c) => c.status === "draft" || c.status === "review");
  const dueThisWeek = items.filter((c) => {
    const d = c.scheduledDate ? new Date(c.scheduledDate) : null;
    if (!d) return false;
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);
    return d >= now && d <= weekEnd;
  });
  const overdue = items.filter((c) => {
    const d = c.scheduledDate ? new Date(c.scheduledDate) : null;
    return d && d < now && (c.status === "scheduled" || c.status === "approved");
  });
  if (overdue.length > 0) return { status: "critical", summary: `${overdue.length} overdue · ${draftOrReview.length} in draft` };
  if (scheduled.length >= 5) return { status: "good", summary: `Buffer healthy — ${scheduled.length} posts scheduled` };
  if (dueThisWeek.length > 0 && draftOrReview.length > 0) return { status: "attention", summary: `${dueThisWeek.length} posts due this week, ${draftOrReview.length} still in draft` };
  if (scheduled.length >= 2) return { status: "attention", summary: `${scheduled.length} scheduled · add more for buffer` };
  return { status: "critical", summary: "Low buffer — schedule more content" };
}

function computeWebsite(client: ClientDetail | null): { status: HealthStatus; summary: string } {
  if (!client) return { status: "good", summary: "—" };
  const tasks = (client as ClientDetail & { tasks?: Array<{ type: string; status: string; priority: string }> }).tasks ?? [];
  const requests = (client as ClientDetail & { requests?: Array<{ title: string; description?: string; status: string; priority: string }> }).requests ?? [];
  const websiteTasks = tasks.filter((t) => /website|site|web/i.test(t.type));
  const websiteReqs = requests.filter((r) => /website|site|web|homepage/i.test(r.title + (r.description ?? "")));
  const open = [...websiteTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled"), ...websiteReqs.filter((r) => r.status !== "completed" && r.status !== "closed")];
  const urgent = open.some((o) => (o as { priority?: string }).priority === "urgent");
  if (urgent && open.length > 0) return { status: "critical", summary: "Urgent website task in progress" };
  if (open.length > 0) return { status: "attention", summary: open.length === 1 ? "1 website task in progress" : `${open.length} website items open` };
  return { status: "good", summary: "No issues reported" };
}

function computeSeo(client: ClientDetail | null): { status: HealthStatus; summary: string } {
  if (!client) return { status: "good", summary: "—" };
  const tasks = (client as ClientDetail & { tasks?: Array<{ type: string; title: string; status: string }> }).tasks ?? [];
  const requests = (client as ClientDetail & { requests?: Array<{ title: string; description?: string; status: string }> }).requests ?? [];
  const seoTasks = tasks.filter((t) => /seo|google|gbp|ranking/i.test(t.type + t.title));
  const seoReqs = requests.filter((r) => /seo|google|gbp|ranking/i.test(r.title + (r.description ?? "")));
  const open = [...seoTasks.filter((t) => t.status !== "completed" && t.status !== "cancelled"), ...seoReqs.filter((r) => r.status !== "completed" && r.status !== "closed")];
  if (open.length > 0) return { status: "attention", summary: `${open.length} SEO item(s) pending` };
  return { status: "good", summary: "Rankings stable" };
}

function computeTasks(client: ClientDetail | null): { status: HealthStatus; summary: string } {
  if (!client) return { status: "good", summary: "—" };
  const tasks = (client as ClientDetail & { tasks?: Array<{ status: string; dueDate?: string }> }).tasks ?? [];
  const now = new Date();
  const open = tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled");
  const overdue = open.filter((t) => t.dueDate && new Date(t.dueDate) < now);
  if (overdue.length > 0) return { status: "critical", summary: `${open.length} open · ${overdue.length} overdue` };
  if (open.length > 0) return { status: "attention", summary: `${open.length} open` };
  return { status: "good", summary: "All clear" };
}

function computeBilling(client: ClientDetail | null): { status: HealthStatus; summary: string } {
  if (!client) return { status: "good", summary: "—" };
  const mrr = (client as ClientDetail & { monthlyRetainer?: number }).monthlyRetainer ?? 0;
  const invoices = (client as ClientDetail & { invoices?: Array<{ status: string; dueDate: string; paidDate?: string | null; amount: number }> }).invoices ?? [];
  const now = new Date();
  const overdue = invoices.filter((i) => i.status === "overdue" || (new Date(i.dueDate) < now && i.status !== "paid" && i.status !== "void"));
  const paid = invoices.filter((i) => i.status === "paid" && i.paidDate).sort((a, b) => (b.paidDate! > a.paidDate! ? 1 : -1));
  const dueSoon = invoices.filter((i) => i.status !== "paid" && i.status !== "void" && i.status !== "overdue");
  const dueIn3 = dueSoon.filter((i) => {
    const d = new Date(i.dueDate);
    const in3 = new Date(); in3.setDate(in3.getDate() + 3);
    return d <= in3 && d >= new Date();
  });
  if (overdue.length > 0) return { status: "critical", summary: `Invoice ${overdue.length} overdue` };
  if (dueIn3.length > 0) return { status: "attention", summary: `$${mrr.toLocaleString()}/mo · Due in ${dueIn3.length} day(s)` };
  const lastPaid = paid[0];
  if (lastPaid?.paidDate) return { status: "good", summary: `$${mrr.toLocaleString()}/mo · Paid ${new Date(lastPaid.paidDate!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` };
  return { status: "good", summary: `$${mrr.toLocaleString()}/mo · Current` };
}

type Props = {
  clientId: string;
  clientName?: string;
};

export function HealthDashboard({ clientId, clientName: _clientName }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [client, setClient] = useState<ClientDetail | null>(null);

  useEffect(() => {
    api.getClientMain(clientId).then(setClient).catch(() => setClient(null));
  }, [clientId]);

  const metaAds = useMemo(() => computeMetaAds(client), [client]);
  const content = useMemo(() => computeContent(client), [client]);
  const website = useMemo(() => computeWebsite(client), [client]);
  const seo = useMemo(() => computeSeo(client), [client]);
  const tasks = useMemo(() => computeTasks(client), [client]);
  const billing = useMemo(() => computeBilling(client), [client]);

  const navigate = (tab: string) => {
    router.replace(`${pathname}?tab=${tab}`);
  };

  return (
    <div className="space-y-2">
      <HealthRow icon="📊" label="Meta Ads" status={metaAds.status} summary={metaAds.summary} onView={() => navigate("ads")} />
      <HealthRow icon="📝" label="Content" status={content.status} summary={content.summary} onView={() => navigate("content")} />
      <HealthRow icon="🌐" label="Website" status={website.status} summary={website.summary} onView={() => navigate("tasks")} />
      <HealthRow icon="🔍" label="Google/SEO" status={seo.status} summary={seo.summary} onView={() => navigate("tasks")} />
      <HealthRow icon="📋" label="Tasks" status={tasks.status} summary={tasks.summary} onView={() => navigate("tasks")} />
      <HealthRow icon="💰" label="Billing" status={billing.status} summary={billing.summary} onView={() => navigate("clientPlan")} />
    </div>
  );
}
