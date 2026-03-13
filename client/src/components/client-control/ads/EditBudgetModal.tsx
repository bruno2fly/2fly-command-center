"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export type EditBudgetModalProps = {
  campaignName: string;
  currentBudget: number;
  onConfirm: (newBudget: number) => void;
  onClose: () => void;
};

export function EditBudgetModal({ campaignName, currentBudget, onConfirm, onClose }: EditBudgetModalProps) {
  const { isDark } = useTheme();
  const [value, setValue] = useState(String(currentBudget));
  const num = parseFloat(value) || 0;
  const pctChange = currentBudget > 0 ? ((num - currentBudget) / currentBudget) * 100 : 0;
  const over30 = Math.abs(pctChange) > 30;
  const modalCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const inputCls = isDark ? "bg-[#141414] border-[#2a2520] text-[#e8e4dc]" : "bg-gray-50 border-gray-200 text-gray-900";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#8a7e6d]" : "text-gray-600";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className={`max-w-sm w-full rounded-xl border p-6 shadow-xl ${modalCls}`} onClick={(e) => e.stopPropagation()}>
        <h3 className={`text-lg font-semibold mb-2 ${textCls}`}>Edit Budget</h3>
        <p className={`text-sm mb-4 ${mutedCls}`}>{campaignName}</p>
        <div className="space-y-2 mb-2">
          <label className={`text-xs ${mutedCls}`}>Current daily budget</label>
          <p className="font-medium">${currentBudget}/day</p>
        </div>
        <div className="space-y-2 mb-4">
          <label className={`text-xs ${mutedCls}`}>New daily budget ($)</label>
          <input
            type="number"
            min="0"
            step="1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={`w-full rounded-lg border px-3 py-2 ${inputCls}`}
          />
          {currentBudget > 0 && !Number.isNaN(num) && (
            <p className={`text-xs ${pctChange >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              This is a {pctChange >= 0 ? "" : ""} {Math.abs(pctChange).toFixed(0)}% {num >= currentBudget ? "increase" : "decrease"}.
            </p>
          )}
          {over30 && (
            <p className="text-xs text-amber-500">
              ⚠️ Budget change exceeds 30% safety limit. Consider a smaller adjustment.
            </p>
          )}
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm ${mutedCls} hover:opacity-80`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => num >= 0 && onConfirm(num)}
            disabled={Number.isNaN(num) || num < 0}
            className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Update Budget
          </button>
        </div>
      </div>
    </div>
  );
}
