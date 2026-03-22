"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface MediaItem {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  tags: string | null;
  notes: string | null;
  category: string;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORY_EMOJI: Record<string, string> = {
  photo: "📸", video: "🎬", graphic: "🎨", logo: "✨", other: "📎",
};

export function ClientMediaLibrary({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchMedia = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/media/${clientId}`);
      const data = await res.json();
      setMedia(data.media || []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [clientId]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const form = new FormData();
      Array.from(files).forEach(f => form.append("files", f));
      const res = await fetch(`${API}/api/media/${clientId}`, { method: "POST", body: form });
      const data = await res.json();
      if (data.success) {
        fetchMedia();
      } else {
        alert(data.error || "Upload failed");
      }
    } catch { alert("Upload failed"); }
    finally { setUploading(false); }
  }, [clientId, fetchMedia]);

  const deleteMedia = useCallback(async (id: string) => {
    if (!confirm("Delete this file?")) return;
    try {
      await fetch(`${API}/api/media/${clientId}/${id}`, { method: "DELETE" });
      setMedia(m => m.filter(i => i.id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch { /* */ }
  }, [clientId, selectedId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const cardCls = isDark ? "bg-[#0f0f14] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";
  const subCls = isDark ? "text-[#8a7e6d]" : "text-gray-500";

  const filtered = filter === "all" ? media : media.filter(m => m.category === filter);
  const selected = media.find(m => m.id === selectedId);

  const counts: Record<string, number> = { all: media.length };
  media.forEach(m => { counts[m.category] = (counts[m.category] || 0) + 1; });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? "border-[#1a1810]" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <h3 className={`text-sm font-semibold ${textCls}`}>📁 Media Library</h3>
          <span className={`text-xs ${subCls}`}>{media.length} files</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium ${isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}>
            📤 Upload
          </button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden"
            onChange={e => e.target.files && uploadFiles(e.target.files)} />
        </div>
      </div>

      {/* Filter */}
      <div className={`flex gap-1 px-4 py-2 ${isDark ? "bg-[#08080c]" : "bg-gray-50"}`}>
        {["all", "photo", "video", "graphic"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs font-medium px-2.5 py-1 rounded-lg ${
              filter === f
                ? isDark ? "bg-emerald-500/20 text-emerald-400" : "bg-blue-100 text-blue-700"
                : isDark ? "text-[#5a5040]" : "text-gray-500"
            }`}>
            {f === "all" ? "All" : `${CATEGORY_EMOJI[f] || ""} ${f}`} ({counts[f] || 0})
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Upload zone when empty or dragging */}
        {(media.length === 0 || dragOver) && (
          <div className={`border-2 border-dashed rounded-xl p-8 text-center mb-4 transition-colors ${
            dragOver
              ? isDark ? "border-emerald-500 bg-emerald-500/10" : "border-emerald-400 bg-emerald-50"
              : isDark ? "border-[#1a1810]" : "border-gray-200"
          }`}>
            {uploading ? (
              <div className={`text-sm ${subCls}`}>⏳ Uploading...</div>
            ) : (
              <>
                <div className="text-3xl mb-2">📸</div>
                <p className={`text-sm font-medium ${textCls}`}>Drop photos here or click Upload</p>
                <p className={`text-xs mt-1 ${subCls}`}>Supports JPG, PNG, WebP, GIF, MP4 — up to 50MB each</p>
              </>
            )}
          </div>
        )}

        {/* Grid */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
            {filtered.map(m => (
              <div key={m.id}
                onClick={() => setSelectedId(selectedId === m.id ? null : m.id)}
                className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all ${cardCls} ${
                  selectedId === m.id ? "ring-2 ring-emerald-500" : ""
                }`}>
                {m.mimeType.startsWith("image") ? (
                  <img src={`${API}${m.url}`} alt={m.filename} className="w-full aspect-square object-cover" loading="lazy" />
                ) : m.mimeType.startsWith("video") ? (
                  <div className="w-full aspect-square bg-black flex items-center justify-center">
                    <span className="text-3xl">🎬</span>
                  </div>
                ) : (
                  <div className={`w-full aspect-square flex items-center justify-center ${isDark ? "bg-[#0a0a0e]" : "bg-gray-100"}`}>
                    <span className="text-3xl">📎</span>
                  </div>
                )}
                {/* Overlay */}
                <div className={`absolute inset-x-0 bottom-0 px-2 py-1.5 ${isDark ? "bg-black/70" : "bg-white/80"}`}>
                  <div className={`text-xs font-medium truncate ${textCls}`}>{m.filename}</div>
                  <div className={`text-[10px] ${subCls}`}>{formatSize(m.size)}</div>
                </div>
                {/* Delete button */}
                <button onClick={e => { e.stopPropagation(); deleteMedia(m.id); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {loading && <div className={`text-center py-8 ${subCls}`}>Loading...</div>}
      </div>
    </div>
  );
}
