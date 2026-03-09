"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { MissionStatusBadge, type StatusVariant } from "./StatusBadge";

type Props = {
  clientName: string;
  healthVariant: StatusVariant;
  monthlyRetainer: number | null;
  lastDelivery: string | null;
  nextPromise: string | null;
  onEdit: () => void;
  onQuickNote: () => void;
  onNewRequest: () => void;
  onOpenWhatsApp: () => void;
  onCreateTask: () => void;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ClientCommandHeader({
  clientName,
  healthVariant,
  monthlyRetainer,
  lastDelivery,
  nextPromise,
  onEdit,
  onQuickNote,
  onNewRequest,
  onOpenWhatsApp,
  onCreateTask,
}: Props) {
  const { isDark } = useTheme();

  const btnBase = "px-3 py-2 text-sm font-medium rounded-lg transition-colors";
  const btnSecondary = isDark
    ? "text-[#8a7e6d] bg-[#141210] hover:bg-[#1a1810] hover:text-[#c4b8a8] border border-[#1a1810]"
    : "text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200";
  const btnPrimary = isDark
    ? "text-white bg-emerald-600/90 hover:bg-emerald-500/90 border border-emerald-500/50"
    : "text-white bg-blue-600 hover:bg-blue-500 border border-blue-500";

  return (
    <header
      className={`flex-shrink- border-b ${
        isDark
          ? "bg-[#06060a] border-[#1a1810]"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="px-6 py-4">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className={`text-xl font-bold tracking-tight ${
                  isDark ? "text-[#e8e0d4]" : "text-gray-900"
                }`}
              >
                {clientName}
              </h1>
              <MissionStatusBadge variant={healthVariant} />
            </div>
            <div
              className={`flex items-center gap-4 mt-2 text-sm flex-wrap ${
                isDark ? "text-[#8a7e6d]" : "text-gray-500"
              }`}
            >
              {monthlyRetainer != null && monthlyRetainer > 0 && (
                <span className="font-medium">
                  ${monthlyRetainer.toLocaleString()}/mo
                </span>
              )}
              <span>Last delivery {formatDate(lastDelivery)}</span>
              <span className={isDark ? "text-[#4a4030]" : "text-gray-300"}>·</span>
              <span>Next promise {formatDate(nextPromise)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <button onClick={onEdit} className={`${btnBase} ${btnSecondary}`}>
              Edit
            </button>
            <button onClick={onQuickNote} className={`${btnBase} ${btnSecondary}`}>
              Quick Note
            </button>
            <button onClick={onNewRequest} className={`${btnBase} ${btnSecondary}`}>
              New Request
            </button>
            <button onClick={onOpenWhatsApp} className={`${btnBase} ${btnSecondary}`}>
              Open WhatsApp
            </button>
            <button onClick={onCreateTask} className={`${btnBase} ${btnPrimary}`}>
              Create Task
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
