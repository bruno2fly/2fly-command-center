"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "";

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
  food: "🍽️", ambient: "🏠", events: "🎉", desserts: "🍰", soups: "🫕", salads: "🥗", owner: "👤",
};

export function ClientMediaLibrary({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lightboxId, setLightboxId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [enhancing, setEnhancing] = useState<string | null>(null);
  const [enhancePrompt, setEnhancePrompt] = useState("Compose these two photos into one cohesive, professional Instagram post. Use the ambient/restaurant background photo to establish the real venue atmosphere and lighting. Place the food naturally within that real environment. Enhance with warm golden tones, cinematic moody lighting. Keep everything realistic — this is the actual restaurant. No fake elements.");
  const [showEnhanceModal, setShowEnhanceModal] = useState(false);
  const [enhanceTarget, setEnhanceTarget] = useState<MediaItem | null>(null);
  const [ambientTarget, setAmbientTarget] = useState<MediaItem | null>(null);
  const [selectingAmbient, setSelectingAmbient] = useState(false);
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

  const enhanceMedia = useCallback(async (item: MediaItem, prompt: string, ambient?: MediaItem | null) => {
    setEnhancing(item.id);
    try {
      const body: any = {
        imagePath: `/Users/brunolima/Projects/2fly-command-center/server/uploads/${clientId}/${item.url.split('/').pop()}`,
        prompt,
        clientId,
        mediaId: item.id,
      };
      if (ambient) {
        body.ambientPath = `/Users/brunolima/Projects/2fly-command-center/server/uploads/${clientId}/${ambient.url.split('/').pop()}`;
      }
      const res = await fetch(`${API}/api/gemini/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        fetchMedia();
        alert(`✨ Enhanced! New image saved to library.`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch { alert("Enhancement failed"); }
    finally { setEnhancing(null); setShowEnhanceModal(false); setEnhanceTarget(null); setAmbientTarget(null); }
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
        {(["all", ...Array.from(new Set(media.map(m => m.category))).sort()] as string[]).map(f => (
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
                onClick={() => { setSelectedId(selectedId === m.id ? null : m.id); setLightboxId(m.id); }}
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
                {/* Enhance button */}
                {m.mimeType.startsWith("image") && (
                  <button onClick={e => { e.stopPropagation(); setEnhanceTarget(m); setShowEnhanceModal(true); }}
                    className="absolute top-1 left-1 w-6 h-6 rounded-full bg-purple-500/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="✨ Enhance with AI">
                    {enhancing === m.id ? "⏳" : "✨"}
                  </button>
                )}
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

      {/* Enhance Modal */}
      {showEnhanceModal && enhanceTarget && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-xl shadow-2xl ${isDark ? "bg-[#0e0e14] border border-[#1a1820]" : "bg-white"}`}>
            <h3 className={`text-base font-bold mb-1 ${textCls}`}>✨ AI Scene Composer</h3>

            {/* Food image (required) */}
            <div className="mb-3">
              <p className={`text-xs font-medium mb-1 ${subCls}`}>🍽️ Food / Subject photo</p>
              <div className="flex items-center gap-3">
                <img src={`${API}${enhanceTarget.url}`} alt="" className="w-16 h-16 rounded-lg object-cover" />
                <p className={`text-xs ${textCls}`}>{enhanceTarget.filename}</p>
              </div>
            </div>

            {/* Ambient image (optional) */}
            <div className="mb-3">
              <p className={`text-xs font-medium mb-1 ${subCls}`}>🏠 Ambient / Background photo (optional but recommended)</p>
              {ambientTarget ? (
                <div className="flex items-center gap-3">
                  <img src={`${API}${ambientTarget.url}`} alt="" className="w-16 h-16 rounded-lg object-cover" />
                  <div>
                    <p className={`text-xs ${textCls}`}>{ambientTarget.filename}</p>
                    <button onClick={() => setAmbientTarget(null)} className="text-xs text-red-400 mt-0.5">Remove</button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className={`text-xs ${subCls} mb-1`}>Pick an ambient photo from your library:</p>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {media.filter(m => m.category === 'ambient' && m.mimeType.startsWith('image')).map(m => (
                      <img key={m.id} src={`${API}${m.url}`} alt={m.filename}
                        onClick={() => setAmbientTarget(m)}
                        className="w-12 h-12 rounded-lg object-cover cursor-pointer hover:ring-2 ring-purple-500 transition-all"
                        title={m.filename} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Prompt */}
            <label className={`text-xs font-medium ${subCls}`}>Style Prompt</label>
            <textarea
              value={enhancePrompt}
              onChange={e => setEnhancePrompt(e.target.value)}
              rows={4}
              className={`w-full mt-1 mb-4 p-3 rounded-lg text-xs border resize-none ${isDark ? "bg-[#08080c] border-[#1a1820] text-[#c8b89a]" : "bg-gray-50 border-gray-200 text-gray-800"}`}
            />
            <div className="flex gap-2">
              <button
                onClick={() => enhanceMedia(enhanceTarget, enhancePrompt, ambientTarget)}
                disabled={!!enhancing}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50">
                {enhancing ? "⏳ Composing..." : "✨ Compose with Gemini"}
              </button>
              <button
                onClick={() => { setShowEnhanceModal(false); setEnhanceTarget(null); setAmbientTarget(null); }}
                className={`px-4 py-2 rounded-lg text-sm ${isDark ? "bg-[#1a1820] text-[#8a7e6d]" : "bg-gray-100 text-gray-600"}`}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox */}
      {lightboxId && (() => {
        const item = media.find(m => m.id === lightboxId);
        if (!item) return null;
        const ST_PETE_PROMPT = `You are composing a professional Instagram post for Cafe St. Petersburg, a cozy Eastern European restaurant in Boston.
Style: Warm, cinematic, moody. Golden candlelight tones, soft shadows, luxurious atmosphere.
Use the real restaurant interior as the actual background.
Place the food naturally on a table in that real restaurant. Keep everything realistic — real restaurant, real food.
Output: Single square image (1:1), Instagram-ready, no text overlays.`;
        return (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
            onClick={() => setLightboxId(null)}>
            <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
              {item.mimeType.startsWith('image') && (
                <img src={`${API}${item.url}`} alt={item.filename} className="w-full rounded-2xl shadow-2xl" />
              )}
              <div className="mt-3 flex gap-2 flex-wrap">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${API}${item.url}`);
                      const blob = await res.blob();
                      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                      alert('📋 Image copied! Paste into Gemini website.');
                    } catch { alert('Copy failed — try right-click → Copy Image instead.'); }
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white">
                  📋 Copy Image
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(ST_PETE_PROMPT); alert('📋 Prompt copied!'); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white">
                  📝 Copy Prompt
                </button>
                <button
                  onClick={() => { setEnhanceTarget(item); setShowEnhanceModal(true); setLightboxId(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white">
                  ✨ Compose with AI
                </button>
                <button onClick={() => setLightboxId(null)}
                  className="px-4 py-2 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white">
                  ✕ Close
                </button>
              </div>
              <p className="text-white/60 text-xs mt-2">{item.filename} · {formatSize(item.size)}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
