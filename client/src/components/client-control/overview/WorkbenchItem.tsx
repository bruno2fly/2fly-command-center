"use client";

import { useTheme } from "@/contexts/ThemeContext";

type Props = {
  id: string;
  title: string;
  assignee?: string;
  source?: string;
  status: string;
  dueAt: string | null;
  priority?: "high" | "medium" | "low";
  kind?: "task" | "request" | "approval";
  onApprove?: () => void;
  onReminder?: () => void;
  onEdit?: () => void;
  onChat?: () => void;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function WorkbenchItem({
  title,
  assignee,
  source,
  status,
  dueAt,
  priority = "medium",
  kind = "task",
  onApprove,
  onReminder,
  onEdit,
  onChat,
}: Props) {
  const { isDark } = useTheme();

  const statusLabel =
    status === "in_progress"
      ? "In Progress"
      : status === "in_review"
        ? "Review"
        : status === "todo"
          ? "To Do"
          : status === "new"
            ? "New"
            : status;

  const statusCls =
    status === "in_progress" || status === "in_review"
      ? isDark
        ? "bg-blue-500/20 text-blue-400"
        : "bg-blue-100 text-blue-700"
      : status === "todo" || status === "new"
        ? isDark
          ? "bg-amber-500/20 text-amber-400"
          : "bg-amber-100 text-amber-700"
        : isDark
          ? "bg-[#1a1810] text-[#8a7e6d]"
          : "bg-gray-100 text-gray-600";

  const cardCls = isDark
    ? "bg-[#0a0a0e] border-[#1a1810] hover:border-[#2a2018] hover:bg-[#0c0c10]"
    : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const metaCls = isDark ? "text-[#5a5040]" : "text-gray-500";
  const btnCls = isDark
    ? "text-[#8a7e6d] hover:text-emerald-400 hover:bg-emerald-500/10"
    : "text-gray-500 hover:text-blue-600 hover:bg-blue-50";

  const avatarCls = isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-100 text-emerald-700";

  return (
    <div
      className={`rounded-lg border p-3 transition-all cursor-pointer ${cardCls}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium truncate ${textCls}`}>{title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {assignee && (
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium ${avatarCls}`}
                title={assignee}
              >
                {getInitials(assignee)}
              </span>
            )}
            <span className={`text-[10px] ${metaCls}`}>
              {source ?? "Task"} · Due {formatDate(dueAt)}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${statusCls}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
      <div
        className={`flex items-center gap-1 mt-2 pt-2 border-t ${
          isDark ? "border-[#1a1810]" : "border-gray-100"
        }`}
      >
        {kind === "approval" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onApprove?.();
            }}
            className={`px-2 py-1 rounded text-[10px] font-medium ${btnCls}`}
          >
            Approve
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onReminder?.();
          }}
          className={`px-2 py-1 rounded text-[10px] font-medium ${btnCls}`}
        >
          Remind
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit?.();
          }}
          className={`px-2 py-1 rounded text-[10px] font-medium ${btnCls}`}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChat?.();
          }}
          className={`px-2 py-1 rounded text-[10px] font-medium ${btnCls}`}
        >
          Chat
        </button>
      </div>
    </div>
  );
}
