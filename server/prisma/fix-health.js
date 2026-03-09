// Fix content dates and health scoring
// 1. Spread scheduled content into the future
// 2. Make some clients healthier than others (realistic mix)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

async function main() {
  const clients = await prisma.client.findMany({ where: { status: "active" } });

  // Define health profiles per client (realistic)
  const profiles = {
    "The Shape SPA Miami": { bufferDays: 18, greenRequests: true },
    "The Shape Spa FLL": { bufferDays: 15, greenRequests: true },
    "Sudbury Point Grill": { bufferDays: 12, greenRequests: true },
    "Pro Fortuna": { bufferDays: 8, greenRequests: true },
    "Casa Nova": { bufferDays: 6, greenRequests: false }, // needs content
    "Ardan Med Spa": { bufferDays: 10, greenRequests: false }, // payment issues
    "This is it Brazil": { bufferDays: 5, greenRequests: false }, // at risk
    "Super Crisp": { bufferDays: 20, greenRequests: true }, // healthy
    "Hafiza": { bufferDays: 14, greenRequests: true },
    "Cristiane Amorim": { bufferDays: 16, greenRequests: true },
  };

  for (const client of clients) {
    const profile = profiles[client.name] || { bufferDays: 12, greenRequests: true };

    // Get this client's scheduled content items
    const scheduledItems = await prisma.contentItem.findMany({
      where: { clientId: client.id, status: "scheduled" },
    });

    // Spread scheduled items into the future
    for (let i = 0; i < scheduledItems.length; i++) {
      const daysOut = Math.floor((i / scheduledItems.length) * profile.bufferDays) + 1;
      await prisma.contentItem.update({
        where: { id: scheduledItems[i].id },
        data: { scheduledDate: futureDate(daysOut) },
      });
    }

    // Fix some draft/approved items to have recent dates
    const draftItems = await prisma.contentItem.findMany({
      where: { clientId: client.id, status: { in: ["draft", "approved"] } },
      take: 5,
    });
    for (let i = 0; i < draftItems.length; i++) {
      await prisma.contentItem.update({
        where: { id: draftItems[i].id },
        data: { scheduledDate: futureDate(profile.bufferDays + i + 1) },
      });
    }

    // Fix published items to have past dates
    const publishedItems = await prisma.contentItem.findMany({
      where: { clientId: client.id, status: "published" },
    });
    for (let i = 0; i < publishedItems.length; i++) {
      await prisma.contentItem.update({
        where: { id: publishedItems[i].id },
        data: { 
          scheduledDate: new Date(Date.now() - (i + 1) * 2 * 86400000),
          publishedDate: new Date(Date.now() - (i + 1) * 2 * 86400000),
        },
      });
    }

    // Fix requests — mark most as completed for green-profile clients
    if (profile.greenRequests) {
      const openReqs = await prisma.clientRequest.findMany({
        where: { clientId: client.id, status: { notIn: ["completed", "closed"] } },
      });
      // Complete older ones, keep 1-2 open
      for (let i = 0; i < openReqs.length; i++) {
        if (i < openReqs.length - 2) {
          await prisma.clientRequest.update({
            where: { id: openReqs[i].id },
            data: { status: "completed", resolvedAt: new Date() },
          });
        }
      }
    }

    console.log(`✅ ${client.name}: ${profile.bufferDays}d buffer, ${profile.greenRequests ? "green" : "yellow/red"} requests`);
  }

  // Verify health
  const { computeClientHealth } = require("../src/lib/statusEngine");
  console.log("\n📊 Health Check:");
  for (const client of clients) {
    const health = await computeClientHealth(client.id);
    const emoji = health.overall === "green" ? "🟢" : health.overall === "yellow" ? "🟡" : "🔴";
    console.log(`  ${emoji} ${client.name}: ${health.overall} (buffer: ${health.modules.contentBuffer.bufferDays}d, requests: ${health.modules.requests.status}, ads: ${health.modules.ads.status})`);
    
    await prisma.client.update({
      where: { id: client.id },
      data: { healthStatus: health.overall },
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
