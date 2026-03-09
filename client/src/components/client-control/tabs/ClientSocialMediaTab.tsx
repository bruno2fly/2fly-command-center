"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import type { SocialPost } from "@/lib/client/mockSocialMediaData";

function PostCard({ post }: { post: SocialPost }) {
  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="group block aspect-square relative overflow-hidden rounded-lg bg-gray-100"
    >
      <img
        src={post.mediaUrl}
        alt={post.caption ?? "Instagram post"}
        className="w-full h-full object-cover transition-transform group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-4 text-white font-medium">
          <span>❤️ {post.likeCount}</span>
          <span>💬 {post.commentsCount}</span>
        </div>
      </div>
    </a>
  );
}

type FeedResponse = {
  connected: boolean;
  username: string | null;
  posts: SocialPost[];
  message?: string;
  error?: string;
};

type Props = {
  clientId: string;
};

export function ClientSocialMediaTab({ clientId }: Props) {
  const [data, setData] = useState<FeedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;
    async function fetchFeed() {
      try {
        const res = await fetch(`/api/clients/${clientId}/instagram/feed`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = (await res.json()) as FeedResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setData({
            connected: false,
            username: null,
            posts: [],
            error: "Failed to load feed",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchFeed();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  useEffect(() => {
    const connected = searchParams?.get("connected");
    const error = searchParams?.get("error");
    const reason = searchParams?.get("reason");
    if (connected === "1") toast.success("Instagram connected!");
    if (error) toast.error(reason ? decodeURIComponent(reason) : decodeURIComponent(error));
  }, [searchParams]);

  const handleDisconnect = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/instagram/disconnect`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Instagram disconnected");
      setLoading(true);
      const feedRes = await fetch(`/api/clients/${clientId}/instagram/feed`);
      const json = (await feedRes.json()) as FeedResponse;
      setData(json);
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setLoading(false);
    }
  };

  const connectUrl = `/api/instagram/connect?clientId=${clientId}`;

  if (loading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="aspect-square rounded-lg bg-gray-100" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <p className="text-gray-500">Failed to load</p>
      </div>
    );
  }

  const { connected, username, posts, message, error } = data;
  const handle = username ?? null;

  if (!handle && !connected) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Instagram connected</h3>
          <p className="text-sm text-gray-500 mb-6">
            Connect an Instagram Business or Creator account to see the feed here.
          </p>
          <a
            href={connectUrl}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium hover:from-purple-700 hover:to-pink-700"
          >
            Connect Instagram
          </a>
        </div>
      </div>
    );
  }

  const profileUrl = handle ? `https://www.instagram.com/${handle}/` : "#";

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Instagram Feed</h2>
            <div className="flex items-center gap-2">
              {connected && (
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-medium">
                  Connected as @{handle}
                </span>
              )}
              {!connected && (
                <a
                  href={connectUrl}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-medium hover:from-purple-700 hover:to-pink-700"
                >
                  Connect Instagram
                </a>
              )}
              {connected && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  Disconnect
                </button>
              )}
              {handle && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  @{handle} →
                </a>
              )}
            </div>
          </div>

          {message && (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2 mb-4">
              {message}
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-2 mb-4">
              {error}
            </p>
          )}

          <p className="text-sm text-gray-500 mb-6">
            {handle ? (
              <>
                Latest posts from{" "}
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  instagram.com/{handle}
                </a>
              </>
            ) : (
              "Connect Instagram to see the feed."
            )}
          </p>

          {posts.length === 0 ? (
            <div className="py-12 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg bg-gray-50/50">
              <p>No posts yet.</p>
              {handle && (
                <a
                  href={profileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mt-2 inline-block"
                >
                  View on Instagram
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>

              {handle && (
                <div className="mt-6 text-center">
                  <a
                    href={profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View full profile on Instagram
                  </a>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
