"use client";

import { useEffect, useState, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ApiBrief } from "@/lib/api";

const AGENT_EMOJI: Record<string, string> = {
  "founder-boss": "🤖",
  "content-system": "📝",
  "meta-traffic": "🎯",
  "research-intel": "🔍",
  "inbox-triage": "📥",
  "project-manager": "📋",
  "approval-feedback": "✅",
  "client-memory": "🧠",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

const POLL_MS = 60_000;

export function BriefNotificationBell() {
  const { isDark } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [briefs, setBriefs] = useState<ApiBrief[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevUnreadRef = useRef(0);

  const fetchBriefs = () => {
    api
      .getBriefs({ status: "unread" })
      .then((r) => {
        const list = r.briefs ?? [];
        setBriefs(list.slice(0, 10));
        const count = list.length;
        setUnreadCount(count);
        prevUnreadRef.current = count;
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchBriefs();
    const interval = setInterval(fetchBriefs, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const hasNew = unreadCount > prevUnreadRef.current && prevUnreadRef.current >= 0;
  if (unreadCount > 0) prevUnreadRef.current = unreadCount;

  const dropdownBg = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative p-2.5 rounded-lg ${
          isDark ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
        title="Briefings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={hasNew ? { scale: 1.2 } : false}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-xs font-medium"
          >
            {unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={`absolute right-0 top-full mt-1 w-[280px] max-h-[360px] overflow-y-auto rounded-xl border shadow-xl z-50 ${dropdownBg}`}
            >
              <div className={`px-3 py-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-100"}`}>
                <span className={`text-xs font-semibold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
                  Briefings
                </span>
              </div>
              <div className="py-1">
                {briefs.length === 0 ? (
                  <p className={`px-3 py-4 text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    No unread briefings
                  </p>
                ) : (
                  briefs.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(`/?briefId=${b.id}`);
                      }}
                      className={`w-full block px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 ${isDark ? "text-[#c4b8a8]" : "text-gray-800"}`}
                    >
                      <span className="text-sm font-medium truncate block">{AGENT_EMOJI[b.agentId] ?? "📄"} {b.title}</span>
                      <span className={`text-[10px] ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                        {formatTime(b.createdAt)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
