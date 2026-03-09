// Update real client data — retainers, ad budgets, contacts
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const updates = [
  {
    name: "The Shape SPA Miami",
    contactName: "Grace",
    contactEmail: "theshapespa@gmail.com",
    monthlyRetainer: 500,
    adBudget: 1250, // avg of 1k-1.5k
    notes: "Primary contact: Grace. Mixed PT/EN communication. WhatsApp group: 120363153256877127@g.us. Location: Miami, FL. Services: body treatments, facials, wellness. Ads: Meta, $1k-1.5k/mo.",
  },
  {
    name: "The Shape Spa FLL",
    contactName: "Grace",
    contactEmail: "theshapespa@gmail.com",
    monthlyRetainer: 500,
    adBudget: 1250,
    notes: "Fort Lauderdale location. Same owner as Miami (Grace). Services: body treatments, facials, wellness. Ads: Meta, $1k-1.5k/mo.",
  },
  {
    name: "Sudbury Point Grill",
    contactName: "Rodrigo",
    contactEmail: "sudburypointgrill@gmail.com",
    monthlyRetainer: 700,
    adBudget: 0,
    notes: "Restaurant in Sudbury, MA. American grill cuisine. No ads.",
  },
  {
    name: "Pro Fortuna",
    contactName: "Julianna",
    contactEmail: "juliann@profortuna.com",
    monthlyRetainer: 1000,
    adBudget: 0,
    notes: "Brazilian market business. No ads.",
  },
  {
    name: "Casa Nova",
    contactName: "Adriana",
    contactEmail: "contact@casanovabutchercafe.com",
    monthlyRetainer: 1200,
    adBudget: 750, // avg of 500-1k, but not running atm
    notes: "Restaurant client. Ad budget $500-1k but NOT running currently. Butcher cafe concept.",
  },
  {
    name: "Ardan Med Spa",
    contactName: "Ana",
    contactEmail: "anaelisams13@gmail.com",
    monthlyRetainer: 1300,
    adBudget: 800,
    notes: "Med spa. Active ads at $800/mo. Phase 2 for WhatsApp bridge expansion.",
  },
  {
    name: "This is it Brazil",
    contactName: "Julianna",
    contactEmail: "thewellnesswayinfo@gmail.com",
    monthlyRetainer: 1100,
    adBudget: 750, // avg 500-1k, not running yet
    notes: "Brazilian market business. Community engagement focus. Ad budget $500-1k but NOT running yet.",
  },
  {
    name: "Super Crisp",
    contactName: "Emily",
    contactEmail: "emily@imanoodles.com",
    monthlyRetainer: 1400,
    adBudget: 750, // avg 500-1k
    notes: "Restaurant client. Ads $500-1k/mo.",
  },
  {
    name: "Hafiza",
    contactName: "Hafiza",
    contactEmail: "",
    monthlyRetainer: 800,
    adBudget: 0,
    notes: "Spa/wellness client. No ads currently.",
  },
  {
    name: "Cristiane Amorim",
    contactName: "Cristiane",
    contactEmail: "contact@cristianeamorim.com",
    monthlyRetainer: 800,
    adBudget: 0,
    notes: "Beauty professional. Transformation content, booking tools. No ads currently.",
  },
];

async function main() {
  for (const u of updates) {
    const client = await prisma.client.findFirst({ where: { name: u.name } });
    if (!client) {
      console.log(`⚠️  Not found: ${u.name}`);
      continue;
    }
    await prisma.client.update({
      where: { id: client.id },
      data: {
        contactName: u.contactName,
        contactEmail: u.contactEmail,
        monthlyRetainer: u.monthlyRetainer,
        adBudget: u.adBudget,
        notes: u.notes,
      },
    });
    console.log(`✅ Updated: ${u.name} — $${u.monthlyRetainer}/mo retainer, $${u.adBudget} ads`);
  }

  const total = updates.reduce((s, u) => s + u.monthlyRetainer, 0);
  console.log(`\n💰 Total MRR: $${total.toLocaleString()}/mo`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
