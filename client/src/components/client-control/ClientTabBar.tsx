"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export const CLIENT_TABS = ["overview", "tasks", "plan", "ads", "content", "social"] as const;
export type ClientTabId = (typeof CLIENT_TABS)[number];

const TAB_LABELS: Record<ClientTabId, string> = {
  overview: "Overview",
  tasks: "Tasks & Requests",
  plan: "Client Plan",
  ads: "Ads",
  content: "Content",
  social: "Social Media",
};

type Props = {
  activeTab: ClientTabId;
};

export function ClientTabBar({ activeTab }: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const setTab = useCallback(
    (tab: ClientTabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", tab);
      if (tab !== "tasks") params.delete("sub");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <nav className="flex gap-1 border-b border-gray-200 bg-white px-1">
      {CLIENT_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setTab(tab)}
          className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
