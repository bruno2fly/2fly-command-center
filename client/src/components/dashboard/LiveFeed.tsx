"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { CommandSection } from "@/components/ui/CommandSection";
import { EventRow, type EventSignal } from "@/components/ui/EventRow";
import type { ActivityEvent, ActivityType } from "@/lib/founder/mockFounderData";

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffM = Math.floor((now.getTime() - d.getTime()) / 60000);
  const diffH = Math.floor(diffM / 60);
  if (diffM < 1) return "just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}

const TYPE_CONFIG: Record<
  ActivityType,
  { label: string; icon: string; signal: EventSignal }
> = {
  whatsapp: { label: "WhatsApp", icon: "💬", signal: "routine" },
  request: { label: "Request", icon: "📋", signal: "operational" },
  approval_requested: { label: "Approval", icon: "⏳", signal: "operational" },
  approval_approved: { label: "Approved", icon: "✓", signal: "routine" },
  invoice_overdue: { label: "Overdue", icon: "⚠", signal: "operational" },
  invoice_paid: { label: "Payment", icon: "💰", signal: "operational" },
  ads_alert: { label: "Ads", icon: "📊", signal: "operational" },
};

type Props = {
  events: ActivityEvent[];
};

export function LiveFeed({ events }: Props) {
  const { isDark } = useTheme();

  const display = [...events]
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 8);

  const divideCls = isDark ? "divide-[#1a1810]" : "divide-gray-50";
  const emptyCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <CommandSection title="Live Feed" accent="live">
      <div className={`max-h-[280px] overflow-y-auto divide-y ${divideCls}`}>
        {display.length === 0 ? (
          <p className={`p-4 text-sm ${emptyCls}`}>No recent activity</p>
        ) : (
          display.map((e) => {
            const config = TYPE_CONFIG[e.type];
            return (
              <EventRow
                key={e.id}
                icon={config.icon}
                typeLabel={config.label}
                clientName={e.clientName}
                message={e.message}
                timestamp={relativeTime(e.timestamp)}
                clientId={e.clientId}
                signal={config.signal}
              />
            );
          })
        )}
      </div>
    </CommandSection>
  );
}
