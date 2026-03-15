"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { motion } from "framer-motion";
import { api, type ApiClient } from "@/lib/api";

type SaasNotes = {
  type?: string;
  description?: string;
  stage?: string;
  revenue?: number;
  targetRevenue?: number;
  goals?: string[];
  customers?: number;
};

function parseNotes(notes: string | null | undefined): SaasNotes {
  if (!notes) return {};
  try { return JSON.parse(notes); } catch { return {}; }
}

const STAGE_EMOJI: Record<string, string> = {
  planning: "📋",
  building: "🔨",
  beta: "🧪",
  launched: "🚀",
  scaling: "📈",
  internal: "🏠",
};

export function SaasPlatformsSection() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [products, setProducts] = useState<ApiClient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getClients();
        const saas = res.clients.filter(c => c.workspace === "saas");
        setProducts(saas);
      } catch { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const muted = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const text = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const cardBg = isDark
    ? "bg-purple-500/5 border-purple-500/15 hover:border-purple-500/30"
    : "bg-purple-50/50 border-purple-200/60 hover:border-purple-300";

  if (loading || products.length === 0) return null;

  const totalRevenue = products.reduce((sum, p) => {
    const notes = parseNotes(p.notes);
    return sum + (notes.revenue || 0);
  }, 0);
  const totalTarget = 30000;
  const weeksLeft = Math.ceil((new Date("2026-06-30").getTime() - Date.now()) / (7 * 86400000));
  const totalPendingTasks = 0; // We don't have task counts here, but the cards link to details

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-purple-400/90">
        🚀 Your Platforms
      </h2>

      {/* Combined goal bar */}
      <div className={`rounded-xl border border-purple-500/20 bg-purple-500/5 px-4 py-3`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-sm font-medium ${text}`}>
            ${totalRevenue.toLocaleString()}/mo → $30K target
          </span>
          <span className={`text-xs ${muted}`}>
            ~{weeksLeft} weeks left
          </span>
        </div>
        <div className={`w-full h-2 rounded-full ${isDark ? "bg-white/5" : "bg-gray-200"}`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((totalRevenue / totalTarget) * 100, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-purple-600 to-indigo-400"
            style={{ minWidth: totalRevenue > 0 ? "4px" : "0px" }}
          />
        </div>
      </div>

      {/* Product cards */}
      <ul className="space-y-2">
        {products.map((product, i) => {
          const notes = parseNotes(product.notes);
          const stageEmoji = STAGE_EMOJI[notes.stage || "planning"] || "📋";
          const stageName = notes.stage ? notes.stage.charAt(0).toUpperCase() + notes.stage.slice(1) : "Planning";

          return (
            <motion.li
              key={product.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <button
                type="button"
                onClick={() => router.push(`/clients/${product.id}`)}
                className={`w-full text-left rounded-xl border ${cardBg} p-4 transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-medium ${text}`}>{product.name}</p>
                    <p className={`text-xs ${muted} mt-0.5`}>
                      {stageEmoji} {stageName}
                      {notes.revenue !== undefined && ` · $${notes.revenue.toLocaleString()}/mo`}
                      {notes.targetRevenue !== undefined && ` → $${notes.targetRevenue.toLocaleString()}`}
                    </p>
                  </div>
                  <span className={`text-xs ${muted}`}>→</span>
                </div>
              </button>
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
