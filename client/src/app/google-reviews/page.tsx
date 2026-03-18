"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Client {
  id: string;
  name: string;
}

interface ConnectionStatus {
  connected: boolean;
  status: string;
  accountEmail?: string;
  locationId?: string;
  locationName?: string;
}

interface Location {
  locationId: string;
  locationName: string;
  address: string;
}

interface Review {
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: string;
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

const STAR_RATINGS: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

function Stars({ rating }: { rating: string | number }) {
  const num = typeof rating === "number" ? rating : STAR_RATINGS[rating] || 0;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= num ? "text-amber-400" : "text-gray-600"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function GoogleReviewsPage() {
  const { isDark } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // Fetch clients
  useEffect(() => {
    fetch(`${API}/api/agent-tools/clients`)
      .then((r) => r.json())
      .then((d) => setClients(d.clients || []))
      .catch(() => {});
  }, []);

  // Fetch connection status when client changes
  const fetchStatus = useCallback(async (clientId: string) => {
    if (!clientId) {
      setConnStatus(null);
      return;
    }
    try {
      const r = await fetch(`${API}/api/agent-tools/google/status/${clientId}`);
      const data = await r.json();
      setConnStatus(data);
    } catch {
      setConnStatus(null);
    }
  }, []);

  useEffect(() => {
    setConnStatus(null);
    setLocations([]);
    setReviews([]);
    if (selectedClientId) fetchStatus(selectedClientId);
  }, [selectedClientId, fetchStatus]);

  // Fetch locations when connected but no location selected
  useEffect(() => {
    if (!connStatus?.connected || connStatus.locationId || !selectedClientId) return;
    fetch(`${API}/api/agent-tools/google/locations/${selectedClientId}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []))
      .catch(() => {});
  }, [connStatus, selectedClientId]);

  // Fetch reviews when connected + location selected
  useEffect(() => {
    if (!connStatus?.connected || !connStatus.locationId || !selectedClientId) return;
    setLoading(true);
    fetch(`${API}/api/agent-tools/google/reviews/${selectedClientId}`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || []);
        setAvgRating(d.averageRating || 0);
        setTotalCount(d.totalReviewCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [connStatus, selectedClientId]);

  const handleConnect = async () => {
    if (!selectedClientId) return;
    try {
      const r = await fetch(`${API}/api/agent-tools/google/auth-url?clientId=${selectedClientId}`);
      const data = await r.json();
      if (data.url) window.open(data.url, "_blank");
    } catch {
      // handled
    }
  };

  const handleDisconnect = async () => {
    if (!selectedClientId) return;
    await fetch(`${API}/api/agent-tools/google/disconnect/${selectedClientId}`, { method: "POST" });
    fetchStatus(selectedClientId);
  };

  const handleSelectLocation = async (loc: Location) => {
    await fetch(`${API}/api/agent-tools/google/select-location/${selectedClientId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: loc.locationId, locationName: loc.locationName }),
    });
    fetchStatus(selectedClientId);
  };

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await fetch(`${API}/api/agent-tools/google/reviews/${selectedClientId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, comment: replyText }),
      });
      setReplyingTo(null);
      setReplyText("");
      // Refresh reviews
      const r = await fetch(`${API}/api/agent-tools/google/reviews/${selectedClientId}`);
      const d = await r.json();
      setReviews(d.reviews || []);
    } catch {
      // handled
    } finally {
      setSubmittingReply(false);
    }
  };

  const cardBg = isDark ? "bg-[#0d0d12] border border-white/5" : "bg-white border border-gray-200 shadow-sm";
  const subtleText = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-[#06060a] text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Google Reviews</h1>
        </div>

        {/* Client selector + status */}
        <div className={`rounded-xl p-5 ${cardBg}`}>
          <div className="flex items-center gap-4 flex-wrap">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                isDark
                  ? "bg-white/5 border border-white/10 text-gray-200"
                  : "bg-gray-50 border border-gray-300 text-gray-900"
              }`}
            >
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {selectedClientId && connStatus && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-sm">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      connStatus.connected ? "bg-emerald-500" : "bg-gray-500"
                    }`}
                  />
                  {connStatus.connected
                    ? `Connected${connStatus.accountEmail ? ` · ${connStatus.accountEmail}` : ""}`
                    : "Not connected"}
                </span>
                {connStatus.connected ? (
                  <button
                    onClick={handleDisconnect}
                    className={`text-xs px-3 py-1 rounded-lg ${
                      isDark
                        ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                        : "bg-red-50 text-red-500 hover:bg-red-100"
                    }`}
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                      isDark
                        ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                        : "bg-blue-600 text-white hover:bg-blue-500"
                    }`}
                  >
                    Connect Google Business
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Location info */}
          {connStatus?.connected && connStatus.locationName && (
            <p className={`mt-3 text-sm ${subtleText}`}>
              Location: <span className={isDark ? "text-gray-200" : "text-gray-800"}>{connStatus.locationName}</span>
            </p>
          )}
        </div>

        {/* Location picker */}
        {connStatus?.connected && !connStatus.locationId && locations.length > 0 && (
          <div className={`rounded-xl p-5 ${cardBg}`}>
            <h2 className="text-lg font-semibold mb-3">Select a Location</h2>
            <div className="space-y-2">
              {locations.map((loc) => (
                <button
                  key={loc.locationId}
                  onClick={() => handleSelectLocation(loc)}
                  className={`w-full text-left rounded-lg p-3 transition-colors ${
                    isDark
                      ? "hover:bg-white/5 border border-white/5"
                      : "hover:bg-gray-50 border border-gray-200"
                  }`}
                >
                  <p className="font-medium">{loc.locationName}</p>
                  {loc.address && <p className={`text-sm ${subtleText}`}>{loc.address}</p>}
                </button>
              ))}
            </div>
          </div>
        )}

        {connStatus?.connected && !connStatus.locationId && locations.length === 0 && (
          <div className={`rounded-xl p-5 text-center ${cardBg}`}>
            <p className={subtleText}>No locations found. Make sure the Google account has a Business Profile.</p>
          </div>
        )}

        {/* Reviews section */}
        {connStatus?.connected && connStatus.locationId && (
          <>
            {/* Stats bar */}
            <div className={`rounded-xl p-5 flex items-center gap-6 ${cardBg}`}>
              <div className="flex items-center gap-2">
                <Stars rating={Math.round(avgRating)} />
                <span className="text-lg font-bold">{avgRating.toFixed(1)}</span>
              </div>
              <span className={`text-sm ${subtleText}`}>{totalCount} reviews</span>
            </div>

            {/* Reviews list */}
            {loading ? (
              <div className={`rounded-xl p-8 text-center ${cardBg}`}>
                <p className={subtleText}>Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className={`rounded-xl p-8 text-center ${cardBg}`}>
                <p className={subtleText}>No reviews found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews
                  .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
                  .map((review) => (
                    <div key={review.reviewId} className={`rounded-xl p-5 ${cardBg}`}>
                      <div className="flex items-start gap-3">
                        {review.reviewer.profilePhotoUrl ? (
                          <img
                            src={review.reviewer.profilePhotoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                              isDark ? "bg-white/10 text-gray-300" : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {review.reviewer.displayName?.charAt(0) || "?"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{review.reviewer.displayName}</span>
                            <Stars rating={review.starRating} />
                            <span className={`text-xs ${subtleText}`}>{timeAgo(review.createTime)}</span>
                          </div>
                          {review.comment && (
                            <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                              {review.comment}
                            </p>
                          )}

                          {/* Reply section */}
                          {review.reviewReply ? (
                            <div
                              className={`mt-3 p-3 rounded-lg text-sm ${
                                isDark ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100"
                              }`}
                            >
                              <p className={`text-xs font-medium mb-1 ${subtleText}`}>
                                Owner reply · {timeAgo(review.reviewReply.updateTime)}
                              </p>
                              <p className={isDark ? "text-gray-300" : "text-gray-700"}>
                                {review.reviewReply.comment}
                              </p>
                            </div>
                          ) : replyingTo === review.reviewId ? (
                            <div className="mt-3 space-y-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                rows={3}
                                placeholder="Write your reply..."
                                className={`w-full rounded-lg px-3 py-2 text-sm resize-none ${
                                  isDark
                                    ? "bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500"
                                    : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"
                                }`}
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReply(review.reviewId)}
                                  disabled={submittingReply || !replyText.trim()}
                                  className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${
                                    isDark
                                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                      : "bg-emerald-600 text-white hover:bg-emerald-500"
                                  }`}
                                >
                                  {submittingReply ? "Sending..." : "Send Reply"}
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                  className={`text-xs px-3 py-1.5 rounded-lg ${
                                    isDark
                                      ? "text-gray-400 hover:bg-white/5"
                                      : "text-gray-500 hover:bg-gray-100"
                                  }`}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => setReplyingTo(review.reviewId)}
                              className={`mt-2 text-xs px-3 py-1 rounded-lg ${
                                isDark
                                  ? "text-blue-400 hover:bg-blue-500/10"
                                  : "text-blue-600 hover:bg-blue-50"
                              }`}
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!selectedClientId && (
          <div className={`rounded-xl p-12 text-center ${cardBg}`}>
            <p className={`text-lg ${subtleText}`}>Select a client to view Google reviews</p>
          </div>
        )}
      </div>
    </div>
  );
}
