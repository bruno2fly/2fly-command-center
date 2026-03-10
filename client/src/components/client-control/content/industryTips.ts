/**
 * Static industry-based content tips. AI agent will populate later.
 */
export type TipSet = {
  trending: string[];
  postingTimes: string[];
  contentMix: { label: string; pct: number }[];
};

export const INDUSTRY_TIPS: Record<string, TipSet> = {
  med_spa: {
    trending: [
      "Before & after transformations get 3x engagement for med spas",
      "Reel idea: Day-in-the-life at the spa — avg 45% more reach",
    ],
    postingTimes: [
      "Feed: Tue/Thu 11am-1pm",
      "Reels: Wed/Fri 7-9pm",
      "Stories: Daily 9-10am",
    ],
    contentMix: [
      { label: "Educational / Tips", pct: 40 },
      { label: "Behind the scenes / Team", pct: 30 },
      { label: "Client results / Testimonials", pct: 20 },
      { label: "Promotional / Offers", pct: 10 },
    ],
  },
  restaurant: {
    trending: [
      "Dish-of-the-day reels drive 2x saves",
      "Kitchen BTS and chef stories boost trust",
    ],
    postingTimes: [
      "Feed: Wed/Sun 12-2pm",
      "Reels: Fri/Sat 6-8pm",
      "Stories: Daily 11am",
    ],
    contentMix: [
      { label: "Menu highlights", pct: 35 },
      { label: "Behind the scenes", pct: 25 },
      { label: "Reviews / UGC", pct: 25 },
      { label: "Promos / Events", pct: 15 },
    ],
  },
  wellness: {
    trending: [
      "Morning routine clips perform well in wellness",
      "Short tips (15–30s) get higher completion rates",
    ],
    postingTimes: [
      "Feed: Mon/Wed/Fri 7-9am",
      "Reels: Tue/Thu 6-7pm",
      "Stories: Daily 8am",
    ],
    contentMix: [
      { label: "Educational / Tips", pct: 45 },
      { label: "Mindfulness / Routines", pct: 25 },
      { label: "Testimonials", pct: 20 },
      { label: "Offers / Programs", pct: 10 },
    ],
  },
  financial: {
    trending: [
      "Explainers and tip carousels build authority",
      "Client success snippets (with permission) increase trust",
    ],
    postingTimes: [
      "Feed: Tue/Thu 9-11am",
      "LinkedIn: Wed 8-10am",
      "Stories: Weekdays 12pm",
    ],
    contentMix: [
      { label: "Educational / Tips", pct: 50 },
      { label: "Market insights", pct: 20 },
      { label: "Team / Culture", pct: 15 },
      { label: "Services / Offers", pct: 15 },
    ],
  },
  beauty: {
    trending: [
      "Tutorial snippets and before/after get high engagement",
      "Reel idea: Get-ready-with-me — strong for beauty",
    ],
    postingTimes: [
      "Feed: Tue/Thu/Sat 10am-12pm",
      "Reels: Wed/Fri 7-9pm",
      "Stories: Daily 9-10am",
    ],
    contentMix: [
      { label: "Tutorials / How-to", pct: 35 },
      { label: "Product / Looks", pct: 30 },
      { label: "UGC / Reviews", pct: 20 },
      { label: "Promos", pct: 15 },
    ],
  },
};

const DEFAULT_TIPS: TipSet = {
  trending: [
    "Consistent posting beats occasional bursts",
    "Hook in the first 3 seconds for Reels",
  ],
  postingTimes: [
    "Feed: Tue/Thu 10am-2pm",
    "Reels: Wed/Fri 6-8pm",
    "Stories: Daily morning",
  ],
  contentMix: [
    { label: "Educational", pct: 40 },
    { label: "Behind the scenes", pct: 30 },
    { label: "Social proof", pct: 20 },
    { label: "Promotional", pct: 10 },
  ],
};

export function getTipsForIndustry(industry: string | null | undefined): TipSet {
  if (!industry) return DEFAULT_TIPS;
  const key = industry.toLowerCase().replace(/\s+/g, "_");
  return INDUSTRY_TIPS[key] ?? DEFAULT_TIPS;
}
