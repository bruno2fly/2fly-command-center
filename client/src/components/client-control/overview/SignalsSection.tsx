"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { CommandSection } from "@/components/ui/CommandSection";
import { SignalRow, type SignalSeverity } from "@/components/client-control/overview/SignalRow";

export type SignalEntry = {
  id: string;
  text: string;
  time: string;
  severity?: SignalSeverity;
};

type Props = {
  signals: SignalEntry[];
};

function inferSeverity(text: string): SignalSeverity {
  const lower = text.toLowerCase();
  if (lower.includes("overdue") || lower.includes("bug") || lower.includes("urgent") || lower.includes("risk")) return "urgent";
  if (lower.includes("approval") || lower.includes("approve") || lower.includes("review")) return "approval";
  if (lower.includes("completed") || lower.includes("approved") || lower.includes("deployed") || lower.includes("up")) return "success";
  return "info";
}

export function SignalsSection({ signals }: Props) {
  const { isDark } = useTheme();
  const divideCls = isDark ? "divide-[#1a1810]" : "divide-gray-100";
  const emptyCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <CommandSection title="Signals / Activity">
      <div className={`divide-y empty:divide-y-0 ${divideCls}`}>
        {signals.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className={`text-sm ${emptyCls}`}>No recent signals.</p>
          </div>
        ) : (
          signals.map((s) => (
            <SignalRow
              key={s.id}
              id={s.id}
              message={s.text}
              timestamp={s.time}
              severity={s.severity ?? inferSeverity(s.text)}
            />
          ))
        )}
      </div>
    </CommandSection>
  );
}

