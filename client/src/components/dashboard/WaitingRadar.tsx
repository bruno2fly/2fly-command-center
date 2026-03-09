"use client";

import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";
import { MOCK_BOTTLENECKS } from "@/lib/founderData";
import { CommandSection } from "@/components/ui/CommandSection";
import { WaitingBadge, type WaitingVariant } from "@/components/ui/WaitingBadge";

const AGE_BY_ID: Record<string, number> = {
  b1: 3,
  b2: 2,
  b3: 6,
  b4: 3,
  b5: 1,
};

export function WaitingRadar() {
  const { isDark } = useTheme();

  const onClient = MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_client");
  const onTeam = MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_team");
  const onMe = MOCK_BOTTLENECKS.filter((b) => b.category === "waiting_on_me");

  const colBaseCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  function Column({
    variant,
    items,
  }: {
    variant: WaitingVariant;
    items: typeof onClient;
  }) {
    const isOnMe = variant === "on_me";

    const colCls = isOnMe
      ? isDark
        ? "rounded-lg border-2 border-emerald-500/30 bg-emerald-500/5 p-4"
        : "rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-4"
      : `rounded-lg border p-3 ${colBaseCls}`;

    const linkCls = isDark
      ? "text-emerald-400/90 hover:text-emerald-400"
      : "text-blue-600 hover:text-blue-700";

    return (
      <div className={colCls}>
        <div className="mb-3">
          <WaitingBadge variant={variant} count={items.length} />
        </div>
        <ul className="space-y-2.5">
          {items.length === 0 ? (
            <li className={`text-sm ${mutedCls}`}>None</li>
          ) : (
            items.map((b) => {
              const age = AGE_BY_ID[b.id] ?? 0;
              return (
                <li key={b.id}>
                  <Link
                    href={`/clients/${b.clientId}`}
                    className={`text-sm font-medium ${linkCls}`}
                  >
                    {b.clientName}
                  </Link>
                  <p className={`text-xs mt-0.5 ${mutedCls}`}>{b.action}</p>
                  <span
                    className={`text-[10px] font-medium ${mutedCls}`}
                    title={`${age} days waiting`}
                  >
                    {age}d
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    );
  }

  return (
    <CommandSection title="Waiting Radar" accent="waiting">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <Column variant="on_me" items={onMe} />
        <Column variant="on_client" items={onClient} />
        <Column variant="on_team" items={onTeam} />
      </div>
    </CommandSection>
  );
}
