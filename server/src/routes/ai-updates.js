const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

// GET /api/ai-updates — list all, newest first
router.get("/", async (req, res) => {
  try {
    const updates = await prisma.aiUpdate.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-updates — create (used by Research Intel agent)
router.post("/", async (req, res) => {
  try {
    const { title, summary, impact, action, source, category, relevance } = req.body;
    if (!title || !summary) return res.status(400).json({ error: "title and summary required" });
    const update = await prisma.aiUpdate.create({
      data: {
        title,
        summary,
        impact: impact || null,
        action: action || null,
        source: source || null,
        category: category || "update",
        relevance: relevance || "medium",
      },
    });
    res.status(201).json(update);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-updates/bulk — batch create
router.post("/bulk", async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) return res.status(400).json({ error: "updates array required" });
    const created = [];
    for (const u of updates.slice(0, 20)) {
      if (!u.title || !u.summary) continue;
      const record = await prisma.aiUpdate.create({
        data: {
          title: u.title,
          summary: u.summary,
          impact: u.impact || null,
          action: u.action || null,
          source: u.source || null,
          category: u.category || "update",
          relevance: u.relevance || "medium",
        },
      });
      created.push(record);
    }
    res.status(201).json({ created: created.length, updates: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ai-updates/:id
router.delete("/:id", async (req, res) => {
  try {
    await prisma.aiUpdate.delete({ where: { id: req.params.id } });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
