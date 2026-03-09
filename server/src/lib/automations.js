// ============================================================
// AUTOMATIONS — Scheduled jobs that keep the system alive
// ============================================================
// Uses node-cron. All times in server timezone.
// In production, swap for a proper job queue (BullMQ, etc).
//
// Agent integration: alerts are now routed through OpenClaw agents
// for AI-powered analysis and recommendations.
// ============================================================

const cron = require("node-cron");
const { PrismaClient } = require("@prisma/client");
const { recomputeAllClients } = require("./statusEngine");

const prisma = new PrismaClient();

// ─── Agent notification helper ─────────────────────────────
// Sends alerts to OpenClaw agents via the Anthropic API directly.
// Uses the same openclawClient that the chat panel uses.
// Falls back to console.log if the API is unreachable.

async function notifyAgent(agentId, message) {
  try {
    // Dynamic import of the TypeScript client (compiled to JS at runtime via tsx/ts-node)
    const { sendToAgent } = require("./openclawClient");
    const result = await sendToAgent(agentId, message, [], `automation-${agentId}`);
    console.log(`[AGENT:${agentId}] ${result.content.slice(0, 200)}`);
    return result.content;
  } catch (err) {
    console.warn(`[AGENT:${agentId}] API unreachable: ${err.message}`);
    return null;
  }
}

function registerAutomations() {
  console.log("⚙️  Registering automations (with agent integration)...");

  // ─── 1. Health recompute — every 2 hours ────────────────
  // Recalculates green/yellow/red for all active clients.
  // NEW: Routes RED alerts to founder-boss for analysis.
  cron.schedule("0 */2 * * *", async () => {
    console.log("[CRON] Recomputing client health...");
    try {
      const results = await recomputeAllClients();
      const redClients = results.filter((r) => r.overall === "red");
      const yellowClients = results.filter((r) => r.overall === "yellow");

      if (redClients.length > 0) {
        const clientList = redClients.map((c) => {
          const issues = [];
          if (c.modules.contentBuffer.status === "red") issues.push(`buffer: ${c.modules.contentBuffer.bufferDays} days`);
          if (c.modules.requests.status === "red") issues.push(`${c.modules.requests.pendingCount} open requests`);
          if (c.modules.ads.status === "red") issues.push(`ROAS: ${c.modules.ads.roas}`);
          return `• ${c.clientName}: ${issues.join(", ")}`;
        }).join("\n");

        const alertMsg = `[AUTOMATED ALERT] ${redClients.length} client(s) in RED status as of ${new Date().toLocaleString()}:\n\n${clientList}\n\n${yellowClients.length} client(s) in YELLOW.\n\nWhat actions should I prioritize today? Give me your top 3 recommendations.`;

        console.log(`[ALERT] ${redClients.length} client(s) in RED:`, redClients.map((c) => c.clientName).join(", "));

        // Ask founder-boss for analysis
        await notifyAgent("founder-boss", alertMsg);
      }

      console.log("[CRON] Health recompute complete.");
    } catch (err) {
      console.error("[CRON] Health recompute failed:", err);
    }
  });

  // ─── 2. SLA breach checker — every hour ─────────────────
  // Marks requests as breached if past due date.
  // NEW: Notifies project-manager agent about breaches.
  cron.schedule("0 * * * *", async () => {
    console.log("[CRON] Checking SLA breaches...");
    try {
      const now = new Date();

      // Find requests that are about to breach (for early warning)
      const aboutToBreach = await prisma.clientRequest.findMany({
        where: {
          status: { notIn: ["completed", "closed"] },
          dueDate: { gt: now, lt: new Date(now.getTime() + 4 * 60 * 60 * 1000) }, // within 4 hours
          slaBreach: false,
        },
        include: { client: { select: { name: true } } },
      });

      // Mark actually breached
      const breached = await prisma.clientRequest.updateMany({
        where: {
          status: { notIn: ["completed", "closed"] },
          dueDate: { lt: now },
          slaBreach: false,
        },
        data: { slaBreach: true },
      });

      if (breached.count > 0 || aboutToBreach.length > 0) {
        let alertMsg = `[AUTOMATED ALERT] SLA Check at ${now.toLocaleString()}:\n`;

        if (breached.count > 0) {
          alertMsg += `\n${breached.count} request(s) just breached SLA.\n`;
        }

        if (aboutToBreach.length > 0) {
          alertMsg += `\n${aboutToBreach.length} request(s) will breach within 4 hours:\n`;
          aboutToBreach.forEach((r) => {
            alertMsg += `• "${r.title}" for ${r.client.name} (due: ${new Date(r.dueDate).toLocaleString()})\n`;
          });
        }

        alertMsg += "\nPlease create follow-up tasks for these and assign them to the right team member.";

        console.log(`[ALERT] ${breached.count} breached, ${aboutToBreach.length} at risk`);

        // Notify project-manager
        await notifyAgent("project-manager", alertMsg);
      }
    } catch (err) {
      console.error("[CRON] SLA check failed:", err);
    }
  });

  // ─── 3. Content auto-publish — daily at 6 AM ───────────
  // Moves "scheduled" items to "published" if their date has passed.
  cron.schedule("0 6 * * *", async () => {
    console.log("[CRON] Auto-publishing past-due content...");
    try {
      const now = new Date();
      const published = await prisma.contentItem.updateMany({
        where: {
          status: "scheduled",
          scheduledDate: { lt: now },
        },
        data: {
          status: "published",
          publishedDate: now,
        },
      });
      console.log(`[CRON] Marked ${published.count} item(s) as published.`);

      // Let content-system know what was published
      if (published.count > 0) {
        await notifyAgent("content-system", `[AUTOMATED] ${published.count} content item(s) were auto-published today. Please verify they went live correctly and log any issues.`);
      }
    } catch (err) {
      console.error("[CRON] Auto-publish failed:", err);
    }
  });

  // ─── 4. Monday morning report — every Monday at 8 AM ───
  // Generates a summary and sends it to founder-boss for analysis.
  cron.schedule("0 8 * * 1", async () => {
    console.log("[CRON] Generating Monday morning report...");
    try {
      const results = await recomputeAllClients();
      const summary = {
        date: new Date().toISOString().slice(0, 10),
        totalClients: results.length,
        green: results.filter((r) => r.overall === "green").length,
        yellow: results.filter((r) => r.overall === "yellow").length,
        red: results.filter((r) => r.overall === "red").length,
        details: results.map((r) => ({
          client: r.clientName,
          health: r.overall,
          bufferDays: r.modules.contentBuffer.bufferDays,
          openRequests: r.modules.requests.pendingCount,
          roas: r.modules.ads.roas,
        })),
      };

      console.log("[REPORT]", JSON.stringify(summary, null, 2));

      // Send to founder-boss for strategic analysis
      const pulseMsg = `[MONDAY MORNING PULSE] ${summary.date}

Overall: ${summary.totalClients} clients — ${summary.green} green, ${summary.yellow} yellow, ${summary.red} red.

${summary.details.map((d) => `• ${d.client}: ${d.health.toUpperCase()} — buffer: ${d.bufferDays}d, requests: ${d.openRequests}, ROAS: ${d.roas || "n/a"}`).join("\n")}

Please provide:
1. Top 3 priorities for this week
2. Any clients that need immediate attention
3. One strategic recommendation for the agency`;

      await notifyAgent("founder-boss", pulseMsg);
    } catch (err) {
      console.error("[CRON] Monday report failed:", err);
    }
  });

  // ─── 5. Weekly research cycle — Sunday at 8 PM ──────────
  // Triggers Research Intelligence to scan all clients.
  cron.schedule("0 20 * * 0", async () => {
    console.log("[CRON] Triggering weekly research cycle...");
    try {
      const researchBrief = `[WEEKLY RESEARCH TRIGGER] ${new Date().toISOString().slice(0, 10)}

This is the automated weekly research trigger. Please:
1. Use get_clients to get the full client list
2. For each active client, research: competitive landscape, market trends, local events, content opportunities
3. Focus on TIME-SENSITIVE findings (upcoming events, seasonal moments, trending content formats)
4. Produce 2-4 insights and 3-5 ideas per client
5. Save key findings using update_client (add to notes)
6. Create draft content items for the best time-sensitive ideas

Start with the clients that have the most urgent needs (RED or YELLOW health status).`;

      await notifyAgent("research-intel", researchBrief);
      console.log("[CRON] Research cycle triggered.");
    } catch (err) {
      console.error("[CRON] Research trigger failed:", err);
    }
  });

  console.log("✅ Automations registered (with agent integration):");
  console.log("   • Health recompute — every 2h → alerts founder-boss on RED");
  console.log("   • SLA breach check — every 1h → alerts project-manager");
  console.log("   • Content auto-publish — daily 6 AM → notifies content-system");
  console.log("   • Monday morning report — Mon 8 AM → analyzed by founder-boss");
  console.log("   • Weekly research — Sun 8 PM → triggers research-intel");
}

module.exports = { registerAutomations };
