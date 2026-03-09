// Seed 2FLY team members
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const team = [
    {
      name: "Bruno Lima",
      email: "bruno@2flydigital.com",
      role: "founder",
      weeklyCapacity: 2400, // 40h
      notes: "Founder & CEO. Handles strategy, client relationships, approvals, and agency direction.",
    },
    {
      name: "Designer",
      role: "designer",
      weeklyCapacity: 2400,
      notes: "In-house designer. Handles social media graphics, ad creatives, brand assets, website design.",
    },
    {
      name: "Social Media",
      role: "social_media",
      weeklyCapacity: 2400,
      notes: "Social media manager. Handles content scheduling, community management, engagement.",
    },
  ];

  for (const member of team) {
    const existing = await prisma.teamMember.findFirst({ where: { name: member.name } });
    if (existing) {
      console.log(`⏭️  ${member.name} already exists`);
      continue;
    }
    await prisma.teamMember.create({ data: member });
    console.log(`✅ Created: ${member.name} (${member.role})`);
  }

  const all = await prisma.teamMember.findMany();
  console.log(`\n👥 ${all.length} team members total`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
