// ============================================================
// Cron at 10 PM daily: generate daily reports for all clients.
// On Friday, also generate weekly wrap (Mon–Fri).
// Run: node server/scripts/generate-reports.js
// ============================================================

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { PrismaClient } = require("@prisma/client");
const { generateDailyReport, getMonday } = require("../src/lib/reportEngine");

const prisma = new PrismaClient();

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const dayOfWeek = new Date().getDay(); // 0 = Sun, 5 = Fri

  const clients = await prisma.client.findMany({ where: { status: "active" } });
  console.log(`Generating daily reports for ${clients.length} clients (${today})...`);

  for (const client of clients) {
    try {
      const report = await generateDailyReport(prisma, client.id, today);
      console.log(`  ${client.name}: ${report.summary}`);
    } catch (err) {
      console.error(`  ${client.name}: ${err.message}`);
    }
  }

  if (dayOfWeek === 5) {
    console.log("Friday — generating weekly wraps...");
    const monday = getMonday(new Date());
    const weekStart = monday.toISOString().slice(0, 10);
    const weekEnd = today;
    const { generateWeeklyWrap } = require("../src/lib/reportEngine");

    for (const client of clients) {
      try {
        const wrap = await generateWeeklyWrap(prisma, client.id, weekStart, weekEnd);
        console.log(`  Weekly ${client.name}: ${wrap.summary}`);
      } catch (err) {
        console.error(`  Weekly ${client.name}: ${err.message}`);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
