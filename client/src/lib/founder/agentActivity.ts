/**
 * Agent activity feed — mock data matching cron schedule.
 * Used by Agent Activity Feed on Dashboard.
 */

export type AgentActivityStatus = "completed" | "running" | "scheduled" | "error";

export type AgentActivity = {
  id: string;
  agentId: string;
  agentName: string;
  agentEmoji: string;
  action: string;
  summary: string;
  channel: string;
  timestamp: string;
  status: AgentActivityStatus;
};

export const AGENT_SCHEDULE = [
  { agentId: "founder-boss", agentName: "Founder Boss", agentEmoji: "🤖", schedule: "Daily 9:00 AM", channel: "#boss", action: "Morning brief" },
  { agentId: "content-system", agentName: "Content System", agentEmoji: "📝", schedule: "Daily 10:00 AM", channel: "#content-alerts", action: "Content pipeline scan" },
  { agentId: "meta-traffic", agentName: "Meta Traffic", agentEmoji: "🎯", schedule: "Daily 11:00 AM", channel: "#meta-ads", action: "Ad performance check" },
  { agentId: "research-intel", agentName: "Research Intel", agentEmoji: "🔍", schedule: "Sunday 8:00 PM", channel: "#boss", action: "Competitor research" },
  { agentId: "inbox-triage", agentName: "Inbox Triage", agentEmoji: "📥", schedule: "On demand", channel: "#inbox", action: "Route & categorize" },
  { agentId: "project-manager", agentName: "Project Manager", agentEmoji: "📋", schedule: "Hourly SLA check", channel: "#projects", action: "SLA breach detection" },
  { agentId: "approval-feedback", agentName: "Approval & Feedback", agentEmoji: "✅", schedule: "On demand", channel: "#approvals", action: "Review gate" },
  { agentId: "client-memory", agentName: "Client Memory", agentEmoji: "🧠", schedule: "Always listening", channel: "#client-memory", action: "Knowledge keeper" },
] as const;

const DISCORD_BASE = "https://discord.com/channels/1472734279892074580";

/** Map channel name to a placeholder channel ID (replace with real IDs if needed) */
const CHANNEL_IDS: Record<string, string> = {
  "#boss": "1472734279892074582",
  "#content-alerts": "1472734279892074583",
  "#meta-ads": "1472734279892074584",
  "#inbox": "1472734279892074585",
  "#projects": "1472734279892074586",
  "#approvals": "1472734279892074587",
  "#client-memory": "1472734279892074588",
};

export function getDiscordUrlForChannel(channel: string): string {
  const id = CHANNEL_IDS[channel] || "1472734279892074582";
  return `${DISCORD_BASE}/${id}`;
}

const AGENT_COLORS: Record<string, string> = {
  "founder-boss": "border-l-blue-500",
  "content-system": "border-l-emerald-500",
  "meta-traffic": "border-l-violet-500",
  "research-intel": "border-l-amber-500",
  "inbox-triage": "border-l-cyan-500",
  "project-manager": "border-l-orange-500",
  "approval-feedback": "border-l-green-500",
  "client-memory": "border-l-pink-500",
};

export function getAgentBorderColor(agentId: string): string {
  return AGENT_COLORS[agentId] ?? "border-l-gray-500";
}

/** Build mock activity entries based on current time (past runs = completed, future = scheduled) */
export function getMockAgentActivities(limit = 10): AgentActivity[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = now.getDay(); // 0 = Sun
  const hour = now.getHours();
  const minutes = now.getMinutes();
  const nowMins = hour * 60 + minutes;

  const entries: AgentActivity[] = [];

  // Founder Boss — Daily 9:00 AM
  const boss9 = new Date(today);
  boss9.setHours(9, 0, 0, 0);
  const bossDone = now >= boss9;
  entries.push({
    id: "act-founder-boss",
    agentId: "founder-boss",
    agentName: "Founder Boss",
    agentEmoji: "🤖",
    action: "Morning brief generated",
    summary: "7 green, 1 yellow, 2 red. Casa Nova SLA breach, $4,400 overdue invoices. Top priority: chase Casa Nova weekend specials banner.",
    channel: "#boss",
    timestamp: boss9.toISOString(),
    status: bossDone ? "completed" : "scheduled",
  });

  // Content System — Daily 10:00 AM
  const content10 = new Date(today);
  content10.setHours(10, 0, 0, 0);
  const contentDone = now >= content10;
  entries.push({
    id: "act-content-system",
    agentId: "content-system",
    agentName: "Content System",
    agentEmoji: "📝",
    action: "Content pipeline scan completed",
    summary: "3 items due today, 2 clients with content gaps this week (Hafiza, Pro Fortuna).",
    channel: "#content-alerts",
    timestamp: content10.toISOString(),
    status: contentDone ? "completed" : "scheduled",
  });

  // Meta Traffic — Daily 11:00 AM
  const meta11 = new Date(today);
  meta11.setHours(11, 0, 0, 0);
  const metaDone = now >= meta11;
  entries.push({
    id: "act-meta-traffic",
    agentId: "meta-traffic",
    agentName: "Meta Traffic",
    agentEmoji: "🎯",
    action: "Daily ad performance check completed",
    summary: "Shape SPA Miami ROAS 3.8x ↑8%, Super Crisp declining -3% — recommend creative refresh.",
    channel: "#meta-ads",
    timestamp: meta11.toISOString(),
    status: metaDone ? "completed" : "scheduled",
  });

  // Research Intel — Sunday 8:00 PM
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - day);
  const researchTime = new Date(lastSunday);
  researchTime.setHours(20, 0, 0, 0);
  const researchDone = now >= researchTime;
  entries.push({
    id: "act-research-intel",
    agentId: "research-intel",
    agentName: "Research Intel",
    agentEmoji: "🔍",
    action: "Weekly competitor research completed",
    summary: "Found 3 new competitor campaigns in Miami med spa market. Ardan's competitor running 40% off promo.",
    channel: "#boss",
    timestamp: researchTime.toISOString(),
    status: researchDone ? "completed" : "scheduled",
  });

  // Sort by timestamp desc (newest first)
  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return entries.slice(0, limit);
}

export function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDay.getTime() === today.getTime()) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  }
  const diff = Math.floor((today.getTime() - dDay.getTime()) / (24 * 60 * 60 * 1000));
  if (diff === 1) return "Yesterday " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", hour12: true });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}
