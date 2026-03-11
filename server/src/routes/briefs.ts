/**
 * Daily Briefings API — agents POST here from cron jobs; dashboard consumes.
 * GET /api/briefs — list (query: status, date, type)
 * GET /api/briefs/today — shortcut for today's briefs
 * GET /api/briefs/:id — single brief
 * POST /api/briefs — create
 * PATCH /api/briefs/:id — mark read/archived
 */

const { Router, Request, Response } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

// GET /api/briefs — list with optional ?status=unread&date=today&type=morning
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, date, type } = req.query;
    const where: Record<string, unknown> = {};

    if (status && typeof status === "string") {
      where.status = status;
    }
    if (type && typeof type === "string") {
      where.type = type;
    }
    if (date === "today" || date === "t") {
      const today = new Date();
      where.createdAt = {
        gte: startOfDay(today),
        lte: endOfDay(today),
      };
    } else if (date && typeof date === "string" && date !== "today") {
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        where.createdAt = {
          gte: startOfDay(d),
          lte: endOfDay(d),
        };
      }
    }

    const briefs = await prisma.brief.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ briefs, total: briefs.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/briefs/today — shortcut: all of today's briefs
router.get("/today", async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const briefs = await prisma.brief.findMany({
      where: {
        createdAt: {
          gte: startOfDay(today),
          lte: endOfDay(today),
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ briefs, total: briefs.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/briefs/:id — single brief (defined after /today so that path matches first)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const brief = await prisma.brief.findUnique({
      where: { id: req.params.id },
    });
    if (!brief) return res.status(404).json({ error: "Brief not found" });
    res.json(brief);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/briefs — create (agents POST from cron)
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const payload = {
      type: body.type ?? "custom",
      title: body.title ?? "Brief",
      agentId: body.agentId ?? "unknown",
      agentName: body.agentName ?? "Agent",
      summary: body.summary ?? "",
      highlights: body.highlights != null ? JSON.stringify(body.highlights) : null,
      status: "unread",
      priority: body.priority ?? "normal",
      healthSnapshot:
        body.healthSnapshot != null ? JSON.stringify(body.healthSnapshot) : null,
    };
    const brief = await prisma.brief.create({ data: payload });
    res.status(201).json(brief);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PATCH /api/briefs/:id — mark as read or archived
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { status } = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (status === "read" || status === "archived") {
      update.status = status;
      if (status === "read") update.readAt = new Date();
    }
    const brief = await prisma.brief.update({
      where: { id: req.params.id },
      data: update,
    });
    res.json(brief);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

module.exports = router;
