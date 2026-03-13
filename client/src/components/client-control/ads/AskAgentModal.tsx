"use client";

import { useState } from "react";
import { useTheme } from "@/contexts/ThemeContext";

export type AskAgentModalProps = {
  campaignName: string;
  metrics: { spend: number; leads: number; ctr: number; cpc: number };
  onConfirm: (focusText: string) => void;
  onClose: () => void;
};

export function AskAgentModal({ campaignName, metrics, onConfirm, onClose }: AskAgentModalProps) {
  const { isDark } = useTheme();
  const [focusText, setFocusText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const modalCls = isDark ? "bg-[#0a0a0e] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";
  const mutedCls = isDark ? "text-[#8a7e6d]" : "text-gray-600";
  const inputCls = isDark
    ? "bg-[#141414] border-[#2a2520] text-[#e8e4dc] focus:border-blue-500/50"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500";
  const cardCls = isDark ? "bg-[#141414] border-[#2a2520]" : "bg-gray-50 border-gray-200";

  const handleSubmit = () => {
    setSubmitting(true);
    onConfirm(focusText.trim());
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-w-md w-full rounded-xl border p-6 shadow-xl ${modalCls}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-lg font-semibold mb-1 ${textCls}`}>Ask Agent to Optimize</h3>
        <p className={`text-sm mb-4 ${mutedCls}`}>{campaignName}</p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className={`rounded-lg border px-3 py-2 ${cardCls}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Spend</p>
            <p className={`text-sm font-medium ${textCls}`}>${metrics.spend.toLocaleString()}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${cardCls}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Leads</p>
            <p className={`text-sm font-medium ${textCls}`}>{metrics.leads}</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${cardCls}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">CTR</p>
            <p className={`text-sm font-medium ${textCls}`}>{metrics.ctr}%</p>
          </div>
          <div className={`rounded-lg border px-3 py-2 ${cardCls}`}>
            <p className="text-[10px] uppercase tracking-wider text-gray-500">CPC</p>
            <p className={`text-sm font-medium ${textCls}`}>${metrics.cpc}</p>
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="ask-agent-focus" className={`block text-xs font-medium ${mutedCls} mb-1`}>
            What should the agent focus on?
          </label>
          <textarea
            id="ask-agent-focus"
            value={focusText}
            onChange={(e) => setFocusText(e.target.value)}
            placeholder="e.g., Improve CTR, reduce CPC, test new audiences..."
            rows={3}
            className={`w-full rounded-lg border px-3 py-2 text-sm ${inputCls}`}
          />
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
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Ask Agent 🤖
          </button>
        </div>
      </div>
    </div>
  );
}
