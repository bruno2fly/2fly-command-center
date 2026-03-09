"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useClients } from "@/contexts/ClientsContext";
import { MOCK_TASKS } from "@/lib/founderData";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

type SearchResult = { id: string; label: string; type: "client" | "task"; href: string };

export function CommandSearchModal({ isOpen, onClose }: Props) {
  const router = useRouter();
  const { clients } = useClients();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) {
      return [
        ...clients.slice(0, 5).map((c) => ({
          id: c.id,
          label: c.name,
          type: "client" as const,
          href: `/clients/${c.id}`,
        })),
        ...MOCK_TASKS.slice(0, 5).map((t) => ({
          id: t.id,
          label: `${t.title} · ${t.clientName}`,
          type: "task" as const,
          href: `/clients/${t.clientId}`,
        })),
      ];
    }
    const q = query.toLowerCase();
    const matchedClients = clients.filter((c) => c.name.toLowerCase().includes(q)).map((c) => ({
      id: `c-${c.id}`,
      label: c.name,
      type: "client" as const,
      href: `/clients/${c.id}`,
    }));
    const tasks = MOCK_TASKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) || t.clientName.toLowerCase().includes(q)
    ).map((t) => ({
      id: `t-${t.id}`,
      label: `${t.title} · ${t.clientName}`,
      type: "task" as const,
      href: `/clients/${t.clientId}`,
    }));
    return [...matchedClients, ...tasks].slice(0, 10);
  }, [query, clients]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      }
      if (e.key === "Enter" && results[selected]) {
        e.preventDefault();
        router.push(results[selected].href);
        onClose();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [isOpen, onClose, results, selected, router]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center pt-[15vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients & tasks..."
              className="flex-1 outline-none text-gray-900 placeholder-gray-400"
              autoFocus
            />
            <kbd className="hidden sm:inline px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded">⌘K</kbd>
          </div>
          <div className="max-h-72 overflow-auto py-2">
            {results.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-500">No results</p>
            ) : (
              results.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => {
                    router.push(r.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelected(i)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
                    i === selected ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  {r.type === "client" ? (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  )}
                  <span className="text-sm font-medium text-gray-900">{r.label}</span>
                </button>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
