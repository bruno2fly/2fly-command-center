"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { toast } from "sonner";

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "📸 Instagram" },
  { value: "facebook", label: "📘 Facebook" },
  { value: "tiktok", label: "🎵 TikTok" },
  { value: "google", label: "🔍 Google" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "post", label: "Post" },
  { value: "carousel", label: "Carousel" },
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
  { value: "video", label: "Video" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
];

export interface CreateContentModalProps {
  clientId: string;
  defaultStatus?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateContentModal({ clientId, defaultStatus = "draft", onClose, onSuccess }: CreateContentModalProps) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [contentType, setContentType] = useState("post");
  const [status, setStatus] = useState(defaultStatus);
  const [scheduledDate, setScheduledDate] = useState("");
  const [caption, setCaption] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setStatus(defaultStatus);
  }, [defaultStatus]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const modalBg = isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-white border-gray-200";
  const inputCls = isDark
    ? "bg-[#141414] border-[#2a2520] text-[#e8e4dc] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";
  const labelCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      await api.createContent({
        clientId,
        title: trimmed,
        platform,
        contentType,
        status,
        scheduledDate: scheduledDate ? `${scheduledDate}T00:00:00.000Z` : undefined,
        caption: caption.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("✅ Content added");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add content");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-content-title"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className={`max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-xl border shadow-xl ${modalBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-[#2a2520]/50 bg-inherit">
            <h2 id="create-content-title" className={`text-lg font-semibold ${textCls}`}>
              Add Content
            </h2>
            <button type="button" onClick={onClose} className={`p-2 rounded-lg ${labelCls} hover:opacity-80`} aria-label="Close">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label htmlFor="create-content-title-input" className={`block text-sm font-medium ${labelCls} mb-1`}>
                Title *
              </label>
              <input
                id="create-content-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Content title"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="create-content-platform" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Platform
                </label>
                <select
                  id="create-content-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                >
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-content-type" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Content Type
                </label>
                <select
                  id="create-content-type"
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                >
                  {CONTENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="create-content-status" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Status
                </label>
                <select
                  id="create-content-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="create-content-scheduled" className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>
                  Scheduled Date
                </label>
                <input
                  id="create-content-scheduled"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="create-content-caption" className={`block text-sm font-medium ${labelCls} mb-1`}>
                Caption
              </label>
              <textarea
                id="create-content-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Post caption"
                rows={3}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm resize-y ${inputCls}`}
              />
            </div>

            <div>
              <label htmlFor="create-content-notes" className={`block text-sm font-medium ${labelCls} mb-1`}>
                Notes
              </label>
              <textarea
                id="create-content-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes"
                rows={2}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm resize-y ${inputCls}`}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${labelCls} hover:opacity-80`}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !title.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? "Adding…" : "Add Content ✅"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
