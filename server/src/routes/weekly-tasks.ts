/**
 * Weekly Client Intelligence Task Generator
 * Uses Claude Haiku to generate 3-5 prioritized tasks per client per week.
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();
const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GeneratedTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  type: 'content' | 'ads' | 'strategy' | 'technical' | 'task';
  canAgentExecute: boolean;
  agentInstructions?: string;
}

function getWeekLabel(date = new Date()): string {
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `Week of ${month} ${day}`;
}

function mapPriority(p: string): string {
  if (p === 'high') return 'high';
  if (p === 'medium') return 'normal';
  return 'low';
}

// POST /api/weekly-tasks/generate/:clientId
router.post('/generate/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;

  try {
    // 1. Get client data
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // 2. Get Meta performance (last AdReport)
    const latestAdReport = await prisma.adReport.findFirst({
      where: { clientId, platform: 'meta' },
      orderBy: { weekStart: 'desc' },
    });

    // 3. Get content buffer status
    const now = new Date();
    const scheduledContent = await prisma.contentItem.count({
      where: {
        clientId,
        status: 'scheduled',
        scheduledDate: { gt: now },
      },
    });

    const draftContent = await prisma.contentItem.count({
      where: { clientId, status: { in: ['draft', 'review'] } },
    });

    // 4. Get overdue tasks
    const overdueTasks = await prisma.task.findMany({
      where: {
        clientId,
        status: { not: 'completed' },
        dueDate: { lt: now },
      },
      select: { title: true, priority: true, dueDate: true },
      take: 10,
    });

    // 5. Build context for Claude
    const platforms = (() => {
      try { return JSON.parse(client.platforms); } catch { return []; }
    })();

    const metaSummary = latestAdReport
      ? `Spend: $${latestAdReport.spend.toFixed(0)}, ROAS: ${latestAdReport.roas.toFixed(2)}, CPL: $${latestAdReport.cpa.toFixed(2)}, CTR: ${(latestAdReport.ctr * 100).toFixed(2)}%, Leads: ${latestAdReport.conversions}`
      : 'No Meta data available';

    const overdueSummary = overdueTasks.length > 0
      ? overdueTasks.map(t => `- ${t.title} (${t.priority})`).join('\n')
      : 'None';

    const contextBlock = `
CLIENT: ${client.name}
NICHE: ${client.notes || 'Not specified'}
RETAINER: $${client.monthlyRetainer}/mo
PLATFORMS: ${platforms.join(', ') || 'Not specified'}
AD BUDGET: $${client.adBudget}/mo

META ADS (last week): ${metaSummary}

CONTENT BUFFER:
- Scheduled posts: ${scheduledContent}
- In draft/review: ${draftContent}
- Buffer status: ${scheduledContent >= 15 ? 'HEALTHY (15+ days)' : scheduledContent >= 7 ? 'LOW (< 15 days)' : 'CRITICAL (< 7 days)'}

OVERDUE TASKS:
${overdueSummary}
`.trim();

    // 6. Call Claude Haiku
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: `You are a digital marketing strategist. Generate a weekly task list for a marketing agency managing this client. Tasks must be specific, actionable, and ranked by urgency. Keep descriptions to 1-2 sentences max. Each task should have: title (short), description (1-2 sentences), priority (high/medium/low), type (content/ads/strategy/technical), canAgentExecute (true/false), and agentInstructions (2-3 steps if executable, otherwise omit). Return ONLY a valid JSON array with no markdown code blocks and no extra text.`,
      messages: [
        {
          role: 'user',
          content: `Generate 3-5 prioritized tasks for this week based on the following client data:\n\n${contextBlock}\n\nReturn a JSON array like:\n[\n  {\n    "title": "...",\n    "description": "...",\n    "priority": "high|medium|low",\n    "type": "content|ads|strategy|technical",\n    "canAgentExecute": true,\n    "agentInstructions": "..."\n  }\n]`,
        },
      ],
    });

    // 7. Parse the response
    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    let generatedTasks: GeneratedTask[] = [];

    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        generatedTasks = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.error('[WEEKLY-TASKS] Failed to parse Claude response:', rawText);
      return res.status(500).json({ error: 'Failed to parse AI response', raw: rawText });
    }

    if (!Array.isArray(generatedTasks) || generatedTasks.length === 0) {
      return res.status(500).json({ error: 'AI returned no tasks', raw: rawText });
    }

    const weekLabel = getWeekLabel();

    // 8. Delete previous week's AI-generated tasks for this client (keep manual tasks)
    await prisma.task.deleteMany({
      where: {
        clientId,
        source: 'ai-weekly',
        status: { not: 'completed' },
      },
    });

    // 9. Save new tasks
    const savedTasks = await Promise.all(
      generatedTasks.map((t) =>
        prisma.task.create({
          data: {
            clientId,
            title: t.title,
            description: t.description,
            priority: mapPriority(t.priority),
            type: t.type || 'task',
            status: 'pending',
            source: 'ai-weekly',
            weekLabel,
            canAgentExecute: !!t.canAgentExecute,
            agentInstructions: t.agentInstructions || null,
          },
        })
      )
    );

    return res.json({
      weekLabel,
      clientId,
      clientName: client.name,
      tasks: savedTasks,
      generated: generatedTasks.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[WEEKLY-TASKS] Error:', msg);
    return res.status(500).json({ error: msg });
  }
});

// POST /api/weekly-tasks/generate-all
// Regenerates weekly tasks for all active clients
router.post('/generate-all', async (req: Request, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: { status: 'active' },
      select: { id: true, name: true },
    });

    const port = process.env.PORT || 4000;
    const results: Array<{ clientId: string; name: string; generated?: number; error?: string }> = [];

    for (const client of clients) {
      try {
        const r = await fetch(`http://localhost:${port}/api/weekly-tasks/generate/${client.id}`, {
          method: 'POST',
          signal: AbortSignal.timeout(30000),
        });
        const data = await r.json() as { generated?: number; error?: string };
        results.push({ clientId: client.id, name: client.name, generated: data.generated });
        console.log(`[WEEKLY-TASKS] ${client.name}: ${data.generated} tasks generated`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[WEEKLY-TASKS] ${client.name}: failed — ${msg}`);
        results.push({ clientId: client.id, name: client.name, error: msg });
      }
    }

    return res.json({ total: clients.length, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

// GET /api/weekly-tasks/:clientId — fetch this week's AI-generated tasks
router.get('/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;
  try {
    const weekLabel = getWeekLabel();
    const tasks = await prisma.task.findMany({
      where: { clientId, source: 'ai-weekly', weekLabel },
      orderBy: [
        { priority: 'asc' }, // high sorts before low alphabetically — use createdAt as secondary
        { createdAt: 'asc' },
      ],
    });

    // Sort by priority manually: high → normal → low
    const priorityOrder: Record<string, number> = { high: 0, urgent: 0, normal: 1, low: 2 };
    tasks.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));

    return res.json({ weekLabel, tasks });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: msg });
  }
});

export default router;
