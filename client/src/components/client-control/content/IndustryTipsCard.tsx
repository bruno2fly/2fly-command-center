"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { getTipsForIndustry } from "./industryTips";

type Props = {
  industry: string | null | undefined;
};

export function IndustryTipsCard({ industry }: Props) {
  const { isDark } = useTheme();
  const tips = getTipsForIndustry(industry);
  const displayIndustry = industry ? industry.replace(/_/g, " ") : "your industry";

  const cardCls = isDark
    ? "bg-[rgba(30,41,59,0.5)] border-[rgba(51,65,85,0.5)]"
    : "bg-white border-[rgba(226,232,240,1)]";
  const gradientCls = "bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-purple-500/20";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#5a5040]" : "text-gray-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border ${cardCls} ${gradientCls} overflow-hidden`}
    >
      <div className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          💡 AI Tips for {displayIndustry}
        </h2>

        <div className="mt-4 space-y-4">
          <div>
            <h3 className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>
              🔥 Trending
            </h3>
            <ul className="mt-1.5 space-y-1">
              {tips.trending.map((t, i) => (
                <li key={i} className={`text-xs ${textCls}`}>
                  • {t}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>
              📊 Best posting times
            </h3>
            <ul className="mt-1.5 space-y-1">
              {tips.postingTimes.map((t, i) => (
                <li key={i} className={`text-xs ${textCls}`}>
                  • {t}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className={`text-[10px] font-semibold uppercase tracking-wider ${mutedCls}`}>
              📌 Content mix recommendation
            </h3>
            <ul className="mt-1.5 space-y-1">
              {tips.contentMix.map((m, i) => (
                <li key={i} className={`text-xs ${textCls}`}>
                  • {m.pct}% {m.label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
