// Seed realistic invoices for all 2FLY clients
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function day(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d;
}

async function main() {
  const clients = await prisma.client.findMany({ where: { status: "active" } });
  let invNum = 100;

  for (const client of clients) {
    // March retainer invoice
    const marchDue = day(-5); // due 5 days ago
    const isPaid = Math.random() > 0.4; // 60% chance paid
    
    await prisma.invoice.create({
      data: {
        clientId: client.id,
        invoiceNumber: `INV-${invNum++}`,
        amount: client.monthlyRetainer,
        dueDate: marchDue,
        issuedDate: day(-20),
        status: isPaid ? "paid" : "overdue",
        paidDate: isPaid ? day(-3) : null,
        paidAmount: isPaid ? client.monthlyRetainer : null,
        description: `March 2026 retainer — ${client.name}`,
        type: "retainer",
      },
    });

    // April retainer invoice (upcoming)
    await prisma.invoice.create({
      data: {
        clientId: client.id,
        invoiceNumber: `INV-${invNum++}`,
        amount: client.monthlyRetainer,
        dueDate: day(25),
        issuedDate: day(-1),
        status: "sent",
        description: `April 2026 retainer — ${client.name}`,
        type: "retainer",
      },
    });

    // Ad spend invoice for clients with ads
    if (client.adBudget > 0) {
      const adPaid = Math.random() > 0.5;
      await prisma.invoice.create({
        data: {
          clientId: client.id,
          invoiceNumber: `INV-${invNum++}`,
          amount: client.adBudget,
          dueDate: day(-2),
          issuedDate: day(-15),
          status: adPaid ? "paid" : "sent",
          paidDate: adPaid ? day(-1) : null,
          paidAmount: adPaid ? client.adBudget : null,
          description: `March 2026 ad spend — ${client.name}`,
          type: "ad_spend",
        },
      });
    }

    console.log(`💰 Created invoices for ${client.name} ($${client.monthlyRetainer}/mo)`);
  }

  // Summary
  const all = await prisma.invoice.findMany();
  const overdue = all.filter(i => i.status === "overdue");
  const totalOverdue = overdue.reduce((s, i) => s + i.amount, 0);
  console.log(`\n✅ ${all.length} invoices created`);
  console.log(`🔴 ${overdue.length} overdue ($${totalOverdue.toLocaleString()})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
