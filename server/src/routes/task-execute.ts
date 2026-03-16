/**
 * Task Execution Routing — POST /api/tasks/:taskId/execute
 * Detects task type, calls AI, parses response, creates real DB items.
 */

import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

const router = Router();
const prisma = new PrismaClient();

type ExecutionType = "content" | "ads" | "research" | "general";

function detectExecutionType(task: { title: string; description?: string | null }): ExecutionType {
  const text = `${task.title} ${task.description || ""}`.toLowerCase();
  if (/content|post|calendar|caption|hook|reel|story|carousel|social media|strategy|promotion|creative/.test(text)) return "content";
  if (/ads?|campaign|budget|meta|facebook ads|roas|spend|targeting/.test(text)) return "ads";
  if (/research|competitor|analysis|market|report|audit/.test(text)) return "research";
  return "general";
}

function buildExecutionPrompt(
  task: { title: string; description?: string | null },
  client: { name: string; notes?: string | null; platforms?: string; adBudget?: number; monthlyRetainer?: number },
  execType: ExecutionType
): string {
  let clientNotes: Record<string, unknown> = {};
  try {
    clientNotes = JSON.parse(client?.notes || "{}") as Record<string, unknown>;
  } catch {
    clientNotes = {};
  }

  let systemContext = `You are a marketing agency AI executing a task for client "${client?.name}".
CLIENT CONTEXT:
- Name: ${client?.name}
- Platform: ${(client as { platforms?: string }).platforms || "Instagram, Facebook"}
- Ad Budget: $${client?.adBudget ?? 0}/mo
- Retainer: $${client?.monthlyRetainer ?? 0}/mo
`;

  const redLines = clientNotes.redLines as string[] | undefined;
  if (redLines?.length) {
    systemContext += `\n⚠️ RULES (NEVER BREAK):\n${redLines.map((r: string) => `- ${r}`).join("\n")}\n`;
  }
  const brandAssets = clientNotes.brandAssets as { voice?: string } | undefined;
  if (brandAssets?.voice) {
    systemContext += `\nBrand Voice: ${brandAssets.voice}\n`;
  }
  const operations = clientNotes.operations as { hours?: string; schedule?: string } | undefined;
  if (operations) {
    systemContext += `\nOperations: ${operations.hours || ""} | ${operations.schedule || ""}\n`;
  }
  const unique = clientNotes.unique as string[] | undefined;
  if (unique?.length) {
    systemContext += `\nUnique Selling Points:\n${unique.map((u: string) => `- ${u}`).join("\n")}\n`;
  }
  const revenuePriorities = clientNotes.revenuePriorities as string[] | undefined;
  if (revenuePriorities?.length) {
    systemContext += `\nRevenue Priorities:\n${revenuePriorities.map((p: string) => `- ${p}`).join("\n")}\n`;
  }
  const links = clientNotes.links as Record<string, string> | undefined;
  if (links && typeof links === "object") {
    systemContext += `\nReference Links:\n${Object.entries(links).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n`;
  }
  const digitalPresence = clientNotes.digitalPresence as Record<string, string> | undefined;
  if (digitalPresence && typeof digitalPresence === "object") {
    systemContext += `\nDigital Presence:\n${Object.entries(digitalPresence).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n`;
  }

  if (execType === "content") {
    systemContext += `
OUTPUT FORMAT — You MUST respond with a JSON array of content ideas. Each item:
{
  "title": "Post title",
  "type": "post|reel|story|carousel",
  "platform": "instagram|facebook",
  "hook": "The opening hook line",
  "caption": "Full caption or caption outline",
  "format": "e.g. Carousel (3 slides), 15s Reel",
  "hashtags": "#tag1 #tag2 #tag3",
  "bestTime": "e.g. Thu 11am-1pm",
  "whyThisWorks": "Strategic reasoning",
  "visualBrief": "Visual direction for designers: composition, colors, mood, elements",
  "score": 8,
  "cta": "Call to action"
}

Generate 5-10 content ideas. Respond ONLY with the JSON array, no other text.
`;
  } else if (execType === "ads") {
    systemContext += `
OUTPUT FORMAT — Respond with a JSON array of ad recommendations:
{
  "title": "Action title",
  "action": "Description of what to do",
  "type": "budget_change|targeting|creative|pause|new_campaign",
  "priority": "high|medium|low",
  "reasoning": "Why this will improve performance"
}
Respond ONLY with the JSON array, no other text.
`;
  } else if (execType === "research") {
    systemContext += `
OUTPUT FORMAT — Respond with a JSON object:
{
  "title": "Report title",
  "summary": "Executive summary (2-3 sentences)",
  "findings": ["Finding 1", "Finding 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "data": "Detailed analysis text"
}

Respond ONLY with the JSON object, no other text.
`;
  }

  return `${systemContext}\n\nTASK TO EXECUTE:\nTitle: ${task.title}\nDescription: ${task.description || "No additional details."}\n\nExecute this task fully. Be specific to this client — no generic content.`;
}

async function callOpenClawGateway(prompt: string): Promise<string> {
  // Use openclaw agent CLI (routes through OpenClaw's working provider config)
  try {
    const { spawnSync } = await import("child_process");
    
    // Use spawnSync with argument array — avoids all shell escaping issues
    const result = spawnSync(
      "/opt/homebrew/bin/openclaw",
      ["agent", "--agent", "content-system", "--json", "-m", prompt],
      {
        encoding: "utf-8",
        maxBuffer: 2 * 1024 * 1024,
        timeout: 300_000, // 5 minutes — agent needs time for complex prompts
        env: { ...process.env, PATH: process.env.PATH + ':/opt/homebrew/bin:/usr/local/bin' },
      }
    );
    
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `Exit code ${result.status}`);
    
    const output = (result.stdout || "").trim();
    
    // Parse openclaw agent JSON response
    try {
      const parsed = JSON.parse(output);
      if (parsed.result?.payloads?.[0]?.text) {
        return parsed.result.payloads.map((p: any) => p.text).join('\n');
      }
      return parsed.reply || parsed.response || output;
    } catch {
      return output;
    }
  } catch (cliErr: any) {
    console.error("[task-execute] OpenClaw CLI failed:", cliErr?.message?.slice(0, 200) || cliErr);
    // Fallback: direct Anthropic API
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("No AI provider available. OpenClaw CLI failed and no ANTHROPIC_API_KEY set.");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${response.status} ${err.slice(0, 200)}`);
    }

    const data = (await response.json()) as { content?: Array<{ text?: string }> };
    return data.content?.[0]?.text ?? "";
  }
}

async function createContentItems(
  aiResponse: string,
  clientId: string,
  _taskId: string
): Promise<{ type: string; summary: string; itemsCreated: number; items?: { id: string; title: string; type: string }[]; destination: string; error?: string }> {
  let items: Array<Record<string, unknown>>;
  try {
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    items = JSON.parse(jsonMatch?.[0] ?? "[]") as Array<Record<string, unknown>>;
  } catch {
    return { type: "content", summary: aiResponse.slice(0, 200), itemsCreated: 0, destination: "content", error: "Could not parse AI response into content items" };
  }

  const created: { id: string; title: string; type: string }[] = [];
  for (const item of items) {
    const notes = [
      (item.hook as string) ? `Hook: ${item.hook}` : "",
      (item.format as string) ? `| Format: ${item.format}` : "",
      (item.whyThisWorks as string) ? `| Goal: ${item.whyThisWorks}` : "",
      (item.cta as string) ? `| CTA: ${item.cta}` : "",
      (item.visualBrief as string) ? `| Visual: ${item.visualBrief}` : "",
      typeof item.score === "number" ? `Score: ${item.score}/10` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const contentItem = await prisma.contentItem.create({
      data: {
        clientId,
        title: (item.title as string) || "Untitled",
        contentType: ((item.type as string) || "post").toLowerCase(),
        platform: ((item.platform as string) || "instagram").toLowerCase(),
        status: "draft",
        source: "agent",
        notes: notes || undefined,
        caption: (item.caption as string) || undefined,
      },
    });
    created.push({ id: contentItem.id, title: contentItem.title, type: contentItem.contentType });
  }

  return {
    type: "content",
    summary: `Created ${created.length} content ideas — view in Content tab`,
    itemsCreated: created.length,
    items: created,
    destination: "content",
  };
}

async function createAgentActions(
  aiResponse: string,
  clientId: string,
  _taskId: string
): Promise<{ type: string; summary: string; itemsCreated: number; destination: string; error?: string }> {
  let items: Array<Record<string, unknown>>;
  try {
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    items = JSON.parse(jsonMatch?.[0] ?? "[]") as Array<Record<string, unknown>>;
  } catch {
    return { type: "ads", summary: aiResponse.slice(0, 200), itemsCreated: 0, destination: "ads", error: "Could not parse" };
  }

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true } });
  const clientName = client?.name ?? null;

  for (const item of items) {
    const action = (item.action as string) || "";
    const reasoning = (item.reasoning as string) || "";
    await prisma.agentAction.create({
      data: {
        clientId,
        clientName,
        agentId: "meta-traffic",
        agentName: "Meta Traffic",
        category: "ads",
        title: (item.title as string) || "Ad recommendation",
        reasoning: `${action}\n\nReasoning: ${reasoning}`,
        proposedAction: action,
        executionType: "manual",
        status: "pending",
        priority: ((item.priority as string) || "normal").toLowerCase(),
      },
    });
  }

  return {
    type: "ads",
    summary: `Created ${items.length} ad recommendations — view in Ads tab`,
    itemsCreated: items.length,
    destination: "ads",
  };
}

async function createReport(
  aiResponse: string,
  clientId: string,
  _taskId: string
): Promise<{ type: string; summary: string; itemsCreated: number; destination: string }> {
  let report: Record<string, unknown>;
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    report = JSON.parse(jsonMatch?.[0] ?? "{}") as Record<string, unknown>;
  } catch {
    report = { title: "AI Research Report", summary: aiResponse.slice(0, 500), findings: [], recommendations: [] };
  }

  const summary = (report.summary as string) || (report.data as string) || "Research report generated.";
  const dateStr = new Date().toISOString().slice(0, 10);
  const highlights = JSON.stringify(report);

  await prisma.dailyReport.upsert({
    where: {
      clientId_date_type: { clientId, date: dateStr, type: "research" },
    },
    create: {
      clientId,
      date: dateStr,
      type: "research",
      summary: summary.slice(0, 2000),
      highlights,
    },
    update: {
      summary: summary.slice(0, 2000),
      highlights,
    },
  });

  return {
    type: "research",
    summary: "Report created — view in Reports tab",
    itemsCreated: 1,
    destination: "reports",
  };
}

router.post("/:taskId/execute", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { client: true },
    });
    if (!task) return res.status(404).json({ error: "Task not found" });

    const client = task.client;
    if (!client) return res.status(404).json({ error: "Client not found" });

    const execType = detectExecutionType(task);
    const prompt = buildExecutionPrompt(task, client, execType);
    const aiResponse = await callOpenClawGateway(prompt);

    let result: Record<string, unknown>;
    switch (execType) {
      case "content":
        result = await createContentItems(aiResponse, task.clientId, task.id);
        break;
      case "ads":
        result = await createAgentActions(aiResponse, task.clientId, task.id);
        break;
      case "research":
        result = await createReport(aiResponse, task.clientId, task.id);
        break;
      default:
        result = { type: "general", summary: aiResponse.slice(0, 500), itemsCreated: 0, destination: "overview" };
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: "completed", completedAt: new Date() },
    });

    res.json({ success: true, executionType: execType, ...result });
  } catch (err) {
    console.error("[task-execute] Error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Execution failed",
    });
  }
});

export default router;
