const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

/** Strip agent preamble — find first markdown heading or --- */
function cleanAgentOutput(text) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("# ") || line.startsWith("## ") || line === "---") {
      return lines.slice(i).join("\n").trim();
    }
  }
  return text.trim();
}

// GET /api/ai-updates — list by status (default: all non-deleted), newest first
router.get("/", async (req, res) => {
  try {
    const { status } = req.query;
    const where = status
      ? { status: String(status) }
      : { status: { not: "deleted" } };
    const updates = await prisma.aiUpdate.findMany({
      where,
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

// PATCH /api/ai-updates/:id/status — transition status with validation
const ALLOWED_TRANSITIONS = {
  inbox:    ["for_2fly", "archived", "deleted"],
  for_2fly: ["archived"],
  archived: ["for_2fly", "deleted"],
};

router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "status required" });

    const item = await prisma.aiUpdate.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: "Not found" });

    const allowed = ALLOWED_TRANSITIONS[item.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from "${item.status}" to "${status}"` });
    }

    const updated = await prisma.aiUpdate.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/ai-updates/:id — update fields (deep research, strategy, etc.)
router.patch("/:id", async (req, res) => {
  try {
    const update = await prisma.aiUpdate.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(update);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/ai-updates/:id/go-deep — trigger deep research via OpenClaw agent
router.post("/:id/go-deep", async (req, res) => {
  try {
    const update = await prisma.aiUpdate.findUnique({ where: { id: req.params.id } });
    if (!update) return res.status(404).json({ error: "Not found" });

    // Mark as loading
    await prisma.aiUpdate.update({
      where: { id: req.params.id },
      data: { deepStatus: "loading" },
    });

    // Trigger agent in background
    const { execFile } = require("child_process");
    const prompt = `Deep research this AI news item. Provide a comprehensive analysis in markdown format:

Title: ${update.title}
Summary: ${update.summary}
Impact: ${update.impact || "N/A"}

Include:
1. What exactly happened and why it matters
2. Key players and their positions
3. Technical details (if applicable)
4. Market implications
5. Timeline and what to watch for
6. How this specifically affects a marketing agency using AI agents (like 2FLY)

Be thorough but concise. Use headers and bullet points.`;

    execFile("openclaw", ["agent", "--agent", "research-intel", "--json", "-m", prompt], 
      { timeout: 300000 },
      async (err, stdout) => {
        try {
          let research = "";
          if (err) {
            research = "Deep research failed: " + (err.message || "timeout");
          } else {
            try {
              const parsed = JSON.parse(stdout);
              // openclaw agent --json returns { result: { payloads: [{ text }] } }
              if (parsed.result?.payloads?.length) {
                research = parsed.result.payloads.map(p => p.text).filter(Boolean).join("\n\n");
              } else {
                research = parsed.response || parsed.message || stdout;
              }
            } catch {
              research = stdout;
            }
          }
          await prisma.aiUpdate.update({
            where: { id: req.params.id },
            data: { deepResearch: cleanAgentOutput(research), deepStatus: "done" },
          });
        } catch (e) {
          console.error("Deep research save error:", e);
        }
      }
    );

    res.json({ status: "loading", message: "Deep research started" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai-updates/:id/strategize — create action strategy plan
router.post("/:id/strategize", async (req, res) => {
  try {
    const update = await prisma.aiUpdate.findUnique({ where: { id: req.params.id } });
    if (!update) return res.status(404).json({ error: "Not found" });

    // Mark as loading
    await prisma.aiUpdate.update({
      where: { id: req.params.id },
      data: { strategyStatus: "loading" },
    });

    // Trigger agent in background
    const { execFile } = require("child_process");
    const prompt = `Create a step-by-step strategy plan for how 2FLY Digital Marketing should act on this opportunity. Output in markdown.

Title: ${update.title}
Summary: ${update.summary}
Impact: ${update.impact || "N/A"}
Deep Research: ${(update.deepResearch || "").slice(0, 2000)}

Include:
1. OPPORTUNITY SUMMARY — What exactly we're acting on (1-2 lines)
2. EXPECTED OUTCOME — What we gain ($, capability, competitive edge)
3. STEP-BY-STEP PLAN:
   - Step 1: [action] — Owner: [who] — Deadline: [when]
   - Step 2: ...
   - Step 3: ...
   (max 5 steps)
4. RESOURCES NEEDED — Time, money, tools
5. SUCCESS METRICS — How we know it worked
6. RISKS — What could go wrong

Be specific to 2FLY. Team: Bruno (strategy/ops), Milena (social), Guilherme (design), Igor (design).
Revenue context: Agency $9,300 MRR, building 2FLY Flow SaaS + Estoqui. Goal: $30K/mo by June 2026.`;

    execFile("openclaw", ["agent", "--agent", "growth-strategist", "--json", "-m", prompt],
      { timeout: 300000 },
      async (err, stdout) => {
        try {
          let strategy = "";
          if (err) {
            strategy = "Strategy generation failed: " + (err.message || "timeout");
          } else {
            try {
              const parsed = JSON.parse(stdout);
              // openclaw agent --json returns { result: { payloads: [{ text }] } }
              if (parsed.result?.payloads?.length) {
                strategy = parsed.result.payloads.map(p => p.text).filter(Boolean).join("\n\n");
              } else {
                strategy = parsed.response || parsed.message || stdout;
              }
            } catch {
              strategy = stdout;
            }
          }
          await prisma.aiUpdate.update({
            where: { id: req.params.id },
            data: { strategyPlan: cleanAgentOutput(strategy), strategyStatus: "done" },
          });
        } catch (e) {
          console.error("Strategy save error:", e);
        }
      }
    );

    res.json({ status: "loading", message: "Strategy plan started" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai-updates/:id — single update with all data
router.get("/:id", async (req, res) => {
  try {
    const update = await prisma.aiUpdate.findUnique({ where: { id: req.params.id } });
    if (!update) return res.status(404).json({ error: "Not found" });
    res.json(update);
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
