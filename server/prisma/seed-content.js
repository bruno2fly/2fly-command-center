// Seed realistic content items and requests for 2FLY clients
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

const CONTENT_TYPES = ["post", "reel", "carousel", "story"];
const PLATFORMS = ["meta", "instagram"];

async function main() {
  const clients = await prisma.client.findMany({ where: { status: "active" } });
  
  for (const client of clients) {
    // Create 10-20 days of scheduled content per client
    const numPosts = 12 + Math.floor(Math.random() * 8);
    for (let i = 0; i < numPosts; i++) {
      await prisma.contentItem.create({
        data: {
          clientId: client.id,
          platform: PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)],
          contentType: CONTENT_TYPES[Math.floor(Math.random() * CONTENT_TYPES.length)],
          title: getContentTitle(client.name, i),
          status: i < 3 ? "published" : i < 6 ? "approved" : i < 10 ? "scheduled" : "draft",
          scheduledDate: day(i - 2),
          assignedTo: "Bruno Lima",
        },
      });
    }
    console.log(`📝 Created ${numPosts} content items for ${client.name}`);

    // Create 1-3 requests per client
    const numRequests = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numRequests; i++) {
      await prisma.clientRequest.create({
        data: {
          clientId: client.id,
          type: ["revision", "new_content", "strategy", "reporting"][Math.floor(Math.random() * 4)],
          priority: ["normal", "normal", "high", "low"][Math.floor(Math.random() * 4)],
          title: getRequestTitle(client.name, i),
          description: "Generated task for initial dashboard setup",
          status: ["new", "in_progress", "acknowledged"][Math.floor(Math.random() * 3)],
          dueDate: day(Math.floor(Math.random() * 7) + 1),
          assignedTo: i === 0 ? "Bruno Lima" : null,
        },
      });
    }
    console.log(`📋 Created ${numRequests} requests for ${client.name}`);
  }

  console.log("\n✅ Content and requests seeded for all clients!");
}

function getContentTitle(clientName, index) {
  const titles = {
    "The Shape SPA Miami": ["Post-op recovery tips", "Lymphatic drainage benefits", "Client transformation", "Booking promo reel", "Facial treatment showcase", "Membership offer", "Before & after body contouring", "Self-care Sunday tips", "Team spotlight", "Holiday special", "New treatment announcement", "Client testimonial", "Treatment process reel", "Wellness tips carousel", "Spring refresh promo", "Post-surgery care guide", "Behind the scenes", "FAQ about lymphatic", "Package deal post", "Results showcase"],
    "The Shape Spa FLL": ["FLL location spotlight", "Lymphatic drainage demo", "Client results", "Weekend special", "Body treatment showcase", "Membership launch", "Post-op care tips", "Staff intro reel", "Treatment menu post", "Fresha booking promo", "Local community feature", "New service announcement", "Seasonal promo", "Client feedback", "Wellness routine tips", "Treatment comparison", "Booking reminder", "Gift card promo", "Team certification", "Recovery timeline"],
    "Sudbury Point Grill": ["Weekend specials", "Steak tips feature", "Happy hour promo", "Catering menu showcase", "Function room tour", "New cocktail reel", "Seafood special", "Sports night promo", "Chef's special", "Brunch launch", "Private event booking", "Menu highlight", "Restaurant ambiance", "Live music night", "Date night promo", "Lunch deal", "Dessert feature", "Staff picks", "Gift card holiday", "Community event"],
    "Super Crisp": ["Gluten-free chicken feature", "Detroit location spotlight", "Catering menu", "Award highlight reel", "Behind the kitchen", "New sandwich drop", "Group order promo", "Student special", "Chef Mike spotlight", "TikTok chicken ASMR", "Flavor of the week", "Event catering showcase", "Brand story post", "Customer reactions", "Menu walkthrough", "Lunch rush reel", "Weekend special", "Delivery promo", "Food truck update", "Franchise teaser"],
  };
  
  const defaults = ["Weekly content post", "Engagement reel", "Promo carousel", "Brand story", "Service highlight", "Client feature", "Behind the scenes", "Seasonal promo", "Tips & tricks", "Community post", "New offer launch", "Testimonial post", "FAQ carousel", "Holiday special", "Event promo", "Team spotlight", "Product feature", "How-to reel", "Booking reminder", "Results showcase"];
  
  const clientTitles = titles[clientName] || defaults;
  return clientTitles[index % clientTitles.length];
}

function getRequestTitle(clientName, index) {
  const requests = [
    "Update social media content calendar",
    "Review and approve new ad creatives",
    "Monthly performance report",
    "Website content update",
    "New promo campaign setup",
    "Google Business Profile update",
    "Review management response",
    "Content revision — client feedback",
    "New service launch campaign",
    "Seasonal promotion design",
  ];
  return requests[(index + clientName.length) % requests.length];
}

main().catch(console.error).finally(() => prisma.$disconnect());
