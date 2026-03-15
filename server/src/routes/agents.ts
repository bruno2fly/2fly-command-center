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
    const { agent, message, history, clientId } = req.body as {
      agent?: string;
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      clientId?: string;
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

    const sessionUser = `platform-${agent}-${clientId || 'global'}`;

    const result = await sendToAgent(
      agent,
      message,
      history || [],
      sessionUser,
      contextData,
    );

    // If there's a pending confirmation, store it
    let confirmId: string | undefined;
    if (result.pendingConfirmation && result._messages) {
      confirmId = generateConfirmId();
      pendingActions.set(confirmId, {
        agentId: agent,
        tool: result.pendingConfirmation,
        messages: result._messages,
        createdAt: Date.now(),
      });
    }

    res.json(formatResponse(result, confirmId));
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[agents/chat] Error:', errMsg);

    // Fallback: if Anthropic key fails (no key or out of credits), use openclaw run CLI
    if (errMsg.includes('No Anthropic API key') || errMsg.includes('credit balance') || errMsg.includes('api_key')) {
      console.log('[agents/chat] Anthropic key failed, falling back to openclaw run CLI...');
      try {
        const { execSync } = await import('child_process');
        const { agent, message: userMsg, clientId } = req.body as { agent?: string; message?: string; clientId?: string };
        
        // Build context
        let contextData = '';
        if (clientId) {
          const ctx = await fetchClientContext(clientId);
          if (ctx) contextData = `\n\nCLIENT CONTEXT:\n${ctx}`;
        }
        
        // Load agent SOUL if available
        const { join } = await import('path');
        const { homedir } = await import('os');
        const { readFileSync, existsSync } = await import('fs');
        const soulPath = join(homedir(), '.openclaw', 'agents', agent || '', 'workspace', 'SOUL.md');
        let soulContext = '';
        if (existsSync(soulPath)) {
          const soul = readFileSync(soulPath, 'utf-8');
          soulContext = `\n\nYou are the ${agent} agent. Follow your SOUL:\n${soul.slice(0, 2000)}`;
        }

        const fullPrompt = `${soulContext}${contextData}\n\nUser request: ${userMsg}`;
        
        // Use openclaw agent CLI
        const escapedPrompt = fullPrompt.replace(/'/g, "'\\''");
        const result = execSync(
          `openclaw agent --agent ${agent || 'content-system'} --json -m '${escapedPrompt}'`,
          { 
            encoding: 'utf-8', 
            timeout: 120000,
            env: { ...process.env, PATH: process.env.PATH + ':/opt/homebrew/bin:/usr/local/bin' }
          }
        );
        
        // Parse openclaw agent JSON output
        let agentResponse = result.trim();
        try {
          const parsed = JSON.parse(agentResponse);
          // openclaw agent --json returns { result: { payloads: [{ text: "..." }] } }
          if (parsed.result?.payloads?.[0]?.text) {
            agentResponse = parsed.result.payloads.map((p: any) => p.text).join('\n');
          } else {
            agentResponse = parsed.reply || parsed.response || parsed.text || agentResponse;
          }
        } catch { /* use raw text */ }
        
        return res.json({
          success: true,
          response: agentResponse,
          agent: agent,
          fallback: true,
        });
      } catch (fallbackErr) {
        console.error('[agents/chat] Fallback also failed:', fallbackErr);
        return res.status(503).json({
          error: 'AI service unavailable. Both Anthropic API and OpenClaw fallback failed.',
          hint: 'Add credits at console.anthropic.com or check openclaw status',
        });
      }
    }

    res.status(500).json({ error: errMsg });
  }
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
