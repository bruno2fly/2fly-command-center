"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export const CLIENT_TABS = ["overview", "tasksRequests", "clientPlan", "ads", "content", "socialMedia"] as const;
export type ClientTabId = (typeof CLIENT_TABS)[number];

const TAB_LABELS: Record<ClientTabId, string> = {
  overview: "Overview",
  tasksRequests: "Tasks & Requests",
  clientPlan: "Client Plan",
  ads: "Ads",
  content: "Content",
  socialMedia: "Social Media",
};

type Props = {
  activeTab: ClientTabId;
};

export function ClientTabBar({ activeTab }: Props) {
  const { isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  const setTab = useCallback(
    (tab: ClientTabId) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", tab);
      params.delete("sub");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  return (
    <nav className={`flex gap-1 border-b px-1 ${isDark ? "border-[#1a1810] bg-[#08080c]" : "border-gray-200 bg-white"}`}>
      {CLIENT_TABS.map((tab) => (
        <button
          key={tab}
          onClick={() => setTab(tab)}
          className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab
              ? isDark
                ? "border-emerald-500/80 text-emerald-400/90"
                : "border-blue-600 text-blue-600"
              : isDark
                ? "border-transparent text-[#8a7e6d] hover:text-[#c4b8a8] hover:border-[#2a2018]"
                : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
          }`}
        >
          {TAB_LABELS[tab]}
        </button>
      ))}
    </nav>
  );
}
