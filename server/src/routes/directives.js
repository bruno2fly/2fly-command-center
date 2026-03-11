// ============================================================
// API: DIRECTIVES (Bruno → Agent → Tasks/Content)
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

const AGENT_NAMES = {
  "founder-boss": "Founder Boss",
  "content-system": "Content System",
  "meta-traffic": "Meta Traffic",
  "research-intel": "Research Intel",
  "project-manager": "Project Manager",
  "inbox-triage": "Inbox Triage",
  "approval-feedback": "Approval & Feedback",
  "client-memory": "Client Memory",
};

// Fuzzy match client name from message text
function detectClientFromMessage(message, clients) {
  const lower = (message || "").toLowerCase();
  for (const c of clients) {
    const name = (c.name || "").toLowerCase();
    if (!name) continue;
    // "for Casa Nova" or "Casa Nova" or "casa nova easter"
    if (lower.includes(name) || lower.includes(name.replace(/\s+/g, " "))) return c;
    const parts = name.split(/\s+/);
    if (parts.every((p) => p.length > 2 && lower.includes(p))) return c;
  }
  return null;
}

// POST /api/directives — Bruno sends a directive
router.post("/", async (req, res) => {
  try {
    const { message, agentId, clientId } = req.body || {};
    const agentName = AGENT_NAMES[agentId] || agentId || "Agent";
    const directive = await prisma.directive.create({
      data: {
        message: message || "",
        agentId: agentId || "content-system",
        agentName,
        clientId: clientId || null,
        clientName: null,
        status: "pending",
      },
    });
    res.status(201).json(directive);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/directives — list with filters
router.get("/", async (req, res) => {
  try {
    const { status, agentId, clientId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (agentId) where.agentId = agentId;
    if (clientId) where.clientId = clientId;
    const directives = await prisma.directive.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ directives, total: directives.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/directives/:id — single directive
router.get("/:id", async (req, res) => {
  try {
    const directive = await prisma.directive.findUnique({
      where: { id: req.params.id },
    });
    if (!directive) return res.status(404).json({ error: "Directive not found" });
    res.json(directive);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/directives/:id — update status/result (called by agent when done)
router.patch("/:id", async (req, res) => {
  try {
    const { status, result, tasksCreated, contentCreated, clientId, clientName } = req.body || {};
    const data = {};
    if (status) data.status = status;
    if (result != null) data.result = result;
    if (tasksCreated != null) data.tasksCreated = tasksCreated;
    if (contentCreated != null) data.contentCreated = contentCreated;
    if (clientId != null) data.clientId = clientId;
    if (clientName != null) data.clientName = clientName;
    if (status === "completed" || status === "failed") data.completedAt = new Date();
    const directive = await prisma.directive.update({
      where: { id: req.params.id },
      data,
    });
    res.json(directive);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/directives/:id/process — placeholder: parse message, create tasks/content, update directive
router.post("/:id/process", async (req, res) => {
  try {
    const directive = await prisma.directive.findUnique({
      where: { id: req.params.id },
    });
    if (!directive) return res.status(404).json({ error: "Directive not found" });
    if (directive.status !== "pending") {
      return res.json(directive);
    }

    await prisma.directive.update({
      where: { id: req.params.id },
      data: { status: "processing" },
    });

    const clients = await prisma.client.findMany({ where: { status: "active" } });
    let client = directive.clientId
      ? clients.find((c) => c.id === directive.clientId)
      : detectClientFromMessage(directive.message, clients);
    const message = (directive.message || "").toLowerCase();
    let tasksCreated = 0;
    let contentCreated = 0;
    const clientId = client ? client.id : null;
    const clientName = client ? client.name : null;

    // Keywords: content / post / reel / story / easter / campaign
    const hasContent =
      /content|post|reel|story|carousel|easter|campaign|create|draft|schedule/.test(message);
    // Keywords: task / fix / update / create
    const hasTasks =
      /task|fix|update|create|reminder|follow|check|review|approve/.test(message) || hasContent;

    if (clientId && hasContent) {
      const types = [];
      if (/reel|reels/.test(message)) types.push("reel");
      if (/story|stories/.test(message)) types.push("story");
      if (/carousel/.test(message)) types.push("carousel");
      if (types.length === 0) types.push("post", "reel", "story");
      const titles = [];
      if (/easter/.test(message)) {
        titles.push("Easter campaign - Feed post", "Easter reel", "Easter story", "Easter carousel");
      } else {
        titles.push("Campaign post", "Reel idea", "Story update", "Carousel");
      }
      for (let i = 0; i < Math.min(4, titles.length); i++) {
        await prisma.contentItem.create({
          data: {
            clientId,
            platform: "instagram",
            contentType: types[i] || "post",
            title: titles[i] || `Content ${i + 1}`,
            status: "draft",
            source: "agent",
            directiveId: directive.id,
          },
        });
        contentCreated++;
      }
    }

    if (clientId && hasTasks) {
      const taskTitles = [];
      if (/easter/.test(message)) {
        taskTitles.push("Easter content brief", "Easter asset collection", "Easter calendar approval");
      } else {
        taskTitles.push("Content review", "Asset delivery", "Copy approval");
      }
      for (const title of taskTitles) {
        await prisma.task.create({
          data: {
            clientId,
            title,
            type: "content",
            status: "pending",
            priority: "normal",
            source: "agent",
            directiveId: directive.id,
          },
        });
        tasksCreated++;
      }
    }

    const result = JSON.stringify({
      summary: `Created ${contentCreated} content items and ${tasksCreated} tasks`,
      clientId,
      clientName,
    });

    const updated = await prisma.directive.update({
      where: { id: req.params.id },
      data: {
        status: "completed",
        result,
        tasksCreated,
        contentCreated,
        clientId: clientId ?? directive.clientId,
        clientName: clientName ?? directive.clientName,
        completedAt: new Date(),
      },
    });
    res.json(updated);
  } catch (err) {
    await prisma.directive.update({
      where: { id: req.params.id },
      data: { status: "failed", result: err.message, completedAt: new Date() },
    }).catch(() => {});
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
