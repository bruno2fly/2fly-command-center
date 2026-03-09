/**
 * Social media config and mock data.
 * Swap for real Instagram Graph API / oEmbed when integrating.
 */

export type SocialPost = {
  id: string;
  clientId: string;
  permalink: string;
  mediaUrl: string;
  caption: string | null;
  likeCount: number;
  commentsCount: number;
  timestamp: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
};

/** Instagram handle per client – used for feed display & link */
const CLIENT_INSTAGRAM: Record<string, string> = {
  "1": "brunolimmamusik",  // Acme Corp – example
  "2": "brunolimmamusik",
  "3": "brunolimmamusik",
  "4": "brunolimmamusik",
  "5": "brunolimmamusik",
};

export function getClientInstagram(clientId: string): string | null {
  return CLIENT_INSTAGRAM[clientId] ?? null;
}

/** Mock recent posts – placeholder until connected to Instagram API */
export function getSocialPosts(clientId: string): SocialPost[] {
  const handle = getClientInstagram(clientId);
  if (!handle) return [];

  return MOCK_SOCIAL_POSTS.filter((p) => p.clientId === clientId);
}

/** Fallback: show sample posts for demo when client has handle but no posts */
export function getDemoSocialPosts(handle: string, clientId: string): SocialPost[] {
  return MOCK_SOCIAL_POSTS.filter((p) => p.clientId === "1").map((p) => ({
    ...p,
    id: `demo-${p.id}-${clientId}`,
    clientId,
  }));
}

const MOCK_SOCIAL_POSTS: SocialPost[] = [
  {
    id: "sm1",
    clientId: "1",
    permalink: "https://www.instagram.com/p/example1/",
    mediaUrl: "https://picsum.photos/seed/ig1/400/400",
    caption: "Latest session vibes 🎵",
    likeCount: 124,
    commentsCount: 12,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    mediaType: "IMAGE",
  },
  {
    id: "sm2",
    clientId: "1",
    permalink: "https://www.instagram.com/p/example2/",
    mediaUrl: "https://picsum.photos/seed/ig2/400/400",
    caption: "New drop coming soon",
    likeCount: 89,
    commentsCount: 8,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    mediaType: "IMAGE",
  },
  {
    id: "sm3",
    clientId: "1",
    permalink: "https://www.instagram.com/p/example3/",
    mediaUrl: "https://picsum.photos/seed/ig3/400/400",
    caption: null,
    likeCount: 256,
    commentsCount: 24,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    mediaType: "IMAGE",
  },
  {
    id: "sm4",
    clientId: "1",
    permalink: "https://www.instagram.com/p/example4/",
    mediaUrl: "https://picsum.photos/seed/ig4/400/400",
    caption: "Behind the scenes ✨",
    likeCount: 312,
    commentsCount: 31,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    mediaType: "IMAGE",
  },
  {
    id: "sm5",
    clientId: "1",
    permalink: "https://www.instagram.com/p/example5/",
    mediaUrl: "https://picsum.photos/seed/ig5/400/400",
    caption: "Throwback",
    likeCount: 67,
    commentsCount: 5,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
    mediaType: "IMAGE",
  },
  {
    id: "sm6",
    clientId: "1",
    permalink: "https://www.instagram.com/p/example6/",
    mediaUrl: "https://picsum.photos/seed/ig6/400/400",
    caption: null,
    likeCount: 178,
    commentsCount: 14,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    mediaType: "IMAGE",
  },
];
