/**
 * AI Content Engine — idea type and reference type.
 * Stored in localStorage: 2fly-content-ideas-{clientId}, 2fly-references-{clientId}
 */

export type ContentIdeaType = "feed" | "reel" | "story" | "carousel";

export type ContentIdeaStatus = "idea" | "approved" | "scheduled" | "published";

export type ContentIdeaSource = "ai" | "team" | "client";

export type ContentIdea = {
  id: string;
  clientId: string;
  type: ContentIdeaType;
  title: string;
  caption: string;
  hook: string;
  format: string;
  bestTime: string;
  hashtags: string[];
  whyItWorks: string;
  references: { title: string; url: string }[];
  status: ContentIdeaStatus;
  source: ContentIdeaSource;
  createdAt: string;
  scheduledDate?: string | null;
};

export type ReferenceLink = {
  id: string;
  title: string;
  url: string;
  source: "pinterest" | "instagram" | "tiktok" | "other";
};

export function generateIdeaId(): string {
  return `idea-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateRefId(): string {
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
