// ============================================================
// REAL INVOICE SEED — 2FLY actual billing schedule
// ============================================================

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Bruno's actual billing schedule and amounts
const BILLING_SCHEDULE = {
  // Due 1st of month
  "Ardan Med Spa": { amount: 1300, dueDay: 1 },
  "Casa Nova": { amount: 1200, dueDay: 1 },
  "This is it Brazil": { amount: 800, dueDay: 1 },
  "Pro Fortuna": { amount: 1000, dueDay: 1 },
  "Sudbury Point Grill": { amount: 700, dueDay: 1 },
  "Super Crisp": { amount: 600, dueDay: 1 },
  
  // Due 10th of month  
  "The Shape SPA Miami": { amount: 500, dueDay: 10 },
  "The Shape Spa FLL": { amount: 500, dueDay: 10 },
  
  // Due 27th of month
  "Cafe St. Petersburg": { amount: 800, dueDay: 27 },
};

// Who paid for April already
const APRIL_PAID = ["Cafe St. Petersburg", "Super Crisp"];

function getInvoiceDate(year, month, day) {
  return new Date(year, month - 1, day); // month is 0-indexed
}

async function main() {
  console.log("🧾 Creating REAL invoices with correct billing schedule...");
  
  // Clear existing invoices
  await prisma.invoice.deleteMany({});
  console.log("🗑️  Cleared old invoices");
  
  const clients = await prisma.client.findMany();
  let invNum = 1001; // Start from 1001
  
  for (const client of clients) {
    const schedule = BILLING_SCHEDULE[client.name];
    if (!schedule) {
      console.log(`⚠️  No billing schedule for ${client.name} - skipping`);
      continue;
    }
    
    const { amount, dueDay } = schedule;
    
    // Update client monthly retainer in database
    await prisma.client.update({
      where: { id: client.id },
      data: { monthlyRetainer: amount }
    });
    
    // March 2026 invoice (most should be overdue now)
    const marchDue = getInvoiceDate(2026, 3, dueDay);
    const marchPaid = Math.random() > 0.3; // 70% paid March
    
    await prisma.invoice.create({
      data: {
        clientId: client.id,
        invoiceNumber: `INV-${invNum++}`,
        amount: amount,
        dueDate: marchDue,
        issuedDate: getInvoiceDate(2026, 2, 25), // Issued end of Feb
        status: marchPaid ? "paid" : "overdue",
        paidDate: marchPaid ? getInvoiceDate(2026, 3, dueDay + 2) : null,
        paidAmount: marchPaid ? amount : null,
        description: `March 2026 Digital Marketing Retainer`,
        type: "retainer",
      },
    });
    
    // April 2026 invoice  
    const aprilDue = getInvoiceDate(2026, 4, dueDay);
    const isAprilPaid = APRIL_PAID.includes(client.name);
    const today = new Date();
    
    // Determine status based on due date and payment
    let aprilStatus = "sent";
    if (isAprilPaid) {
      aprilStatus = "paid";
    } else if (aprilDue <= today) {
      aprilStatus = "overdue";
    }
    
    await prisma.invoice.create({
      data: {
        clientId: client.id,
        invoiceNumber: `INV-${invNum++}`,
        amount: amount,
        dueDate: aprilDue,
        issuedDate: getInvoiceDate(2026, 3, 25), // Issued end of March
        status: aprilStatus,
        paidDate: isAprilPaid ? getInvoiceDate(2026, 4, 1) : null,
        paidAmount: isAprilPaid ? amount : null,
        description: `April 2026 Digital Marketing Retainer`,
        type: "retainer",
      },
    });
    
    console.log(`💰 ${client.name}: $${amount} (due ${dueDay}th) - April ${isAprilPaid ? "PAID" : "PENDING"}`);
  }
  
  // Summary
  const allInvoices = await prisma.invoice.findMany({
    include: { client: { select: { name: true } } }
  });
  
  const overdue = allInvoices.filter(i => i.status === "overdue");
  const totalOverdue = overdue.reduce((sum, i) => sum + i.amount, 0);
  
  const april = allInvoices.filter(i => i.description.includes("April 2026"));
  const aprilPaid = april.filter(i => i.status === "paid");
  const aprilPending = april.filter(i => i.status === "sent" || i.status === "overdue");
  
  console.log(`\n📊 INVOICE SUMMARY:`);
  console.log(`   Total invoices: ${allInvoices.length}`);
  console.log(`   📈 April paid: ${aprilPaid.length} ($${aprilPaid.reduce((s,i) => s + i.amount, 0)})`);
  console.log(`   ⏳ April pending: ${aprilPending.length} ($${aprilPending.reduce((s,i) => s + i.amount, 0)})`);
  console.log(`   🔴 Overdue: ${overdue.length} ($${totalOverdue.toLocaleString()})`);
  
  // List overdue for action
  if (overdue.length > 0) {
    console.log(`\n🚨 OVERDUE INVOICES TO FOLLOW UP:`);
    overdue.forEach(inv => {
      const daysPast = Math.floor((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24));
      console.log(`   ${inv.client.name}: $${inv.amount} (${daysPast} days past due)`);
    });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());