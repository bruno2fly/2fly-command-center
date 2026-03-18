"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "@/contexts/ThemeContext";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// ── Types ──

type SubTab = "reviews" | "posts" | "insights" | "qa" | "photos" | "info";

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

interface GbpPost {
  name: string;
  summary?: string;
  topicType?: string;
  createTime?: string;
  updateTime?: string;
  callToAction?: { actionType?: string; url?: string };
  media?: { mediaFormat?: string; googleUrl?: string; sourceUrl?: string }[];
  state?: string;
}

interface Question {
  name: string;
  text: string;
  createTime?: string;
  author?: { displayName?: string };
  topAnswers?: { text: string; createTime?: string; author?: { displayName?: string } }[];
  totalAnswerCount?: number;
}

interface MediaItem {
  name: string;
  mediaFormat?: string;
  googleUrl?: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  locationAssociation?: { category?: string };
  createTime?: string;
}

interface LocationInfo {
  name?: string;
  locationName?: string;
  primaryPhone?: string;
  address?: { addressLines?: string[]; locality?: string; administrativeArea?: string; postalCode?: string; regionCode?: string };
  websiteUrl?: string;
  regularHours?: { periods?: { openDay: string; openTime: string; closeDay: string; closeTime: string }[] };
  primaryCategory?: { displayName?: string; categoryId?: string };
  profile?: { description?: string };
}

// ── Helpers ──

const STAR_RATINGS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function Stars({ rating }: { rating: string | number }) {
  const num = typeof rating === "number" ? rating : STAR_RATINGS[rating] || 0;
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-4 h-4 ${i <= num ? "text-amber-400" : "text-gray-600"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
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

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "reviews", label: "Reviews" },
  { id: "posts", label: "Posts" },
  { id: "insights", label: "Insights" },
  { id: "qa", label: "Q&A" },
  { id: "photos", label: "Photos" },
  { id: "info", label: "Info" },
];

// ── Main Component ──

export function ClientGoogleBusinessTab({ clientId }: { clientId: string }) {
  const { isDark } = useTheme();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("reviews");
  const [connStatus, setConnStatus] = useState<ConnectionStatus | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  const cardBg = isDark ? "bg-[#0d0d12] border border-white/5 rounded-xl" : "bg-white border border-gray-200 shadow-sm rounded-xl";
  const subtleText = isDark ? "text-gray-400" : "text-gray-500";
  const btnPrimary = isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-600 text-white hover:bg-blue-500";
  const btnDanger = isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100";

  const fetchStatus = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/agent-tools/google/status/${clientId}`);
      const data = await r.json();
      setConnStatus(data);
    } catch {
      setConnStatus(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    if (!connStatus?.connected || connStatus.locationId) return;
    fetch(`${API}/api/agent-tools/google/locations/${clientId}`)
      .then((r) => r.json())
      .then((d) => setLocations(d.locations || []))
      .catch(() => {});
  }, [connStatus, clientId]);

  const handleConnect = async () => {
    const r = await fetch(`${API}/api/agent-tools/google/auth-url?clientId=${clientId}`);
    const data = await r.json();
    if (data.url) window.open(data.url, "_blank");
  };

  const handleDisconnect = async () => {
    await fetch(`${API}/api/agent-tools/google/disconnect/${clientId}`, { method: "POST" });
    fetchStatus();
  };

  const handleSelectLocation = async (loc: Location) => {
    await fetch(`${API}/api/agent-tools/google/select-location/${clientId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: loc.locationId, locationName: loc.locationName }),
    });
    fetchStatus();
  };

  if (loading && !connStatus) {
    return <div className={`p-8 text-center ${subtleText}`}>Loading...</div>;
  }

  /* Not Connected */
  if (!connStatus?.connected) {
    return (
      <div className="p-6 space-y-4">
        <div className={`${cardBg} p-8 text-center`}>
          <div className="text-4xl mb-3">🏢</div>
          <h2 className={`text-lg font-semibold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            Connect Google Business Profile
          </h2>
          <p className={`text-sm mb-4 ${subtleText}`}>
            Link this client&apos;s Google Business account to manage reviews, posts, insights, Q&amp;A, photos, and business info.
          </p>
          <button onClick={handleConnect} className={`px-4 py-2 rounded-lg text-sm font-medium ${btnPrimary}`}>
            Connect Google Business
          </button>
        </div>
      </div>
    );
  }

  /* Connected, Pick Location */
  if (!connStatus.locationId) {
    return (
      <div className="p-6 space-y-4">
        <div className={`${cardBg} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                Connected{connStatus.accountEmail ? ` · ${connStatus.accountEmail}` : ""}
              </span>
            </div>
            <button onClick={handleDisconnect} className={`text-xs px-3 py-1 rounded-lg ${btnDanger}`}>Disconnect</button>
          </div>
          <h2 className={`text-lg font-semibold mb-3 ${isDark ? "text-gray-100" : "text-gray-900"}`}>Select a Location</h2>
          {locations.length === 0 ? (
            <p className={`text-sm ${subtleText}`}>No locations found. Make sure the Google account has a Business Profile.</p>
          ) : (
            <div className="space-y-2">
              {locations.map((loc) => (
                <button key={loc.locationId} onClick={() => handleSelectLocation(loc)}
                  className={`w-full text-left rounded-lg p-3 transition-colors ${isDark ? "hover:bg-white/5 border border-white/5" : "hover:bg-gray-50 border border-gray-200"}`}>
                  <p className="font-medium">{loc.locationName}</p>
                  {loc.address && <p className={`text-sm ${subtleText}`}>{loc.address}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Connected + Location → Full Google Business Tab */
  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full">
      {/* Connection bar */}
      <div className={`${cardBg} p-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
            {connStatus.locationName}
            {connStatus.accountEmail ? ` · ${connStatus.accountEmail}` : ""}
          </span>
        </div>
        <button onClick={handleDisconnect} className={`text-xs px-3 py-1 rounded-lg ${btnDanger}`}>Disconnect</button>
      </div>

      {/* Sub-tab pills */}
      <div className="flex gap-2 flex-wrap">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeSubTab === tab.id
                ? isDark
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-blue-100 text-blue-700 border border-blue-200"
                : isDark
                  ? "bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      {activeSubTab === "reviews" && <ReviewsSection clientId={clientId} isDark={isDark} cardBg={cardBg} subtleText={subtleText} />}
      {activeSubTab === "posts" && <PostsSection clientId={clientId} isDark={isDark} cardBg={cardBg} subtleText={subtleText} />}
      {activeSubTab === "insights" && <InsightsSection clientId={clientId} isDark={isDark} cardBg={cardBg} subtleText={subtleText} />}
      {activeSubTab === "qa" && <QASection clientId={clientId} isDark={isDark} cardBg={cardBg} subtleText={subtleText} />}
      {activeSubTab === "photos" && <PhotosSection clientId={clientId} isDark={isDark} cardBg={cardBg} subtleText={subtleText} />}
      {activeSubTab === "info" && <InfoSection clientId={clientId} isDark={isDark} cardBg={cardBg} subtleText={subtleText} />}
    </div>
  );
}

// ── Shared section props ──

interface SectionProps {
  clientId: string;
  isDark: boolean;
  cardBg: string;
  subtleText: string;
}

// ════════════════════════════════════════════
// REVIEWS SUB-TAB (existing functionality)
// ════════════════════════════════════════════

function ReviewsSection({ clientId, isDark, cardBg, subtleText }: SectionProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  const btnSuccess = isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white hover:bg-emerald-500";

  const fetchReviews = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/agent-tools/google/reviews/${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || []);
        setAvgRating(d.averageRating || 0);
        setTotalCount(d.totalReviewCount || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleReply = async (reviewId: string) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await fetch(`${API}/api/agent-tools/google/reviews/${clientId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, comment: replyText }),
      });
      setReplyingTo(null);
      setReplyText("");
      fetchReviews();
    } catch {} finally {
      setSubmittingReply(false);
    }
  };

  if (loading) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>Loading reviews...</p></div>;

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className={`${cardBg} p-5 flex items-center gap-6`}>
        <div className="flex items-center gap-2">
          <Stars rating={Math.round(avgRating)} />
          <span className={`text-xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>{avgRating.toFixed(1)}</span>
        </div>
        <span className={`text-sm ${subtleText}`}>{totalCount} reviews</span>
      </div>

      {reviews.length === 0 ? (
        <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>No reviews found.</p></div>
      ) : (
        reviews
          .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
          .map((review) => (
            <div key={review.reviewId} className={`${cardBg} p-5`}>
              <div className="flex items-start gap-3">
                {review.reviewer.profilePhotoUrl ? (
                  <img src={review.reviewer.profilePhotoUrl} alt="" className="w-10 h-10 rounded-full" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isDark ? "bg-white/10 text-gray-300" : "bg-gray-200 text-gray-600"}`}>
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
                    <p className={`mt-2 text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>{review.comment}</p>
                  )}
                  {review.reviewReply ? (
                    <div className={`mt-3 p-3 rounded-lg text-sm ${isDark ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100"}`}>
                      <p className={`text-xs font-medium mb-1 ${subtleText}`}>Owner reply · {timeAgo(review.reviewReply.updateTime)}</p>
                      <p className={isDark ? "text-gray-300" : "text-gray-700"}>{review.reviewReply.comment}</p>
                    </div>
                  ) : replyingTo === review.reviewId ? (
                    <div className="mt-3 space-y-2">
                      <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} rows={3} placeholder="Write your reply..."
                        className={`w-full rounded-lg px-3 py-2 text-sm resize-none ${isDark ? "bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500" : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"}`} />
                      <div className="flex gap-2">
                        <button onClick={() => handleReply(review.reviewId)} disabled={submittingReply || !replyText.trim()}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${btnSuccess}`}>
                          {submittingReply ? "Sending..." : "Send Reply"}
                        </button>
                        <button onClick={() => { setReplyingTo(null); setReplyText(""); }}
                          className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-gray-100"}`}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setReplyingTo(review.reviewId)}
                      className={`mt-2 text-xs px-3 py-1 rounded-lg ${isDark ? "text-blue-400 hover:bg-blue-500/10" : "text-blue-600 hover:bg-blue-50"}`}>
                      Reply
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// POSTS SUB-TAB
// ════════════════════════════════════════════

const CTA_TYPES = ["BOOK", "ORDER", "LEARN_MORE", "SIGN_UP", "CALL", "GET_OFFER"];
const POST_TYPES = ["STANDARD", "EVENT", "OFFER"];

function PostsSection({ clientId, isDark, cardBg, subtleText }: SectionProps) {
  const [posts, setPosts] = useState<GbpPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [summary, setSummary] = useState("");
  const [topicType, setTopicType] = useState("STANDARD");
  const [ctaType, setCtaType] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const btnPrimary = isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-600 text-white hover:bg-blue-500";
  const btnDanger = isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100";

  const fetchPosts = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/agent-tools/google/posts/${clientId}`)
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const handleCreate = async () => {
    if (!summary.trim()) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { summary, topicType };
      if (ctaType) body.callToAction = { actionType: ctaType, url: ctaUrl || undefined };
      if (imageUrl) body.media = [{ mediaFormat: "PHOTO", sourceUrl: imageUrl }];

      await fetch(`${API}/api/agent-tools/google/posts/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSummary(""); setCtaType(""); setCtaUrl(""); setImageUrl(""); setShowForm(false);
      fetchPosts();
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postName: string) => {
    const postId = postName.split("/").pop();
    if (!postId) return;
    await fetch(`${API}/api/agent-tools/google/posts/${clientId}/${postId}`, { method: "DELETE" });
    fetchPosts();
  };

  const typeBadge = (type?: string) => {
    const colors: Record<string, string> = {
      STANDARD: isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600",
      EVENT: isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-50 text-purple-600",
      OFFER: isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-50 text-amber-700",
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[type || "STANDARD"] || colors.STANDARD}`}>
        {type || "UPDATE"}
      </span>
    );
  };

  if (loading) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>Loading posts...</p></div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${btnPrimary}`}>
          {showForm ? "Cancel" : "New Post"}
        </button>
      </div>

      {showForm && (
        <div className={`${cardBg} p-5 space-y-3`}>
          <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} placeholder="What's new at your business?"
            className={`w-full rounded-lg px-3 py-2 text-sm resize-none ${isDark ? "bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500" : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"}`} />
          <div className="flex gap-3 flex-wrap">
            <select value={topicType} onChange={(e) => setTopicType(e.target.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${isDark ? "bg-white/5 border border-white/10 text-gray-200" : "bg-white border border-gray-300 text-gray-900"}`}>
              {POST_TYPES.map((t) => <option key={t} value={t}>{t === "STANDARD" ? "Update" : t === "EVENT" ? "Event" : "Offer"}</option>)}
            </select>
            <select value={ctaType} onChange={(e) => setCtaType(e.target.value)}
              className={`rounded-lg px-3 py-1.5 text-sm ${isDark ? "bg-white/5 border border-white/10 text-gray-200" : "bg-white border border-gray-300 text-gray-900"}`}>
              <option value="">No CTA</option>
              {CTA_TYPES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          {ctaType && (
            <input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="CTA URL (optional)"
              className={`w-full rounded-lg px-3 py-2 text-sm ${isDark ? "bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500" : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"}`} />
          )}
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)"
            className={`w-full rounded-lg px-3 py-2 text-sm ${isDark ? "bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500" : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"}`} />
          <button onClick={handleCreate} disabled={submitting || !summary.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${btnPrimary}`}>
            {submitting ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      )}

      {posts.length === 0 ? (
        <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>No posts yet.</p></div>
      ) : (
        posts.map((post) => (
          <div key={post.name} className={`${cardBg} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {typeBadge(post.topicType)}
                  {post.createTime && <span className={`text-xs ${subtleText}`}>{timeAgo(post.createTime)}</span>}
                </div>
                {post.summary && <p className={`text-sm leading-relaxed ${isDark ? "text-gray-300" : "text-gray-700"}`}>{post.summary}</p>}
                {post.callToAction?.actionType && (
                  <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-600"}`}>
                    CTA: {post.callToAction.actionType.replace(/_/g, " ")}
                  </span>
                )}
              </div>
              <button onClick={() => handleDelete(post.name)} className={`text-xs px-2 py-1 rounded-lg shrink-0 ${btnDanger}`}>Delete</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// INSIGHTS SUB-TAB
// ════════════════════════════════════════════

const METRIC_LABELS: Record<string, { label: string; icon: string }> = {
  QUERIES_DIRECT: { label: "Direct Searches", icon: "🔍" },
  QUERIES_INDIRECT: { label: "Discovery Searches", icon: "🌐" },
  VIEWS_MAPS: { label: "Map Views", icon: "🗺️" },
  VIEWS_SEARCH: { label: "Search Views", icon: "📊" },
  ACTIONS_WEBSITE: { label: "Website Clicks", icon: "🖱️" },
  ACTIONS_PHONE: { label: "Phone Calls", icon: "📞" },
  ACTIONS_DRIVING_DIRECTIONS: { label: "Direction Requests", icon: "🧭" },
  PHOTOS_VIEWS_MERCHANT: { label: "Photo Views", icon: "📷" },
  PHOTOS_VIEWS_CUSTOMERS: { label: "Customer Photo Views", icon: "👥" },
  PHOTOS_COUNT_MERCHANT: { label: "Your Photos", icon: "🖼️" },
  PHOTOS_COUNT_CUSTOMERS: { label: "Customer Photos", icon: "📸" },
};

function InsightsSection({ clientId, isDark, cardBg, subtleText }: SectionProps) {
  const [metrics, setMetrics] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/agent-tools/google/insights/${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        const parsed: Record<string, number> = {};
        const reports = d.locationMetrics || d.locationDrivingDirectionMetrics || [];
        for (const report of reports) {
          const metricValues = report.metricValues || [];
          for (const mv of metricValues) {
            const metric = mv.metric as string;
            const total = mv.totalValue?.metricOption === "AGGREGATED_TOTAL"
              ? Number(mv.totalValue?.timeDimension?.timeRange?.startTime ? 0 : mv.totalValue?.value || 0)
              : 0;
            const dimTotal = mv.dimensionalValues?.reduce((sum: number, dv: { value?: string | number }) => sum + Number(dv.value || 0), 0) || 0;
            parsed[metric] = total || dimTotal;
          }
        }
        setMetrics(parsed);
      })
      .catch(() => setError("Failed to load insights"))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>Loading insights...</p></div>;
  if (error) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>{error}</p></div>;

  const metricEntries = Object.entries(metrics).filter(([k]) => METRIC_LABELS[k]);

  if (metricEntries.length === 0) {
    return (
      <div className={`${cardBg} p-8 text-center`}>
        <p className={subtleText}>No insights data available for the last 30 days.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {metricEntries.map(([key, value]) => {
        const info = METRIC_LABELS[key];
        return (
          <div key={key} className={`${cardBg} p-4`}>
            <div className="text-2xl mb-1">{info.icon}</div>
            <p className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>
              {value.toLocaleString()}
            </p>
            <p className={`text-xs mt-0.5 ${subtleText}`}>{info.label}</p>
            <p className={`text-[10px] mt-1 ${subtleText}`}>Last 30 days</p>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════
// Q&A SUB-TAB
// ════════════════════════════════════════════

function QASection({ clientId, isDark, cardBg, subtleText }: SectionProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const btnSuccess = isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white hover:bg-emerald-500";

  const fetchQuestions = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/agent-tools/google/questions/${clientId}`)
      .then((r) => r.json())
      .then((d) => setQuestions(d.questions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/agent-tools/google/questions/${clientId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, text: answerText }),
      });
      setAnsweringId(null);
      setAnswerText("");
      fetchQuestions();
    } catch {} finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>Loading Q&amp;A...</p></div>;

  if (questions.length === 0) {
    return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>No questions yet.</p></div>;
  }

  return (
    <div className="space-y-3">
      {questions.map((q) => (
        <div key={q.name} className={`${cardBg} p-5`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-600"}`}>Q</div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isDark ? "text-gray-200" : "text-gray-900"}`}>{q.text}</p>
              <div className="flex items-center gap-2 mt-1">
                {q.author?.displayName && <span className={`text-xs ${subtleText}`}>{q.author.displayName}</span>}
                {q.createTime && <span className={`text-xs ${subtleText}`}>· {timeAgo(q.createTime)}</span>}
              </div>

              {/* Existing answers */}
              {q.topAnswers && q.topAnswers.length > 0 && (
                <div className="mt-3 space-y-2">
                  {q.topAnswers.map((a, i) => (
                    <div key={i} className={`p-3 rounded-lg text-sm ${isDark ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100"}`}>
                      <p className={`text-xs font-medium mb-1 ${subtleText}`}>
                        {a.author?.displayName || "Answer"} {a.createTime ? `· ${timeAgo(a.createTime)}` : ""}
                      </p>
                      <p className={isDark ? "text-gray-300" : "text-gray-700"}>{a.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Answer form */}
              {answeringId === q.name ? (
                <div className="mt-3 space-y-2">
                  <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={2} placeholder="Write your answer..."
                    className={`w-full rounded-lg px-3 py-2 text-sm resize-none ${isDark ? "bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500" : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"}`} />
                  <div className="flex gap-2">
                    <button onClick={() => handleAnswer(q.name)} disabled={submitting || !answerText.trim()}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${btnSuccess}`}>
                      {submitting ? "Sending..." : "Post Answer"}
                    </button>
                    <button onClick={() => { setAnsweringId(null); setAnswerText(""); }}
                      className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-gray-100"}`}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAnsweringId(q.name)}
                  className={`mt-2 text-xs px-3 py-1 rounded-lg ${isDark ? "text-blue-400 hover:bg-blue-500/10" : "text-blue-600 hover:bg-blue-50"}`}>
                  Answer
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ════════════════════════════════════════════
// PHOTOS SUB-TAB
// ════════════════════════════════════════════

const PHOTO_CATEGORIES = ["COVER", "PROFILE", "EXTERIOR", "INTERIOR", "PRODUCT", "AT_WORK", "FOOD_AND_DRINK", "MENU", "COMMON_AREA", "ROOMS", "TEAMS", "ADDITIONAL"];

function PhotosSection({ clientId, isDark, cardBg, subtleText }: SectionProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState("ADDITIONAL");
  const [submitting, setSubmitting] = useState(false);

  const btnPrimary = isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-600 text-white hover:bg-blue-500";
  const btnDanger = isDark ? "bg-red-500/10 text-red-400 hover:bg-red-500/20" : "bg-red-50 text-red-500 hover:bg-red-100";

  const fetchMedia = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/agent-tools/google/media/${clientId}`)
      .then((r) => r.json())
      .then((d) => setMedia(d.media || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { fetchMedia(); }, [fetchMedia]);

  const handleUpload = async () => {
    if (!sourceUrl.trim()) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/api/agent-tools/google/media/${clientId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceUrl, mediaFormat: "PHOTO", locationAssociation: { category } }),
      });
      setSourceUrl(""); setShowUpload(false);
      fetchMedia();
    } catch {} finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (mediaName: string) => {
    const mediaId = mediaName.split("/").pop();
    if (!mediaId) return;
    await fetch(`${API}/api/agent-tools/google/media/${clientId}/${mediaId}`, { method: "DELETE" });
    fetchMedia();
  };

  if (loading) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>Loading photos...</p></div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button onClick={() => setShowUpload(!showUpload)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${btnPrimary}`}>
          {showUpload ? "Cancel" : "Upload Photo"}
        </button>
      </div>

      {showUpload && (
        <div className={`${cardBg} p-5 space-y-3`}>
          <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="Image URL"
            className={`w-full rounded-lg px-3 py-2 text-sm ${isDark ? "bg-white/5 border border-white/10 text-gray-200 placeholder-gray-500" : "bg-white border border-gray-300 text-gray-900 placeholder-gray-400"}`} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            className={`rounded-lg px-3 py-1.5 text-sm ${isDark ? "bg-white/5 border border-white/10 text-gray-200" : "bg-white border border-gray-300 text-gray-900"}`}>
            {PHOTO_CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
          <button onClick={handleUpload} disabled={submitting || !sourceUrl.trim()}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${btnPrimary}`}>
            {submitting ? "Uploading..." : "Upload"}
          </button>
        </div>
      )}

      {media.length === 0 ? (
        <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>No photos yet.</p></div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.map((item) => (
            <div key={item.name} className={`${cardBg} overflow-hidden`}>
              <div className="aspect-square relative">
                <img
                  src={item.googleUrl || item.thumbnailUrl || item.sourceUrl || ""}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-2.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? "bg-white/5 text-gray-400" : "bg-gray-100 text-gray-500"}`}>
                  {item.locationAssociation?.category?.replace(/_/g, " ") || "PHOTO"}
                </span>
                <button onClick={() => handleDelete(item.name)}
                  className={`mt-1.5 w-full text-xs px-2 py-1 rounded-lg ${btnDanger}`}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// INFO SUB-TAB
// ════════════════════════════════════════════

function InfoSection({ clientId, isDark, cardBg, subtleText }: SectionProps) {
  const [info, setInfo] = useState<LocationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    locationName: "",
    primaryPhone: "",
    websiteUrl: "",
    description: "",
  });

  const btnPrimary = isDark ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" : "bg-blue-600 text-white hover:bg-blue-500";
  const btnSuccess = isDark ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" : "bg-emerald-600 text-white hover:bg-emerald-500";

  const fetchInfo = useCallback(() => {
    setLoading(true);
    fetch(`${API}/api/agent-tools/google/info/${clientId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setInfo(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  useEffect(() => { fetchInfo(); }, [fetchInfo]);

  const startEdit = () => {
    if (!info) return;
    setEditData({
      locationName: info.locationName || "",
      primaryPhone: info.primaryPhone || "",
      websiteUrl: info.websiteUrl || "",
      description: info.profile?.description || "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = {};
      if (editData.locationName) updates.locationName = editData.locationName;
      if (editData.primaryPhone) updates.primaryPhone = editData.primaryPhone;
      if (editData.websiteUrl) updates.websiteUrl = editData.websiteUrl;
      if (editData.description) updates.profile = { description: editData.description };

      await fetch(`${API}/api/agent-tools/google/info/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      setEditing(false);
      fetchInfo();
    } catch {} finally {
      setSaving(false);
    }
  };

  if (loading) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>Loading info...</p></div>;
  if (!info) return <div className={`${cardBg} p-8 text-center`}><p className={subtleText}>Could not load business info.</p></div>;

  const address = info.address
    ? [info.address.addressLines?.join(", "), info.address.locality, info.address.administrativeArea, info.address.postalCode].filter(Boolean).join(", ")
    : "—";

  const inputCls = `w-full rounded-lg px-3 py-2 text-sm ${isDark ? "bg-white/5 border border-white/10 text-gray-200" : "bg-white border border-gray-300 text-gray-900"}`;

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-3 border-b last:border-b-0" style={{ borderColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)" }}>
      <span className={`text-sm font-medium w-36 shrink-0 ${subtleText}`}>{label}</span>
      <span className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}>{value || "—"}</span>
    </div>
  );

  if (editing) {
    return (
      <div className={`${cardBg} p-5 space-y-4`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>Edit Business Info</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className={`text-xs font-medium block mb-1 ${subtleText}`}>Business Name</label>
            <input value={editData.locationName} onChange={(e) => setEditData({ ...editData, locationName: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${subtleText}`}>Phone</label>
            <input value={editData.primaryPhone} onChange={(e) => setEditData({ ...editData, primaryPhone: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${subtleText}`}>Website</label>
            <input value={editData.websiteUrl} onChange={(e) => setEditData({ ...editData, websiteUrl: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className={`text-xs font-medium block mb-1 ${subtleText}`}>Description</label>
            <textarea value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} rows={3}
              className={`${inputCls} resize-none`} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving} className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${btnSuccess}`}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button onClick={() => setEditing(false)} className={`px-4 py-2 rounded-lg text-sm ${isDark ? "text-gray-400 hover:bg-white/5" : "text-gray-500 hover:bg-gray-100"}`}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardBg} p-5`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${isDark ? "text-gray-200" : "text-gray-900"}`}>Business Information</h3>
        <button onClick={startEdit} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${btnPrimary}`}>Edit</button>
      </div>
      <InfoRow label="Business Name" value={info.locationName || ""} />
      <InfoRow label="Phone" value={info.primaryPhone || ""} />
      <InfoRow label="Address" value={address} />
      <InfoRow label="Website" value={info.websiteUrl || ""} />
      <InfoRow label="Category" value={info.primaryCategory?.displayName || ""} />
      <InfoRow label="Description" value={info.profile?.description || ""} />
      {info.regularHours?.periods && info.regularHours.periods.length > 0 && (
        <div className="pt-3 mt-1">
          <p className={`text-sm font-medium mb-2 ${subtleText}`}>Business Hours</p>
          <div className="space-y-1">
            {info.regularHours.periods.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className={`text-xs w-24 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{p.openDay}</span>
                <span className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}>{p.openTime} — {p.closeTime}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
