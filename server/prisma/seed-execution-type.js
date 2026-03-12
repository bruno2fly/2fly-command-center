/**
 * One-time: set executionType on existing AgentActions.
 * - FLL "Scale Budget" → auto
 * - All other pending → manual
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const pending = await prisma.agentAction.findMany({
    where: { status: { in: ["pending", "proposed"] } },
    select: { id: true, title: true, clientName: true },
  });
  const fllScale = pending.filter(
    (a) =>
      /scale/i.test(a.title) &&
      /budget/i.test(a.title) &&
      (/fll/i.test(a.title) || (a.clientName && /fll/i.test(a.clientName)))
  );
  for (const a of fllScale) {
    await prisma.agentAction.update({ where: { id: a.id }, data: { executionType: "auto" } });
  }
  console.log("Set executionType to auto for", fllScale.length, "FLL/Scale Budget action(s)");

  const manualIds = pending.filter((a) => !fllScale.find((f) => f.id === a.id)).map((a) => a.id);
  if (manualIds.length > 0) {
    await prisma.agentAction.updateMany({
      where: { id: { in: manualIds } },
      data: { executionType: "manual" },
    });
    console.log("Set executionType to manual for", manualIds.length, "pending action(s)");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
