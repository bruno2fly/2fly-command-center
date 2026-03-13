"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { api, type ApiContentItem } from "@/lib/api";
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
  { value: "cancelled", label: "Cancelled" },
];

export interface EditContentModalProps {
  item: ApiContentItem;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditContentModal({ item, onClose, onSuccess }: EditContentModalProps) {
  const { isDark } = useTheme();
  const [title, setTitle] = useState(item.title);
  const [platform, setPlatform] = useState(item.platform || "instagram");
  const [contentType, setContentType] = useState(item.contentType || item.type || "post");
  const [status, setStatus] = useState(item.status || "draft");
  const [scheduledDate, setScheduledDate] = useState(
    item.scheduledDate ? String(item.scheduledDate).slice(0, 10) : ""
  );
  const [caption, setCaption] = useState(item.caption ?? "");
  const [notes, setNotes] = useState((item as { notes?: string | null }).notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setTitle(item.title);
    setPlatform(item.platform || "instagram");
    setContentType(item.contentType || item.type || "post");
    setStatus(item.status || "draft");
    setScheduledDate(item.scheduledDate ? String(item.scheduledDate).slice(0, 10) : "");
    setCaption(item.caption ?? "");
    setNotes((item as { notes?: string | null }).notes ?? "");
  }, [item.id, item.title, item.platform, item.contentType, item.type, item.status, item.scheduledDate, item.caption, (item as { notes?: string | null }).notes]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose, showDeleteConfirm]);

  const modalBg = isDark ? "bg-[#0d0d0f] border-[#1a1810]" : "bg-white border-gray-200";
  const inputCls = isDark
    ? "bg-[#141414] border-[#2a2520] text-[#e8e4dc] focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30"
    : "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";
  const labelCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";
  const textCls = isDark ? "text-[#e8e4dc]" : "text-gray-900";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Title is required");
      return;
    }
    setSubmitting(true);
    try {
      await api.updateContent(item.id, {
        title: trimmed,
        platform,
        contentType,
        status,
        scheduledDate: scheduledDate ? `${scheduledDate}T00:00:00.000Z` : undefined,
        caption: caption.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("✅ Updated");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteContent(item.id);
      toast.success("Content deleted");
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={() => !showDeleteConfirm && onClose()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-content-title"
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
            <h2 id="edit-content-title" className={`text-lg font-semibold ${textCls}`}>
              Edit Content
            </h2>
            <button type="button" onClick={onClose} className={`p-2 rounded-lg ${labelCls} hover:opacity-80`} aria-label="Close">
              ✕
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            <div>
              <label htmlFor="edit-content-title-input" className={`block text-sm font-medium ${labelCls} mb-1`}>
                Title
              </label>
              <input
                id="edit-content-title-input"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm ${inputCls}`}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>Platform</label>
                <select value={platform} onChange={(e) => setPlatform(e.target.value)} className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}>
                  {PLATFORM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>Type</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}>
                  {CONTENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}>
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={`block text-[10px] font-semibold uppercase tracking-wider ${labelCls} mb-1`}>Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className={`w-full rounded-lg border px-2.5 py-2 text-sm ${inputCls}`}
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelCls} mb-1`}>Caption</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm resize-y ${inputCls}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium ${labelCls} mb-1`}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm resize-y ${inputCls}`}
              />
            </div>

            <div className="flex justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
              >
                Delete 🗑
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${labelCls} hover:opacity-80`}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !title.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? "Saving…" : "Save Changes ✅"}
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className={`max-w-sm w-full rounded-xl border p-6 ${modalBg}`} onClick={(e) => e.stopPropagation()}>
            <p className={`font-semibold ${textCls} mb-2`}>Delete this content?</p>
            <p className={`text-sm ${labelCls} mb-4`}>This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className={`px-4 py-2 rounded-lg ${labelCls} hover:opacity-80`}>
                Cancel
              </button>
              <button type="button" onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
