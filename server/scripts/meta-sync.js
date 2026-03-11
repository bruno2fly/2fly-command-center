#!/usr/bin/env node
/**
 * Meta Ads Sync — Pulls real data from Meta Marketing API into CC database.
 * Run daily via cron or manually: node scripts/meta-sync.js
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const TOKEN = process.env.META_ACCESS_TOKEN;
const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}`;

const AD_ACCOUNTS = [
  { accountId: 'act_1595667451424210', clientId: 'cmml1eoiv000112dhgab4sa2f', label: 'Shape SPA Miami' },
  { accountId: 'act_862498366234569', clientId: 'cmml1eoiw000212dh9pbvfqig', label: 'Shape Spa FLL' },
  { accountId: 'act_2118394678903177', clientId: 'cmml1eoj0000812dhaqydcbuw', label: 'Super Crisp' },
];

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meta API ${res.status}: ${await res.text()}`);
  return res.json();
}

function getMonday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  d.setDate(d.getDate() - day + (day === 0 ? -6 : 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

async function findClient(clientName) {
  const all = await prisma.client.findMany();
  return all.find(c =>
    c.name.toLowerCase().includes(clientName.toLowerCase()) ||
    clientName.toLowerCase().includes(c.name.toLowerCase().replace('the ', ''))
  );
}

async function syncAccount({ accountId, clientId, label }) {
  console.log(`\n📊 ${label} (${accountId})`);

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) { console.log(`  ⚠️ Client not found`); return null; }
  console.log(`  → ${client.name} (${client.id})`);

  // 1. Sync campaigns (upsert by name + clientId)
  const campaigns = await fetchJSON(
    `${BASE_URL}/${accountId}/campaigns?fields=name,status,objective,daily_budget,lifetime_budget&access_token=${TOKEN}`
  );

  for (const c of campaigns.data || []) {
    const existing = await prisma.adCampaign.findFirst({
      where: { clientId: client.id, name: c.name }
    });

    const data = {
      clientId: client.id,
      name: c.name,
      status: c.status.toLowerCase(),
      objective: c.objective || 'LEADS',
      dailyBudget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
      lifetimeBudget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
      createdBy: 'meta-sync',
    };

    if (existing) {
      await prisma.adCampaign.update({ where: { id: existing.id }, data });
    } else {
      await prisma.adCampaign.create({ data });
    }
    console.log(`  Campaign: ${c.name} [${c.status}]`);
  }

  // 2. Fetch account insights (last 7 days)
  const insights = await fetchJSON(
    `${BASE_URL}/${accountId}/insights?fields=spend,impressions,clicks,cpc,cpm,ctr,actions,cost_per_action_type&date_preset=last_7d&access_token=${TOKEN}`
  );

  if (!insights.data?.[0]) {
    console.log(`  No insights data`);
    return { label, spend: '0', leads: 0, cpl: '0' };
  }

  const ins = insights.data[0];
  const leads = parseInt(
    (ins.actions || []).find(a => a.action_type === 'lead')?.value ||
    (ins.actions || []).find(a => a.action_type === 'onsite_conversion.messaging_first_reply')?.value ||
    (ins.actions || []).find(a => a.action_type === 'onsite_conversion.total_messaging_connection')?.value || '0'
  );
  const cpl = parseFloat(
    (ins.cost_per_action_type || []).find(a => a.action_type === 'lead')?.value ||
    (ins.cost_per_action_type || []).find(a => a.action_type === 'onsite_conversion.messaging_first_reply')?.value ||
    (ins.cost_per_action_type || []).find(a => a.action_type === 'onsite_conversion.total_messaging_connection')?.value || '0'
  );
  const topCampaign = (campaigns.data || []).find(c => c.status === 'ACTIVE')?.name || null;
  const weekStart = getMonday(ins.date_start);

  // Delete existing report for same week + platform to avoid dupes
  await prisma.adReport.deleteMany({
    where: { clientId: client.id, platform: `meta:${label}`, weekStart }
  });

  await prisma.adReport.create({
    data: {
      clientId: client.id,
      platform: `meta:${label}`,
      weekStart,
      spend: parseFloat(ins.spend),
      impressions: parseInt(ins.impressions),
      clicks: parseInt(ins.clicks),
      conversions: leads,
      revenue: 0,
      roas: 0,
      cpa: leads > 0 ? parseFloat(ins.spend) / leads : 0,
      ctr: parseFloat(ins.ctr),
      topCampaign,
      notes: `${leads} leads @ $${cpl.toFixed(2)}/lead | ${ins.date_start} → ${ins.date_stop}`,
    }
  });

  console.log(`  📈 $${ins.spend} · ${ins.impressions} impr · ${ins.clicks} clicks · ${leads} leads · $${cpl.toFixed(2)}/lead`);

  // 3. Update client ad budget with actual spend
  await prisma.client.update({
    where: { id: client.id },
    data: { adBudget: parseFloat(ins.spend) }
  });

  return { label, spend: ins.spend, leads, cpl: cpl.toFixed(2) };
}

async function main() {
  console.log('🔄 Meta Ads Sync\n');
  if (!TOKEN) { console.error('❌ META_ACCESS_TOKEN not set'); process.exit(1); }

  const results = [];
  for (const acct of AD_ACCOUNTS) {
    try {
      const r = await syncAccount(acct);
      if (r) results.push(r);
    } catch (err) {
      console.error(`  ❌ ${acct.label}: ${err.message}`);
    }
  }

  console.log('\n✅ Done');
  console.log('─────────────────────────────────');
  for (const r of results) {
    console.log(`  ${r.label}: $${r.spend} · ${r.leads} leads · $${r.cpl}/lead`);
  }

  await prisma.$disconnect();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
