// ============================================================
// Seed Agent Actions — sample proposed actions for UI testing
// Run: node server/prisma/seed-agent-actions.js
// Or after server is up: curl -X POST http://localhost:4000/api/agent-actions -H "Content-Type: application/json" -d '{...}'
// ============================================================

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const SAMPLE_ACTIONS = [
  {
    clientName: "Super Crisp",
    agentId: "meta-traffic",
    agentName: "Meta Traffic",
    category: "ads",
    title: "Switch Super Crisp from Lead to Traffic objective",
    reasoning:
      "Current CPL is $167.82 — wildly above the $1-5 restaurant benchmark. The campaign is optimizing for messaging leads but the Toast ordering funnel isn't set up for that flow. With 29.5K impressions and 757 clicks (2.57% CTR), people ARE clicking — they're just not converting to messaging leads because that's not how restaurant ordering works. Switching to Traffic objective will optimize for link clicks to the Toast ordering page, which is the actual conversion point.",
    proposedAction:
      "1. Pause current lead-optimized campaigns\n2. Create new Traffic campaign targeting Wayne State area (3mi radius)\n3. Set objective to Link Clicks optimized for Toast ordering page\n4. Keep daily budget at $24/day\n5. Use existing creative assets (they're performing on CTR)",
    priority: "urgent",
  },
  {
    clientName: "The Shape SPA Miami",
    agentId: "meta-traffic",
    agentName: "Meta Traffic",
    category: "ads",
    title: "Refresh ad creatives for Shape SPA Miami",
    reasoning:
      "CTR has dropped to 1.32%, below the 2%+ benchmark for med spa campaigns. This typically indicates creative fatigue — the audience has seen the same ads too many times. CPL at $26.02 is acceptable but trending upward. Refreshing creatives now will prevent further CPL increases.",
    proposedAction:
      "1. Analyze top-performing ad creative from last 30 days\n2. Create 3 new ad variations using before/after hooks\n3. Add urgency elements (limited availability, seasonal offer)\n4. A/B test new creatives against current\n5. Pause lowest-performing current ads after 3 days if new ones outperform",
    priority: "high",
  },
  {
    clientName: "The Shape Spa FLL",
    agentId: "meta-traffic",
    agentName: "Meta Traffic",
    category: "ads",
    title: "Scale FLL budget — strong ROAS opportunity",
    reasoning:
      "FLL is the best performer: 7.58% CTR, $17.79 CPL with 14 leads from only $249 spend. This is significantly under-spending relative to performance. Scaling budget by 20-30% while maintaining audience targeting should increase lead volume without significantly impacting CPL.",
    proposedAction:
      "1. Increase daily budget by 25% on 'leads website' campaign\n2. Monitor CPL daily for 5 days\n3. If CPL stays under $22, increase another 15%\n4. If CPL exceeds $25, revert to original budget",
    priority: "normal",
  },
];

async function main() {
  const clients = await prisma.client.findMany({ select: { id: true, name: true } });
  const byName = Object.fromEntries(clients.map((c) => [c.name.trim().toLowerCase(), c.id]));

  for (const a of SAMPLE_ACTIONS) {
    const clientId = a.clientName ? byName[a.clientName.trim().toLowerCase()] ?? null : null;
    await prisma.agentAction.create({
      data: {
        clientId,
        clientName: a.clientName,
        agentId: a.agentId,
        agentName: a.agentName,
        category: a.category,
        title: a.title,
        reasoning: a.reasoning,
        proposedAction: a.proposedAction,
        priority: a.priority,
      },
    });
  }
  console.log("✅ Created", SAMPLE_ACTIONS.length, "agent actions");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
