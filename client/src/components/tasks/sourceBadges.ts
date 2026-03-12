// Shared source badge config for TaskCard and TaskDetailModal

export const SOURCE_BADGES: Record<
  string,
  { icon: string; label: string; className: string }
> = {
  manual: {
    icon: "👤",
    label: "Manual",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  },
  agent: {
    icon: "🤖",
    label: "Agent",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  onboarding: {
    icon: "📋",
    label: "Onboarding",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  client_request: {
    icon: "📨",
    label: "Client Request",
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
};

export function getSourceBadge(source: string) {
  return SOURCE_BADGES[source] ?? {
    icon: "•",
    label: source || "—",
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  };
}
