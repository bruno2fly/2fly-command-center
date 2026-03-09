"use client";

import { useState, useEffect } from "react";
import { useFocusMode } from "@/contexts/FocusModeContext";
import { useActions } from "@/contexts/ActionsContext";
import { useAgentChat } from "@/contexts/AgentChatContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { MOCK_INVOICES } from "@/lib/founderData";
import { getGlobalAlerts, getGlobalApprovals } from "@/lib/client/mockClientControlData";
import { CommandSearchModal } from "./CommandSearchModal";
import { AlertsApprovalsDrawer } from "./AlertsApprovalsDrawer";

export function CommandBar() {
  const pathname = usePathname() ?? "";
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { focusMode, setFocusMode } = useFocusMode();
  const { focusItems, markCompleteById } = useActions();
  const { togglePanel: toggleAgentChat, panelOpen: agentChatOpen } = useAgentChat();
  const [quickCapture, setQuickCapture] = useState("");
  const [quickCaptureLoading, setQuickCaptureLoading] = useState(false);

  const alerts = getGlobalAlerts();
  const approvals = getGlobalApprovals();
  const overdueInvoices = MOCK_INVOICES.filter((i) => i.status === "overdue");
  const overdueAmount = overdueInvoices.reduce((s, i) => s + i.amount, 0);

  const handleQuickCaptureSubmit = async () => {
    const value = quickCapture.trim();
    if (!value) return;

    setQuickCaptureLoading(true);
    const isTask = /\/(task|t)\b/i.test(value);
    const isRequest = /\/(request|req|r)\b/i.test(value);
    const cleanValue = value.replace(/\/(task|request|req|t|r|note)/gi, "").trim();

    try {
      if (isTask) {
        toast.success("✓ Task created");
      } else if (isRequest) {
        toast.success("✓ Request created");
      } else {
        toast.success("📝 Note saved");
      }
      setQuickCapture("");
    } catch {
      toast.error("❌ Failed to create. Try again.");
    }
    setQuickCaptureLoading(false);
  };

  const handleQuickCaptureKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && quickCapture.trim()) {
      e.preventDefault();
      handleQuickCaptureSubmit();
    }
  };

  const handleDoIt = (e: React.MouseEvent, itemId: string) => {
    e.preventDefault();
    e.stopPropagation();
    markCompleteById(itemId);
    toast.success("✓ Task completed");
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

  return (
    <>
      <header className="bg-white border-b border-gray-100 px-4 py-2.5 flex items-center gap-4 shrink-0">
        {/* Left: CmdK search + Quick Capture */}
        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-2xl">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-sm min-w-[160px]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search clients & tasks</span>
            <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-gray-200 rounded">⌘K</kbd>
          </button>
          <div className="flex-1 relative">
            <input
              type="text"
              value={quickCapture}
              onChange={(e) => setQuickCapture(e.target.value)}
              onKeyDown={handleQuickCaptureKeyDown}
              placeholder="Quick capture: task / note / request... (Enter to save, /task /request for type)"
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60"
              disabled={quickCaptureLoading}
            />
            {quickCaptureLoading && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
            )}
          </div>
        </div>

        {/* Center: Focus strip - Now + next 2 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {focusItems.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              <Link
                href={`/clients/${t.clientId}`}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                  i === 0
                    ? "bg-blue-600 text-white hover:bg-blue-500"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <span className="font-medium truncate max-w-[140px]">
                  {i === 0 ? "Now:" : ""} {t.title}
                </span>
                <span className={i === 0 ? "text-blue-100" : "text-gray-500"}>· {t.clientName}</span>
              </Link>
              <button
                type="button"
                onClick={(e) => handleDoIt(e, t.id)}
                className={`px-2 py-1.5 rounded text-xs font-medium ${
                  i === 0 ? "bg-white/20 hover:bg-white/30 text-white" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Do it
              </button>
            </div>
          ))}
          {focusItems.length === 0 && (
            <span className="text-sm text-gray-500 px-3 py-2">No priorities</span>
          )}
        </div>

        {/* Right: Icons + mode switch */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setDrawerOpen(true)}
            className="relative p-2.5 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            title="Alerts & Approvals"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {(alerts.length + approvals.length) > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full bg-red-500 text-white text-xs font-medium">
                {alerts.length + approvals.length}
              </span>
            )}
          </button>
          {alerts.length > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100"
              title="Alerts"
            >
              {alerts.length}
            </button>
          )}
          {approvals.length > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100"
              title="Approvals"
            >
              {approvals.length}
            </button>
          )}
          {overdueAmount > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 font-medium text-sm"
              title="Overdue invoices"
            >
              ${(overdueAmount / 1000).toFixed(0)}k
            </button>
          )}
          <button
            onClick={toggleAgentChat}
            className={`p-2.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
              agentChatOpen ? "bg-purple-100 text-purple-700" : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Agent Chat (⌘M)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Agents
          </button>
          <button
            onClick={() => setFocusMode(!focusMode)}
            className={`p-2.5 rounded-lg text-sm font-medium ${
              focusMode ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
            }`}
            title="Focus mode"
          >
            Focus
          </button>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <Link
            href="/"
            className={`px-2.5 py-2 rounded-lg text-sm font-medium ${
              pathname === "/" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/clients"
            className={`px-2.5 py-2 rounded-lg text-sm font-medium ${
              pathname === "/clients" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Clients
          </Link>
          <Link
            href="/settings"
            className={`px-2.5 py-2 rounded-lg text-sm font-medium ${
              pathname === "/settings" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            Settings
          </Link>
          <Link
            href="/whatsapp"
            className={`px-2.5 py-2 rounded-lg text-sm font-medium ${
              pathname === "/whatsapp" || pathname === "/whatsapp-inbox" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            WhatsApp Inbox
          </Link>
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
