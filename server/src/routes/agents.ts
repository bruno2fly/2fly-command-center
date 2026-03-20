/**
 * server/src/routes/agents.ts
 * Express routes for AI agents with full tool-use support.
 * Agents can read/write platform data and request user confirmation for writes.
 */

import { Router, Request, Response } from 'express';
import {
  sendToAgent,
  continueAfterConfirmation,
  checkGatewayHealth,
  getAgentStatuses,
  routeCommand,
  AGENTS,
  type AgentId,
  type AgentResponse,
  type ToolCallInfo,
} from '../lib/openclawClient.js';

const router = Router();

// ─── In-memory store for async agent jobs ─────────────────
interface AgentJob {
  status: 'running' | 'done' | 'error';
  agent: string;
  response?: string;
  error?: string;
}
const agentJobs = new Map<string, AgentJob>();

// ─── In-memory store for pending confirmations ────────────
// Keyed by a confirmation ID, expires after 5 minutes.

interface PendingAction {
  agentId: AgentId;
  tool: ToolCallInfo;
  messages: unknown[]; // AnthropicMessage[]
  createdAt: number;
}

const pendingActions = new Map<string, PendingAction>();
const PENDING_TTL = 5 * 60 * 1000; // 5 minutes

// Clean up expired entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, action] of pendingActions) {
    if (now - action.createdAt > PENDING_TTL) {
      pendingActions.delete(id);
    }
  }
}, 60_000);

function generateConfirmId(): string {
  return `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Validate agent ID
function isValidAgent(id: string): id is AgentId {
  return AGENTS.some((a) => a.id === id);
}

// Format response for the frontend
function formatResponse(result: AgentResponse, confirmId?: string) {
  const response: Record<string, unknown> = {
    success: true,
    response: result.content,
    agent: result.agentId,
    timestamp: result.timestamp,
    usage: result.usage,
  };

  // Include executed tool calls so frontend can display them
  if (result.toolCalls && result.toolCalls.length > 0) {
    response.toolCalls = result.toolCalls.map(tc => ({
      toolName: tc.toolName,
      toolInput: tc.toolInput,
      success: tc.result?.success ?? true,
      resultSummary: summarizeToolResult(tc),
    }));
  }

  // Include pending confirmation if agent wants to take a write action
  if (result.pendingConfirmation) {
    response.pendingConfirmation = {
      confirmId,
      toolName: result.pendingConfirmation.toolName,
      toolInput: result.pendingConfirmation.toolInput,
      description: describeToolAction(result.pendingConfirmation),
    };
  }

  return response;
}

// Human-readable summary of what a tool did
function summarizeToolResult(tc: ToolCallInfo): string {
  if (!tc.result?.success) return `Failed: ${tc.result?.error || 'unknown error'}`;

  const data = tc.result.data as Record<string, unknown> | unknown[] | undefined;
  switch (tc.toolName) {
    case 'get_clients':
      return `Fetched ${Array.isArray(data) ? data.length : 0} clients`;
    case 'get_client_detail':
      return `Loaded client details`;
    case 'get_requests':
      return `Found ${Array.isArray(data) ? data.length : 0} requests`;
    case 'get_content':
      return `Found ${Array.isArray(data) ? data.length : 0} content items`;
    case 'get_ads':
      return `Loaded ad reports`;
    case 'get_health':
      return `Health check complete`;
    case 'get_pulse':
      return `Pulse summary loaded`;
    default:
      return `${tc.toolName} completed`;
  }
}

// Human-readable description of what an action will do
function describeToolAction(tc: ToolCallInfo): string {
  const input = tc.toolInput;
  switch (tc.toolName) {
    case 'create_request':
      return `Create a new ${input.type || 'request'} "${input.title}" for client ${input.clientId}`;
    case 'update_request':
      return `Update request ${input.requestId}: ${JSON.stringify(input.data)}`;
    case 'create_content':
      return `Create new ${input.contentType || 'content'} "${input.title}" for client ${input.clientId}`;
    case 'update_content':
      return `Update content ${input.contentId}: ${JSON.stringify(input.data)}`;
    case 'update_client':
      return `Update client ${input.clientId}: ${JSON.stringify(input.data)}`;
    default:
      return `Execute ${tc.toolName} with ${JSON.stringify(input)}`;
  }
}

// ─── Pre-fetch client context ─────────────────────────────

async function fetchClientContext(clientId: string): Promise<string | undefined> {
  try {
    const baseUrl = `http://localhost:${process.env.PORT || 4000}`;
    const res = await fetch(`${baseUrl}/api/agent-tools/clients/${clientId}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return undefined;
    const client = await res.json() as Record<string, unknown>;

    // Build a concise context string
    const lines = [
      `CLIENT: ${client.name} (ID: ${client.id})`,
      `Status: ${client.status} | Health: ${client.healthStatus}`,
      `Platform: ${client.platform} | Retainer: $${client.retainer}/mo | Ad Budget: $${client.adBudget}/mo`,
      `ROAS Target: ${client.roasTarget}x`,
    ];

    if (client.notes) lines.push(`Notes: ${client.notes}`);

    const requests = client.requests as Array<Record<string, unknown>> | undefined;
    if (requests && requests.length > 0) {
      const open = requests.filter((r: Record<string, unknown>) => !['completed', 'closed'].includes(r.status as string));
      lines.push(`Open Requests: ${open.length} (${requests.length} total)`);
    }

    const content = client.contentItems as unknown[] | undefined;
    if (content) {
      lines.push(`Content Items: ${content.length}`);
    }

    return lines.join('\n');
  } catch {
    return undefined;
  }
}

// ================================================================
// POST /api/agents/chat — Send a message to a specific agent
// ================================================================
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { agent, message, history, clientId, pageContext } = req.body as {
      agent?: string;
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      clientId?: string;
      pageContext?: string;
    };

    if (!agent || !message) {
      return res.status(400).json({ error: 'Both "agent" and "message" are required.' });
    }

    if (!isValidAgent(agent)) {
      return res.status(400).json({
        error: `Invalid agent "${agent}". Valid agents: ${AGENTS.map((a) => a.id).join(', ')}`,
      });
    }

    // Pre-fetch client context if available
    let contextData: string | undefined;
    if (clientId) {
      contextData = await fetchClientContext(clientId);
    }

    // Async job: spawn CLI in background, return job ID immediately
    const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const { join } = await import('path');
    const { homedir } = await import('os');
    const { readFileSync, existsSync } = await import('fs');

    // Load agent SOUL if available
    const soulPath = join(homedir(), '.openclaw', 'agents', agent, 'workspace', 'SOUL.md');
    let soulContext = '';
    if (existsSync(soulPath)) {
      const soul = readFileSync(soulPath, 'utf-8');
      soulContext = `\nYou are the ${agent} agent. Follow your SOUL:\n${soul.slice(0, 2000)}`;
    }

    const fullPrompt = `${soulContext}${contextData ? `\n\nCLIENT CONTEXT:\n${contextData}` : ''}${pageContext ? `\n\nPAGE CONTEXT (user is currently viewing this):\n${pageContext}` : ''}\n\nUser request: ${message}`;

    console.log(`[agents/chat] Starting async job ${jobId} for agent ${agent}...`);

    // Store job and run in background
    agentJobs.set(jobId, { status: 'running', agent });

    // Fire and forget — execFile is more reliable than spawn for capturing output
    const { execFile } = await import('child_process');
    
    const child = execFile(
      '/opt/homebrew/bin/openclaw',
      ['agent', '--agent', agent, '--json', '-m', fullPrompt],
      {
        encoding: 'utf-8',
        maxBuffer: 4 * 1024 * 1024,
        timeout: 300000, // 5 min
        env: { ...process.env, PATH: process.env.PATH + ':/opt/homebrew/bin:/usr/local/bin' },
      },
      (error, stdout, stderr) => {
        if (error) {
          const errMsg = error.killed ? 'Timed out after 5 minutes' : (stderr?.slice(0, 300) || error.message);
          agentJobs.set(jobId, { status: 'error', agent, error: errMsg });
          console.error(`[agents/chat] Job ${jobId} failed:`, errMsg.slice(0, 200));
          return;
        }

        let agentResponse = (stdout || '').trim();
        try {
          const parsed = JSON.parse(agentResponse);
          if (parsed.result?.payloads?.[0]?.text) {
            agentResponse = parsed.result.payloads.map((p: any) => p.text).join('\n');
          } else {
            agentResponse = parsed.reply || parsed.response || parsed.text || agentResponse;
          }
        } catch { /* use raw text */ }

        agentJobs.set(jobId, { status: 'done', agent, response: agentResponse });
        console.log(`[agents/chat] Job ${jobId} completed (${agentResponse.length} chars)`);

        // Auto-cleanup after 10 minutes
        setTimeout(() => agentJobs.delete(jobId), 600000);
      }
    );

    // Return immediately with job ID
    res.json({ success: true, jobId, status: 'running', agent });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[agents/chat] Error:', errMsg);
    res.status(500).json({ error: errMsg });
  }
});

// ================================================================
// GET /api/agents/context/:clientId/:tab — Build rich context for a tab
// ================================================================
router.get('/context/:clientId/:tab', async (req: Request, res: Response) => {
  try {
    const { clientId, tab } = req.params;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client) {
      await prisma.$disconnect();
      return res.status(404).json({ error: 'Client not found' });
    }

    const lines: string[] = [
      `CLIENT: ${client.name} (ID: ${client.id})`,
      `Status: ${client.status} | Health: ${client.healthStatus}`,
      `Retainer: $${client.monthlyRetainer}/mo | Ad Budget: $${client.adBudget}/mo | ROAS Target: ${client.roasTarget}x`,
      client.notes ? `Notes: ${client.notes.slice(0, 500)}` : '',
      ``,
    ];

    if (tab === 'overview' || tab === 'all') {
      const requests = await prisma.clientRequest.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 10 });
      const tasks = await prisma.task.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 10 });
      lines.push(`TAB: Overview`);
      lines.push(`Open Requests: ${requests.filter((r: any) => !['completed', 'closed'].includes(r.status)).length}/${requests.length}`);
      requests.slice(0, 5).forEach((r: any) => lines.push(`  - [${r.status}] ${r.title} (SLA breach: ${r.slaBreach ? 'YES' : 'no'})`));
      lines.push(`Tasks: ${tasks.length}`);
      tasks.slice(0, 5).forEach((t: any) => lines.push(`  - [${t.status}] ${t.title} (assigned: ${t.assignedTo || 'unassigned'})`));
    }

    if (tab === 'ads') {
      const campaigns = await prisma.adCampaign.findMany({ where: { clientId } });
      const meta = await prisma.metaConnection.findFirst({ where: { clientId } });
      lines.push(`TAB: Ads`);
      lines.push(`Meta Connection: ${meta ? `${meta.status} | Ad Account: ${meta.adAccountId}` : 'NOT CONNECTED'}`);
      lines.push(`Campaigns: ${campaigns.length}`);
      campaigns.forEach((c: any) => lines.push(`  - [${c.status}] ${c.name} | Objective: ${c.objective} | Daily: $${c.dailyBudget || '?'} | Lifetime: $${c.lifetimeBudget || '?'}`));
    }

    if (tab === 'content') {
      const content = await prisma.contentItem.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 15 });
      lines.push(`TAB: Content`);
      lines.push(`Content Items: ${content.length}`);
      const byStatus: Record<string, number> = {};
      content.forEach((c: any) => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
      lines.push(`Status breakdown: ${Object.entries(byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      content.slice(0, 10).forEach((c: any) => lines.push(`  - [${c.status}] ${c.title || c.type} | Scheduled: ${c.scheduledDate || 'none'}`));
    }

    if (tab === 'socialMedia') {
      const content = await prisma.contentItem.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 10 });
      lines.push(`TAB: Social Media`);
      lines.push(`Recent content: ${content.length} items`);
      content.slice(0, 5).forEach((c: any) => lines.push(`  - [${c.status}] ${c.title || c.type}`));
    }

    if (tab === 'googleBusiness') {
      const google = await prisma.googleConnection.findFirst({ where: { clientId } });
      lines.push(`TAB: Google Business`);
      lines.push(`Google Connection: ${google ? `${google.status} | Location: ${google.locationId || 'none selected'}` : 'NOT CONNECTED'}`);
    }

    if (tab === 'reports') {
      const reports = await prisma.dailyReport.findMany({ where: { clientId }, orderBy: { date: 'desc' }, take: 5 });
      lines.push(`TAB: Reports`);
      lines.push(`Recent reports: ${reports.length}`);
      reports.forEach((r: any) => lines.push(`  - ${r.date} | Health: ${r.healthStatus}`));
    }

    if (tab === 'clientPlan') {
      const strategies = await prisma.clientStrategy.findMany({ where: { clientId }, orderBy: { month: 'desc' }, take: 3 });
      lines.push(`TAB: Client Plan`);
      lines.push(`Strategies: ${strategies.length}`);
      strategies.forEach((s: any) => lines.push(`  - ${s.month}: ${s.title} [${s.status}]`));
    }

    if (tab === 'tasks' || tab === 'tasksRequests') {
      const tasks = await prisma.task.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 15 });
      const requests = await prisma.clientRequest.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' }, take: 10 });
      lines.push(`TAB: Tasks & Requests`);
      lines.push(`Tasks: ${tasks.length}`);
      tasks.slice(0, 10).forEach((t: any) => lines.push(`  - [${t.status}] ${t.title} | Priority: ${t.priority || 'normal'} | Due: ${t.dueDate || 'none'}`));
      lines.push(`Requests: ${requests.length}`);
      requests.slice(0, 5).forEach((r: any) => lines.push(`  - [${r.status}] ${r.title} | SLA: ${r.slaBreach ? 'BREACHED' : 'ok'}`));
    }

    await prisma.$disconnect();
    res.json({ context: lines.filter(Boolean).join('\n') });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ================================================================
// GET /api/agents/job/:jobId — Poll async agent job status
// ================================================================
router.get('/job/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = agentJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }
  if (job.status === 'done') {
    return res.json({ success: true, status: 'done', response: job.response, agent: job.agent });
  }
  if (job.status === 'error') {
    return res.json({ success: false, status: 'error', error: job.error, agent: job.agent });
  }
  return res.json({ success: true, status: 'running', agent: job.agent });
});

// ================================================================
// POST /api/agents/confirm — Confirm or cancel a pending action
// ================================================================
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { confirmId, approved } = req.body as {
      confirmId?: string;
      approved?: boolean;
    };

    if (!confirmId) {
      return res.status(400).json({ error: '"confirmId" is required.' });
    }

    const pending = pendingActions.get(confirmId);
    if (!pending) {
      return res.status(404).json({ error: 'Confirmation expired or not found. Please try again.' });
    }

    // Remove from pending regardless
    pendingActions.delete(confirmId);

    if (!approved) {
      return res.json({
        success: true,
        response: 'Action cancelled.',
        agent: pending.agentId,
        timestamp: new Date().toISOString(),
      });
    }

    // Execute the confirmed action and continue the conversation
    const result = await continueAfterConfirmation(
      pending.agentId,
      pending.tool,
      pending.messages as never,
    );

    // Check if there's another pending confirmation
    let newConfirmId: string | undefined;
    if (result.pendingConfirmation && result._messages) {
      newConfirmId = generateConfirmId();
      pendingActions.set(newConfirmId, {
        agentId: pending.agentId,
        tool: result.pendingConfirmation,
        messages: result._messages,
        createdAt: Date.now(),
      });
    }

    res.json(formatResponse(result, newConfirmId));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[agents/confirm] Error:', errMsg);
    res.status(500).json({ error: errMsg });
  }
});

// ================================================================
// POST /api/agents/command — Route a ! command to the right agent
// ================================================================
router.post('/command', async (req: Request, res: Response) => {
  try {
    const { command, clientId } = req.body as {
      command?: string;
      clientId?: string;
    };

    if (!command) {
      return res.status(400).json({ error: '"command" is required.' });
    }

    let enrichedCommand = command;
    if (clientId) {
      enrichedCommand = `[Context: client_id=${clientId}]\n${command}`;
    }

    const sessionUser = clientId ? `platform-cmd-${clientId}` : 'platform-cmd-global';
    const result = await routeCommand(enrichedCommand, sessionUser);

    res.json(formatResponse(result));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[agents/command] Error:', errMsg);
    res.status(500).json({ error: errMsg });
  }
});

// ================================================================
// GET /api/agents/status — Check agent and gateway status
// ================================================================
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const [gateway, agents] = await Promise.all([
      checkGatewayHealth(),
      getAgentStatuses(),
    ]);
    res.json({ gateway, agents });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[agents/status] Error:', errMsg);
    res.status(500).json({ error: errMsg });
  }
});

// ================================================================
// GET /api/agents/list — Get the list of available agents
// ================================================================
router.get('/list', (_req: Request, res: Response) => {
  res.json({ agents: AGENTS });
});

export default router;
