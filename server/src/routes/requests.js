// ============================================================
// API: CLIENT REQUEST INTAKE
// ============================================================

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const router = express.Router();
const prisma = new PrismaClient();

// Default SLA hours by priority
const SLA_HOURS = {
  urgent: 4,
  high: 24,
  normal: 48,
  low: 72,
};

// GET /api/requests?clientId=xxx&status=new
router.get("/", async (req, res) => {
  try {
    const where = {};
    if (req.query.clientId) where.clientId = req.query.clientId;
    if (req.query.status) where.status = req.query.status;

    const requests = await prisma.clientRequest.findMany({
      where,
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { client: { select: { name: true } } },
    });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/requests — new client request (this is the intake form endpoint)
router.post("/", async (req, res) => {
  try {
    const { priority = "normal", ...rest } = req.body;

    // Auto-calculate due date from SLA
    const slaHours = SLA_HOURS[priority] || 48;
    const dueDate = new Date();
    dueDate.setHours(dueDate.getHours() + slaHours);

    const request = await prisma.clientRequest.create({
      data: { ...rest, priority, dueDate },
    });

    res.status(201).json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/requests/:id — update status, assign, resolve
router.patch("/:id", async (req, res) => {
  try {
    const data = { ...req.body };

    // Auto-set resolvedAt when completing
    if (data.status === "completed" || data.status === "closed") {
      data.resolvedAt = new Date();
    }

    const request = await prisma.clientRequest.update({
      where: { id: req.params.id },
      data,
    });
    res.json(request);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/requests/summary — quick counts by status
router.get("/summary", async (_req, res) => {
  try {
    const [total, open, breached] = await Promise.all([
      prisma.clientRequest.count(),
      prisma.clientRequest.count({ where: { status: { notIn: ["completed", "closed"] } } }),
      prisma.clientRequest.count({ where: { slaBreach: true, status: { notIn: ["completed", "closed"] } } }),
    ]);
    res.json({ total, open, breached });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
