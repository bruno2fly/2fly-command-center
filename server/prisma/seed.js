// ============================================================
// Seed file — creates sample data so the dashboard isn't empty
// Run: npm run db:seed
// ============================================================

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Team
  await prisma.teamMember.createMany({
    data: [
      { name: "Bruno", email: "bruno@2fly.com", role: "founder" },
      { name: "Jordan", email: "jordan@2fly.com", role: "account_manager" },
      { name: "Alex", email: "alex@2fly.com", role: "content_creator" },
      { name: "Sam", email: "sam@2fly.com", role: "ads_specialist" },
    ],
  });

  // Clients
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        name: "Sunset Dental",
        contactName: "Dr. Maria Lopez",
        contactEmail: "maria@sunsetdental.com",
        platforms: JSON.stringify(["meta", "google"]),
        monthlyRetainer: 3000,
        adBudget: 5000,
        roasTarget: 4.0,
        healthStatus: "green",
      },
    }),
    prisma.client.create({
      data: {
        name: "Peak Fitness Studio",
        contactName: "Jake Turner",
        contactEmail: "jake@peakfitness.com",
        platforms: JSON.stringify(["meta"]),
        monthlyRetainer: 2000,
        adBudget: 3000,
        roasTarget: 3.0,
        healthStatus: "yellow",
      },
    }),
    prisma.client.create({
      data: {
        name: "Luxe Home Staging",
        contactName: "Priya Desai",
        contactEmail: "priya@luxehome.com",
        platforms: JSON.stringify(["meta", "google"]),
        monthlyRetainer: 4000,
        adBudget: 8000,
        roasTarget: 5.0,
        healthStatus: "red",
      },
    }),
  ]);

  // Content items — mix of statuses to show buffer logic
  const today = new Date();
  const day = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    return d;
  };

  for (const client of clients) {
    const bufferDays = client.healthStatus === "green" ? 20 : client.healthStatus === "yellow" ? 10 : 4;
    for (let i = 0; i < bufferDays; i++) {
      await prisma.contentItem.create({
        data: {
          clientId: client.id,
          platform: "meta",
          contentType: i % 3 === 0 ? "reel" : i % 3 === 1 ? "carousel" : "post",
          title: `${client.name} — Post ${i + 1}`,
          status: "scheduled",
          scheduledDate: day(i + 1),
          assignedTo: "Alex",
        },
      });
    }
  }

  // Requests
  await prisma.clientRequest.create({
    data: {
      clientId: clients[1].id,
      type: "revision",
      priority: "high",
      title: "Update gym class schedule graphic",
      description: "New summer classes starting next month. Need updated carousel.",
      status: "new",
      dueDate: day(2),
    },
  });

  await prisma.clientRequest.create({
    data: {
      clientId: clients[2].id,
      type: "new_content",
      priority: "urgent",
      title: "Need before/after staging photos post ASAP",
      description: "Just finished a major project. Client wants it live this week.",
      status: "in_progress",
      assignedTo: "Alex",
      dueDate: day(1),
    },
  });

  // Ad reports (last 2 weeks)
  for (const client of clients) {
    const roasMultiplier = client.healthStatus === "green" ? 1.2 : client.healthStatus === "yellow" ? 0.9 : 0.6;
    for (let week = 0; week < 2; week++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (week + 1) * 7);
      const spend = client.adBudget / 4;
      const revenue = spend * client.roasTarget * roasMultiplier;
      const conversions = Math.round(revenue / 120);
      await prisma.adReport.create({
        data: {
          clientId: client.id,
          platform: "meta",
          weekStart,
          spend,
          impressions: Math.round(spend * 18),
          clicks: Math.round(spend * 0.8),
          conversions,
          revenue,
          roas: parseFloat((revenue / spend).toFixed(2)),
          cpa: parseFloat((spend / Math.max(conversions, 1)).toFixed(2)),
          ctr: parseFloat((0.8 / 18).toFixed(4)),
          topCampaign: `${client.name} — Awareness Q1`,
        },
      });
    }
  }

  console.log("✅ Seed complete — 4 team members, 3 clients, content buffer, requests, and ad reports created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
