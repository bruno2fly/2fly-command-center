"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAgentChat } from "@/contexts/AgentChatContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { MOCK_INVOICES } from "@/lib/founderData";
import { getGlobalAlerts, getGlobalApprovals } from "@/lib/client/mockClientControlData";
import { CommandSearchModal } from "./CommandSearchModal";
import { AlertsApprovalsDrawer } from "./AlertsApprovalsDrawer";
import { CriticalAlertChip } from "./CriticalAlertChip";

export function CommandBar() {
  const pathname = usePathname() ?? "";
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { setTheme, isDark } = useTheme();
  const { togglePanel: toggleAgentChat, panelOpen: agentChatOpen } = useAgentChat();
  const [quickCapture, setQuickCapture] = useState("");
  const [quickCaptureLoading, setQuickCaptureLoading] = useState(false);

  const alerts = getGlobalAlerts();
  const approvals = getGlobalApprovals();
  const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === "overdue");
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.amount, 0);

  const urgentCount = alerts.length;
  const waitingCount = approvals.length;
  const dueAmount = overdueAmount;

  const handleQuickCaptureSubmit = async () => {
    const value = quickCapture.trim();
    if (!value) return;

    setQuickCaptureLoading(true);
    try {
      toast.success("📝 Saved");
      setQuickCapture("");
    } catch {
      toast.error("❌ Failed. Try again.");
    }
    setQuickCaptureLoading(false);
  };

  const handleQuickCaptureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickCapture.trim()) {
      e.preventDefault();
      handleQuickCaptureSubmit();
    }
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
      if (e.key === "m" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggleAgentChat();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [toggleAgentChat]);

  const navLink = (href: string, label: string) => {
    const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`px-3 py-2 rounded-lg text-sm font-medium ${
          isActive
            ? isDark
              ? "bg-[#141210] text-emerald-400/90"
              : "bg-gray-100 text-gray-900"
            : isDark
              ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <header
        className={`px-4 py-2.5 flex items-center gap-4 shrink-0 ${
          isDark
            ? "bg-[#08080c] border-b border-[#1a1810]"
            : "bg-white border-b border-gray-100"
        }`}
      >
        {/* LEFT ZONE: Search + Critical Alert */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
          <button
            onClick={() => setSearchOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm min-w-[140px] shrink-0 ${
              isDark
                ? "bg-[#0a0a0e] hover:bg-[#141210] text-[#8a7e6d] hover:text-[#c4b8a8] border border-[#1a1810]"
                : "bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className={`ml-auto px-1.5 py-0.5 text-xs rounded ${isDark ? "bg-[#1a1810] text-[#5a5040]" : "bg-gray-200"}`}>⌘K</kbd>
          </button>
          <CriticalAlertChip />
        </div>

        {/* CENTER ZONE: Main nav */}
        <nav className="flex items-center gap-1 flex-shrink-0">
          {navLink("/", "Dashboard")}
          {navLink("/clients", "Clients")}
          {navLink("/payments", "Payments")}
          {navLink("/content", "Content Calendar")}
          {navLink("/whatsapp", "WhatsApp")}
        </nav>

        {/* RIGHT ZONE: Counters + Agents + User */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative p-2.5 rounded-lg ${
              isDark ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
            title="Alerts & Approvals"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {(urgentCount + waitingCount) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-xs font-medium">
                {urgentCount + waitingCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5">
            {urgentCount > 0 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                  isDark ? "text-red-400 bg-red-500/20 hover:bg-red-500/30" : "text-red-600 bg-red-50 hover:bg-red-100"
                }`}
                title="Urgent"
              >
                🔥 {urgentCount} urgent
              </button>
            )}
            {waitingCount > 0 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                  isDark ? "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30" : "text-amber-600 bg-amber-50 hover:bg-amber-100"
                }`}
                title="Waiting"
              >
                ⏳ {waitingCount} waiting
              </button>
            )}
            {dueAmount > 0 && (
              <button
                onClick={() => setDrawerOpen(true)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 ${
                  isDark ? "text-red-400 bg-red-500/20 hover:bg-red-500/30" : "text-red-600 bg-red-50 hover:bg-red-100"
                }`}
                title="Overdue"
              >
                💰 ${(dueAmount / 1000).toFixed(0)}k due
              </button>
            )}
          </div>

          <button
            onClick={toggleAgentChat}
            className={`p-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
              agentChatOpen
                ? isDark ? "bg-purple-500/20 text-purple-400" : "bg-purple-100 text-purple-700"
                : isDark ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]" : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Agent Chat (⌘M)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Agents
          </button>

          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`p-2.5 rounded-lg ${
              isDark ? "text-amber-400/90 hover:bg-[#141210] hover:text-amber-300" : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            }`}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`p-2.5 rounded-lg flex items-center gap-2 ${
                isDark ? "text-[#8a7e6d] hover:bg-[#141210] hover:text-[#c4b8a8]" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              title="User menu"
            >
              <span className="w-8 h-8 rounded-full bg-slate-500/30 flex items-center justify-center text-sm font-medium">
                U
              </span>
            </button>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div
                  className={`absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg z-50 min-w-[160px] ${
                    isDark ? "bg-[#0a0a0e] border border-[#1a1810]" : "bg-white border border-gray-200"
                  }`}
                >
                  <Link
                    href="/settings"
                    onClick={() => setUserMenuOpen(false)}
                    className={`block px-4 py-2 text-sm ${
                      isDark ? "text-[#c4b8a8] hover:bg-[#141210]" : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Settings
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <AlertsApprovalsDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        alerts={alerts}
        approvals={approvals}
      />
    </>
  );
}
