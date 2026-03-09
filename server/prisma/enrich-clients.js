// Enrich client notes with full profile data from client-memory agent
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const enrichments = [
  {
    name: "The Shape SPA Miami",
    notes: `📍 South Beach, Miami Beach, FL
🏷️ Lymphatic drainage, post-op, body contouring, facials, wellness spa
👤 Contact: Grace | theshapespa@gmail.com | +1 (305) 619-1240
💰 Retainer: $500/mo | Ads: $1-1.5k/mo (Meta)

SERVICES WE PROVIDE:
- Brand and offer positioning (packages, memberships)
- Social media content and performance creative angles
- Lead gen and booking funnel strategy (link in bio, website paths)
- Review generation and reputation system

GOALS:
- Increase bookings for high-ticket body treatments and packages
- Smooth pre- and post-op customer journey
- Dominate search + social in "lymphatic drainage Miami Beach" terms

KEY NOTES:
- Multi-location brand (Miami + FLL) needs clear differentiation per location
- Reputation and reviews are key to trust in this niche
- WhatsApp group: 120363153256877127@g.us
- Mixed PT/EN communication with Grace`,
  },
  {
    name: "The Shape Spa FLL",
    notes: `📍 4604 N Federal Highway, Fort Lauderdale, FL
🏷️ Lymphatic drainage, post-op massage, body and facial treatments, spa/wellness
👤 Contact: Grace | theshapespa@gmail.com | +1 (305) 619-1240
💰 Retainer: $500/mo | Ads: $1-1.5k/mo (Meta)

SERVICES WE PROVIDE:
- Same brand system as Miami but localized: offers, content, promos
- Review and reputation growth on Fresha/Google
- Booking flow optimization and campaign strategy

GOALS:
- Fill daytime and off-peak slots
- Build membership / recurring services
- Grow local awareness beyond Brazilian community

KEY NOTES:
- Verified on Fresha, strong positioning for "post-op" and "lymphatic drainage"
- Needs clear mapping between corporate site and booking platforms`,
  },
  {
    name: "Sudbury Point Grill",
    notes: `📍 120 Boston Post Rd, Sudbury, MA
🏷️ Casual American restaurant & bar (seafood, steaks, pasta, burgers, drinks)
👤 Contact: Rodrigo | sudburypointgrill@gmail.com | +1 (781) 408-0044
👤 Owner: Alexandre Alvarenga (also Franco's Trattoria)
💰 Retainer: $700/mo | No ads

SERVICES WE PROVIDE:
- Website/online menu and ordering funnel audit (SpotHopper/Toast)
- Google Business Profile optimization and reviews push
- Social media content angles, promos, and events
- Catering/function room lead generation

GOALS:
- Fill dining room consistently, especially weekdays
- Grow bar revenue (cocktails, sports nights)
- Increase catering/function and private party bookings
- Build reviews volume and recency on Google/Yelp

KEY NOTES:
- Tech stack: SpotHopper site, Toast ordering
- Function and catering forms exist but under-leveraged
- Brand story (Conrad's legacy, steak tips reputation) not fully told online`,
  },
  {
    name: "Pro Fortuna",
    notes: `📍 New England (exact HQ TBD)
🏷️ Financial services: life insurance, retirement, wealth strategies
👤 Contact: Julianna | juliann@profortuna.com
👤 Agents: Adriana + Juliana (principals)
💰 Retainer: $1,000/mo | No ads

SERVICES WE PROVIDE:
- Website and funnel audit (fix broken/placeholder contact links)
- Positioning and messaging around safety, family, and wealth building
- Content strategy (educational, testimonials, case-style stories)
- Lead gen campaigns (ads, landing pages)

GOALS:
- Build trust and credibility online
- Generate qualified leads for policies and retirement planning
- Make contact/booking pathways idiot-proof

KEY NOTES:
- Site missing strong trust signals (testimonials, social proof)
- Some links and CTAs are placeholders and must be fixed`,
  },
  {
    name: "Casa Nova",
    notes: `📍 Woburn, MA
🏷️ Brazilian butcher, café, mini-market (food service + retail)
👤 Contact: Adriana | contact@casanovabutchercafe.com | +1 (914) 774-3098
💰 Retainer: $1,200/mo | Ads: $500-1k (NOT running currently)

SERVICES WE PROVIDE:
- Full-stack marketing leadership (strategy, positioning)
- Social media (Instagram main, TikTok starter), content and Reels
- Local SEO and Google Business optimization, review growth
- Website direction and funnel fixes, offer/launch concepts

GOALS:
- Pack weekends and key holidays
- Sell more churrasco kits, catering, and daily plate of the day
- Grow Brazilian community reach + American foodie audience
- Turn digital into real acquisition engine, not just branding

KEY NOTES:
- Strong product and loyal community already
- Bilingual PT/EN content key
- Technical gaps: Yelp unclaimed, website basic, hours consistency to fix`,
  },
  {
    name: "Ardan Med Spa",
    notes: `📍 72 Central St, Wellesley, MA 02482
🏷️ Spa / beauty and wellness services
👤 Contact: Ana | anaelisams13@gmail.com | +1 (413) 222-9510
💰 Retainer: $1,300/mo | Ads: $800/mo (active)

SERVICES WE PROVIDE:
- Digital presence audit and strategy
- Social/media positioning and offer framing
- Website and booking experience optimization

GOALS:
- Strengthen brand, clarify offers, improve online conversion
- Grow higher-value packages and repeat visits

KEY NOTES:
- Phase 2 for WhatsApp bridge expansion
- Needs more structured data — profile still thin`,
  },
  {
    name: "This is it Brazil",
    notes: `📍 No physical location — serves entire USA (online/e-commerce)
🌐 thisisitbrazil.com
🏷️ Brazilian market / food concept (grocery, products)
👤 Contact: Julianna | thewellnesswayinfo@gmail.com | +1 (781) 528-5660
💰 Retainer: $1,100/mo | Ads: $500-1k (NOT running yet)

SERVICES WE PROVIDE:
- Brand and positioning strategy (what category they own)
- Website and e-commerce/ordering audit
- Social content angles tied to Brazilian culture, products, occasions
- National SEO and e-commerce visibility

GOALS:
- Be "the" Brazilian reference point nationally
- Increase online orders
- Use culture/content to build community

KEY NOTES:
- Similar audience to Casanova/other Brazilian businesses — cross-learn possible
- No Local SEO needed (national play)`,
  },
  {
    name: "Super Crisp",
    notes: `📍 Detroit, MI (near Wayne State University)
🏷️ Fast-casual fried chicken & sandwiches, 100% gluten-free, Brazilian-influenced
👤 Contact: Emily | emily@imanoodles.com
👤 Founder: Chef Mike Ransom (Ima Restaurant Group)
💰 Retainer: $1,400/mo | Ads: $500-1k/mo

SERVICES WE PROVIDE:
- Funnel fixes (broken Toast links, ordering clarity)
- Social and TikTok growth strategy
- Catering and group orders positioning and lead flow

GOALS:
- Grow store traffic and online orders
- Leverage "Emerging Fast Casual Brand of the Year" story
- Expand catering and event business

KEY NOTES:
- Strong brand narrative but execution gaps mainly technical + channel-based
- Award recognition is an underused growth asset`,
  },
  {
    name: "Hafiza",
    notes: `📍 Location TBD
🏷️ Spa/wellness
👤 Contact: Hafiza | +1 (857) 284-3824
💰 Retainer: $800/mo | No ads

SERVICES WE PROVIDE:
- TBD — profile needs enrichment

GOALS:
- TBD

KEY NOTES:
- Profile thin — needs more info from Bruno`,
  },
  {
    name: "Cristiane Amorim",
    notes: `📍 Location TBD
🏷️ Beauty professional
👤 Contact: Cristiane | contact@cristianeamorim.com
💰 Retainer: $800/mo | No ads

SERVICES WE PROVIDE:
- Beauty transformation content
- Booking tools optimization

GOALS:
- Grow bookings through social content
- Build transformation portfolio

KEY NOTES:
- Focus on before/after transformation formats`,
  },
];

async function main() {
  for (const e of enrichments) {
    const client = await prisma.client.findFirst({ where: { name: e.name } });
    if (!client) {
      console.log("⚠️  Not found:", e.name);
      continue;
    }
    await prisma.client.update({
      where: { id: client.id },
      data: { notes: e.notes },
    });
    console.log("✅ Enriched:", e.name);
  }
  console.log("\n🧠 All client profiles enriched with full intel from client-memory agent!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
