"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { CommandSection } from "@/components/ui/CommandSection";
import type { ClientHealth } from "@/lib/client/mockClientControlData";
import type { BriefOfTheDay, ContentQualityOverview, TwoFlyFlowOverview } from "@/lib/client/mockClientControlData";

export type CommandSignal = {
  id: string;
  text: string;
  severity: "urgent" | "approval" | "healthy";
};

type Props = {
  brief: BriefOfTheDay | null;
  contentQuality: ContentQualityOverview | null;
  flyflow: TwoFlyFlowOverview;
  health: ClientHealth | null;
};

function buildSignals(props: Props): CommandSignal[] {
  const { brief, contentQuality, flyflow, health } = props;
  const signals: CommandSignal[] = [];

  // Urgent issues
  if (health?.formsOk === false) {
    signals.push({ id: "forms", text: "Contact form bug reported", severity: "urgent" });
  }
  if (health?.paymentStatus === "overdue" && health.paymentDaysOverdue) {
    signals.push({
      id: "invoice",
      text: `Invoice overdue ${health.paymentDaysOverdue} days`,
      severity: "urgent",
    });
  }
  if (health?.websiteStatus === "down") {
    signals.push({ id: "website", text: "Website down", severity: "urgent" });
  }
  if (health?.deliveryStatus === "late" || health?.missedPromises) {
    signals.push({ id: "delivery", text: "Delivery at risk or overdue", severity: "urgent" });
  }

  // Approvals pending
  if (flyflow.pendingApproval > 0) {
    signals.push({
      id: "approval",
      text: `${flyflow.pendingApproval} approval${flyflow.pendingApproval > 1 ? "s" : ""} pending`,
      severity: "approval",
    });
  }

  // Healthy / production status from brief and content
  const briefSummary = brief?.text?.split(".")[0]?.trim();
  if (briefSummary && !briefSummary.toLowerCase().includes("urgent") && !briefSummary.toLowerCase().includes("blocker")) {
    signals.push({ id: "brief", text: briefSummary, severity: "healthy" });
  }
  if (contentQuality?.text) {
    const parts = contentQuality.text.split(/\.\s+/).map((s) => s.trim()).filter(Boolean);
    const healthyParts = parts.filter(
      (p) =>
        p.toLowerCase().includes("healthy") ||
        p.toLowerCase().includes("filled") ||
        p.toLowerCase().includes("pipeline") ||
        p.toLowerCase().includes("calendar")
    );
    healthyParts.slice(0, 2).forEach((p, i) => {
      if (p.length > 3) signals.push({ id: `content-${i}`, text: p, severity: "healthy" });
    });
  }
  if (signals.filter((s) => s.severity === "healthy").length === 0) {
    signals.push({ id: "default", text: "Content pipeline healthy. Calendar filled through mid-month.", severity: "healthy" });
  }

  return signals;
}

export function CommandBrief({ brief, contentQuality, flyflow, health }: Props) {
  const { isDark } = useTheme();
  const signals = buildSignals({ brief, contentQuality, flyflow, health });

  const urgentIcon = "⚠";
  const approvalIcon = "⚠";
  const healthyIcon = "✓";

  const urgentCls = isDark ? "text-red-400" : "text-red-600";
  const approvalCls = isDark ? "text-amber-400" : "text-amber-600";
  const healthyCls = isDark ? "text-emerald-400" : "text-emerald-600";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-700";

  const getIcon = (s: CommandSignal) => {
    if (s.severity === "urgent") return urgentIcon;
    if (s.severity === "approval") return approvalIcon;
    return healthyIcon;
  };
  const getIconCls = (s: CommandSignal) => {
    if (s.severity === "urgent") return urgentCls;
    if (s.severity === "approval") return approvalCls;
    return healthyCls;
  };

  return (
    <CommandSection title="Command Brief">
      <div className="px-4 py-3 space-y-2">
        {signals.length === 0 ? (
          <p className={`text-sm ${textCls}`}>No signals for this client.</p>
        ) : (
          <ul className="space-y-2">
            {signals.map((s) => (
              <li key={s.id} className="flex items-start gap-2 text-sm">
                <span className={`shrink-0 font-bold ${getIconCls(s)}`}>{getIcon(s)}</span>
                <span className={textCls}>{s.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CommandSection>
  );
}
