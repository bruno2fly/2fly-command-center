// ============================================================
// REAL SEED — 2FLY Digital Marketing actual clients
// Run: node server/prisma/seed-real.js
// ============================================================

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Clear existing data (order matters — dependents first)
  await prisma.ad.deleteMany({}).catch(() => {});
  await prisma.adSet.deleteMany({}).catch(() => {});
  await prisma.adCampaign.deleteMany({}).catch(() => {});
  await prisma.invoice.deleteMany({}).catch(() => {});
  await prisma.metaConnection.deleteMany({}).catch(() => {});
  await prisma.adReport.deleteMany({});
  await prisma.clientRequest.deleteMany({});
  await prisma.contentItem.deleteMany({});
  await prisma.healthLog.deleteMany({});
  await prisma.whatsappMessage.deleteMany({});
  await prisma.whatsappConversation.deleteMany({});
  await prisma.client.deleteMany({});
  await prisma.teamMember.deleteMany({});

  console.log("🗑️  Cleared demo data");

  // ── Team ──
  await prisma.teamMember.createMany({
    data: [
      { name: "Bruno Lima", email: "bruno@2flydigital.com", role: "founder" },
    ],
  });

  // ── Real Clients ──
  const clientsData = [
    {
      name: "The Shape SPA Miami",
      contactName: "Grace",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Primary contact: Grace. Mixed PT/EN communication. WhatsApp group: 120363153256877127@g.us. Location: Miami, FL. Services: body treatments, facials, wellness.",
    },
    {
      name: "The Shape Spa FLL",
      contactName: "Grace",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Fort Lauderdale location. Same owner as Miami (Grace). Services: body treatments, facials, wellness.",
    },
    {
      name: "Sudbury Point Grill",
      contactName: "",
      platforms: JSON.stringify(["meta", "instagram", "google"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "yellow",
      notes: "Restaurant in Sudbury, MA. American grill cuisine.",
    },
    {
      name: "Pro Fortuna",
      contactName: "",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Brazilian market business.",
    },
    {
      name: "Casa Nova",
      contactName: "",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "yellow",
      notes: "Restaurant client.",
    },
    {
      name: "Ardan Med Spa",
      contactName: "",
      platforms: JSON.stringify(["meta", "instagram", "google"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Med spa. Phase 2 for WhatsApp bridge expansion.",
    },
    {
      name: "This is it Brazil",
      contactName: "",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Brazilian market business. Community engagement focus.",
    },
    {
      name: "Super Crisp",
      contactName: "",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Restaurant client.",
    },
    {
      name: "Hafiza",
      contactName: "",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Spa/wellness client.",
    },
    {
      name: "Cristiane Amorim",
      contactName: "Cristiane",
      platforms: JSON.stringify(["meta", "instagram"]),
      monthlyRetainer: 0,
      adBudget: 0,
      roasTarget: 3.0,
      healthStatus: "green",
      notes: "Beauty professional. Transformation content, booking tools.",
    },
  ];

  const clients = [];
  for (const data of clientsData) {
    const client = await prisma.client.create({ data });
    clients.push(client);
    console.log(`✅ Created: ${client.name} (${client.id})`);
  }

  console.log(`\n🎉 Seed complete — ${clients.length} real clients created.`);
  console.log("\n📋 Client IDs for reference:");
  clients.forEach(c => console.log(`  ${c.name}: ${c.id}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
