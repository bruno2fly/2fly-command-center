/**
 * GET /api/clients/[id]/instagram/feed
 * Returns Instagram feed for the client.
 * Requires client to have connected Instagram via OAuth.
 */

import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/instagram/store";
import {
  getDemoSocialPosts,
  getClientInstagram,
  type SocialPost,
} from "@/lib/client/mockSocialMediaData";

function mapGraphMediaToPost(
  m: {
    id: string;
    media_url?: string;
    thumbnail_url?: string;
    permalink?: string;
    caption?: string;
    like_count?: number;
    comments_count?: number;
    timestamp?: string;
    media_type?: string;
  },
  clientId: string,
  username: string
): SocialPost {
  const mediaUrl = m.media_url ?? m.thumbnail_url ?? "";
  return {
    id: m.id,
    clientId,
    permalink: m.permalink ?? `https://www.instagram.com/p/${m.id}/`,
    mediaUrl,
    caption: m.caption ?? null,
    likeCount: m.like_count ?? 0,
    commentsCount: m.comments_count ?? 0,
    timestamp: m.timestamp ?? new Date().toISOString(),
    mediaType:
      (m.media_type as "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM") ?? "IMAGE",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: clientId } = await params;

  const conn = await getConnection(clientId);

  if (!conn) {
    const fallbackHandle = getClientInstagram(clientId);
    if (fallbackHandle) {
      const demoPosts = getDemoSocialPosts(fallbackHandle, clientId);
      return NextResponse.json({
        connected: false,
        username: fallbackHandle,
        posts: demoPosts,
        message: "Using demo data. Connect Instagram for real feed.",
      });
    }
    return NextResponse.json({
      connected: false,
      username: null,
      posts: [],
      message: "No Instagram connected. Connect to see feed.",
    });
  }

  try {
    const fields = "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp";
    const mediaRes = await fetch(
      `https://graph.facebook.com/v21.0/${conn.instagramUserId}/media?fields=${fields}&access_token=${conn.accessToken}&limit=25`
    );

    const mediaData = (await mediaRes.json()) as {
      data?: Array<{
        id: string;
        media_url?: string;
        thumbnail_url?: string;
        permalink?: string;
        caption?: string;
        like_count?: number;
        comments_count?: number;
        timestamp?: string;
        media_type?: string;
      }>;
      error?: { message: string; code?: number };
    };

    if (mediaData.error) {
      if (mediaData.error.code === 190) {
        return NextResponse.json({
          connected: true,
          username: conn.username,
          posts: [],
          error: "Token expired. Please reconnect Instagram.",
        });
      }
      throw new Error(mediaData.error.message);
    }

    const posts: SocialPost[] = (mediaData.data ?? []).map((m) =>
      mapGraphMediaToPost(m, clientId, conn.username)
    );

    return NextResponse.json({
      connected: true,
      username: conn.username,
      posts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to fetch feed";
    return NextResponse.json(
      { connected: true, username: conn.username, posts: [], error: msg },
      { status: 500 }
    );
  }
}
