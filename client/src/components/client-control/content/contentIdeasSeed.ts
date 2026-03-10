/**
 * Pre-seeded content ideas per industry for AI Content Engine.
 * Used on first load when localStorage is empty.
 */
import type { ContentIdea } from "./contentIdeaTypes";
import { generateIdeaId } from "./contentIdeaTypes";

const MED_SPA_NAMES = ["shape", "spa", "miami", "fll", "ardan"];
const RESTAURANT_NAMES = ["sudbury", "casa nova", "super crisp", "grill"];
const WELLNESS_NAMES = ["brazil", "cristiane", "hafiza", "wellness", "beauty"];
const FINANCIAL_NAMES = ["fortuna", "financial"];

export function getIndustryForClient(clientId: string, clientName?: string): string {
  const name = (clientName ?? "").toLowerCase();
  const id = clientId.toLowerCase();
  const combined = `${name} ${id}`;
  if (MED_SPA_NAMES.some((n) => combined.includes(n))) return "med_spa";
  if (RESTAURANT_NAMES.some((n) => combined.includes(n))) return "restaurant";
  if (WELLNESS_NAMES.some((n) => combined.includes(n))) return "wellness";
  if (FINANCIAL_NAMES.some((n) => combined.includes(n))) return "financial";
  return "general";
}

function baseIdea(
  clientId: string,
  type: ContentIdea["type"],
  title: string,
  source: ContentIdea["source"] = "ai"
): Partial<ContentIdea> {
  return {
    id: generateIdeaId(),
    clientId,
    type,
    title,
    source,
    status: "idea",
    createdAt: new Date().toISOString(),
    hashtags: [],
  };
}

export function getPreSeededIdeas(clientId: string, industry: string): ContentIdea[] {
  const now = new Date().toISOString();

  if (industry === "med_spa") {
    return [
      {
        ...baseIdea(clientId, "feed", "Spring body sculpting transformation", "ai"),
        caption:
          "✨ Spring is here and so are your body goals! Our body sculpting treatment helps you feel confident in your skin. Book your free consultation today → Link in bio\n\n#bodysculpting #medspa #springready #miami",
        hook: "Before/after transformation photo",
        format: "1080x1080 square",
        bestTime: "Tue/Thu 11am-1pm",
        hashtags: ["#bodysculpting", "#medspa", "#miami", "#glow"],
        whyItWorks:
          "Transformation posts get 3x engagement for med spas. Spring is peak booking season — urgency + aspiration.",
        references: [
          { title: "Pinterest: Spa transformations", url: "https://pinterest.com/search/spa-transformations" },
          { title: "Competitor: @glowmedspa similar post", url: "https://instagram.com/glowmedspa" },
        ],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "reel", "60-second spa walkthrough — what to expect at your first visit", "ai"),
        caption: "Your first visit made simple 🧖‍♀️ #medspa #spatour #miami",
        hook: "Walk through the door to the treatment room",
        format: "9:16 vertical",
        bestTime: "Wed/Fri 7-9pm",
        hashtags: ["#medspa", "#spatour", "#miami", "#firstvisit"],
        whyItWorks: "Behind-the-scenes builds trust and reduces booking anxiety. Reels get 45% more reach.",
        references: [{ title: "TikTok: Spa tour format", url: "https://tiktok.com/search/spa%20tour" }],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "story", "Quick poll: Which treatment are you most curious about?", "ai"),
        caption: "",
        hook: "Poll sticker: Body sculpting / Facials / Laser / Other",
        format: "9:16 vertical",
        bestTime: "Daily 9-10am",
        hashtags: [],
        whyItWorks: "Polls drive engagement and reveal what your audience wants next.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "carousel", "5 myths about body sculpting — debunked", "ai"),
        caption: "Swipe to see the facts 👉 #bodysculpting #medspa #myths",
        hook: "Myth 1 headline with bold visual",
        format: "1080x1080, 5 slides",
        bestTime: "Tue/Thu 11am-1pm",
        hashtags: ["#bodysculpting", "#medspa", "#myths"],
        whyItWorks: "Educational carousels get saves and shares. Addresses objections before they book.",
        references: [],
      } as ContentIdea,
    ].map((i) => ({ ...i, id: generateIdeaId(), createdAt: now })) as ContentIdea[];
  }

  if (industry === "restaurant") {
    return [
      {
        ...baseIdea(clientId, "feed", "New seasonal menu spotlight", "ai"),
        caption: "Spring menu is here 🌸 Link in bio to reserve. #seasonal #restaurant",
        hook: "Hero dish shot with seasonal ingredients",
        format: "1080x1080 square",
        bestTime: "Wed/Sun 12-2pm",
        hashtags: ["#seasonal", "#restaurant", "#food"],
        whyItWorks: "Menu posts drive reservations. Seasonal angle creates urgency.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "reel", "Behind the kitchen — chef plating the signature dish", "ai"),
        caption: "Watch the magic happen 👨‍🍳 #chef #kitchen #food",
        hook: "Chef hands plating",
        format: "9:16 vertical",
        bestTime: "Fri/Sat 6-8pm",
        hashtags: ["#chef", "#kitchen", "#food"],
        whyItWorks: "BTS reels humanize the brand. Food content performs well on Reels.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "story", "This or That: Burger vs Pasta night?", "ai"),
        caption: "",
        hook: "This or That sticker",
        format: "9:16",
        bestTime: "Daily 11am",
        hashtags: [],
        whyItWorks: "Interactive stories boost engagement and remind followers you exist.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "feed", "Customer spotlight — tagged photo repost", "ai"),
        caption: "Thank you for the love! 🙌 (Repost from @customer) #customerspotlight",
        hook: "UGC repost with credit",
        format: "1080x1080",
        bestTime: "Tue/Thu 12pm",
        hashtags: ["#customerspotlight", "#repost"],
        whyItWorks: "UGC builds social proof and strengthens community.",
        references: [],
      } as ContentIdea,
    ].map((i) => ({ ...i, id: generateIdeaId(), createdAt: now })) as ContentIdea[];
  }

  if (industry === "wellness" || industry === "beauty") {
    return [
      {
        ...baseIdea(clientId, "feed", "Client transformation story", "ai"),
        caption: "Real results ✨ #transformation #wellness",
        hook: "Before/after or testimonial quote",
        format: "1080x1080",
        bestTime: "Mon/Wed/Fri 7-9am",
        hashtags: ["#transformation", "#wellness"],
        whyItWorks: "Transformation content drives trust and bookings.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "reel", "Morning routine with our top 3 products", "ai"),
        caption: "Start your day right 🌅 #morningroutine #wellness",
        hook: "Quick product demo in sequence",
        format: "9:16",
        bestTime: "Tue/Thu 6-7pm",
        hashtags: ["#morningroutine", "#wellness"],
        whyItWorks: "Routine content is highly saveable and shareable.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "story", "Quick tip Tuesday: [wellness tip]", "ai"),
        caption: "",
        hook: "Short text + tip",
        format: "9:16",
        bestTime: "Tue 8am",
        hashtags: [],
        whyItWorks: "Consistent tip series builds authority.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "carousel", "Your self-care checklist for spring", "ai"),
        caption: "Swipe for your checklist 👉 #selfcare #spring",
        hook: "Checklist visual",
        format: "1080x1080, 5-7 slides",
        bestTime: "Mon/Wed 9am",
        hashtags: ["#selfcare", "#spring"],
        whyItWorks: "Checklists get saves and position you as the expert.",
        references: [],
      } as ContentIdea,
    ].map((i) => ({ ...i, id: generateIdeaId(), createdAt: now })) as ContentIdea[];
  }

  if (industry === "financial") {
    return [
      {
        ...baseIdea(clientId, "feed", "Tax season tip #3: retirement planning basics", "ai"),
        caption: "Quick read for your financial health. #taxseason #retirement",
        hook: "Numbered tip with clean graphic",
        format: "1080x1080",
        bestTime: "Tue/Thu 9-11am",
        hashtags: ["#taxseason", "#retirement"],
        whyItWorks: "Timely tips position you as the go-to expert.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "carousel", "5 steps to financial freedom", "ai"),
        caption: "Swipe to see the steps 👉 #financialfreedom",
        hook: "Step 1 headline",
        format: "1080x1080, 5 slides",
        bestTime: "Wed 8-10am",
        hashtags: ["#financialfreedom"],
        whyItWorks: "Educational carousels drive saves and leads.",
        references: [],
      } as ContentIdea,
      {
        ...baseIdea(clientId, "reel", "60-second market update", "ai"),
        caption: "Quick take on this week. #marketupdate #investing",
        hook: "Talking head or chart",
        format: "9:16",
        bestTime: "Fri 9am",
        hashtags: ["#marketupdate", "#investing"],
        whyItWorks: "Short updates build habit and trust.",
        references: [],
      } as ContentIdea,
    ].map((i) => ({ ...i, id: generateIdeaId(), createdAt: now })) as ContentIdea[];
  }

  // general
  return [
    {
      ...baseIdea(clientId, "feed", "Spring campaign highlight", "ai"),
      caption: "New season, new goals. Link in bio. #spring #goals",
      hook: "Hero visual",
      format: "1080x1080",
      bestTime: "Tue/Thu 11am-1pm",
      hashtags: ["#spring", "#goals"],
      whyItWorks: "Seasonal hooks feel timely and relevant.",
      references: [],
    } as ContentIdea,
    {
      ...baseIdea(clientId, "reel", "Behind the scenes — how we do it", "ai"),
      caption: "BTS 🎬 #bts #behindthescenes",
      hook: "Process or team moment",
      format: "9:16",
      bestTime: "Wed/Fri 7-9pm",
      hashtags: ["#bts", "#behindthescenes"],
      whyItWorks: "BTS builds connection and trust.",
      references: [],
    } as ContentIdea,
  ].map((i) => ({ ...i, id: generateIdeaId(), createdAt: now })) as ContentIdea[];
}
