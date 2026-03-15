"use client";

import { useTheme } from "@/contexts/ThemeContext";

const GROUP_LABEL_CLS = "text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1.5 block";

const STATUS_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "", label: "All", emoji: "" },
  { value: "pending", label: "Pending", emoji: "⏳" },
  { value: "in_progress", label: "In Progress", emoji: "🔄" },
  { value: "completed", label: "Completed", emoji: "✅" },
];

const TYPE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "", label: "All", emoji: "" },
  { value: "task", label: "Task", emoji: "📌" },
  { value: "content", label: "Content", emoji: "📝" },
  { value: "ads", label: "Ads", emoji: "📢" },
  { value: "support", label: "Support", emoji: "🛟" },
];

const SOURCE_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: "", label: "All", emoji: "" },
  { value: "manual", label: "Manual", emoji: "👤" },
  { value: "agent", label: "Agent", emoji: "🤖" },
  { value: "onboarding", label: "Onboarding", emoji: "📋" },
];

export type TaskFilterCounts = {
  status?: Record<string, number>;
  type?: Record<string, number>;
  source?: Record<string, number>;
};

type Props = {
  statusFilter: string;
  typeFilter: string;
  sourceFilter: string;
  onStatusChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onSourceChange: (v: string) => void;
  counts?: TaskFilterCounts;
};

function FilterChip({
  label,
  emoji,
  active,
  isAll,
  count,
  onClick,
  dark,
}: {
  label: string;
  emoji: string;
  active: boolean;
  isAll: boolean;
  count?: number;
  onClick: () => void;
  dark: boolean;
}) {
  const displayLabel = emoji ? `${emoji} ${label}` : label;
  const baseCls = "rounded-lg px-3 py-1.5 text-sm transition-all cursor-pointer active:scale-95 border inline-flex items-center";
  const inactiveCls = dark
    ? "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200"
    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200 hover:text-gray-900";
  const activeAllCls = "bg-blue-500/20 text-blue-300 border-blue-500/30 font-medium shadow-sm ring-1 ring-white/10";
  const activeOtherCls = dark
    ? "bg-white/15 text-white border-white/20 font-medium shadow-sm ring-1 ring-white/10"
    : "bg-blue-100 text-blue-800 border-blue-200 font-medium shadow-sm ring-1 ring-blue-200/50";

  let chipCls = baseCls + " ";
  if (active) {
    chipCls += isAll ? activeAllCls : activeOtherCls;
  } else {
    chipCls += inactiveCls;
  }

  return (
    <button type="button" onClick={onClick} className={chipCls}>
      <span>{displayLabel}</span>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] bg-white/10 dark:bg-white/10 rounded-full px-1.5 ml-1 text-gray-500 dark:text-gray-400">
          {count}
        </span>
      )}
    </button>
  );
}

function FilterGroup({
  label,
  options,
  value,
  onChange,
  counts,
  dark,
}: {
  label: string;
  options: { value: string; label: string; emoji: string }[];
  value: string;
  onChange: (v: string) => void;
  counts?: Record<string, number>;
  dark: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className={GROUP_LABEL_CLS}>{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <FilterChip
            key={opt.value || "all"}
            label={opt.label}
            emoji={opt.emoji}
            active={value === opt.value}
            isAll={opt.value === ""}
            count={counts?.[opt.value]}
            onClick={() => onChange(opt.value)}
            dark={dark}
          />
        ))}
      </div>
    </div>
  );
}

export function TaskFilters({
  statusFilter,
  typeFilter,
  sourceFilter,
  onStatusChange,
  onTypeChange,
  onSourceChange,
  counts,
}: Props) {
  const { isDark } = useTheme();
  const dark = isDark ?? true;

  const hasActiveFilters =
    statusFilter !== "" || typeFilter !== "" || sourceFilter !== "";

  const clearAll = () => {
    onStatusChange("");
    onTypeChange("");
    onSourceChange("");
  };

  const activeLabels: string[] = [];
  if (statusFilter) {
    const opt = STATUS_OPTIONS.find((o) => o.value === statusFilter);
    activeLabels.push(opt?.label ?? statusFilter);
  }
  if (typeFilter) {
    const opt = TYPE_OPTIONS.find((o) => o.value === typeFilter);
    activeLabels.push(opt?.label ?? typeFilter);
  }
  if (sourceFilter) {
    const opt = SOURCE_OPTIONS.find((o) => o.value === sourceFilter);
    activeLabels.push(opt?.label ?? sourceFilter);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <FilterGroup
          label="STATUS"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={onStatusChange}
          counts={counts?.status}
          dark={dark}
        />
        <div
          className={`hidden sm:block w-px h-8 shrink-0 ${dark ? "bg-white/10" : "bg-gray-300"}`}
          aria-hidden
        />
        <FilterGroup
          label="TYPE"
          options={TYPE_OPTIONS}
          value={typeFilter}
          onChange={onTypeChange}
          counts={counts?.type}
          dark={dark}
        />
        <div
          className={`hidden sm:block w-px h-8 shrink-0 ${dark ? "bg-white/10" : "bg-gray-300"}`}
          aria-hidden
        />
        <FilterGroup
          label="SOURCE"
          options={SOURCE_OPTIONS}
          value={sourceFilter}
          onChange={onSourceChange}
          counts={counts?.source}
          dark={dark}
        />
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">
            Filtering: {activeLabels.join(" + ")}
          </span>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gray-400 hover:text-gray-200 dark:hover:text-white underline underline-offset-2 transition-colors"
          >
            ✕ Clear all
          </button>
        </div>
      )}
    </div>
  );
}
