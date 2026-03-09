/**
 * server/src/lib/openclawClient.ts
 *
 * Direct Anthropic API client for the 2FLY agent system.
 * Supports native tool_use — agents can read data, create content,
 * update requests, and take real actions in the platform.
 *
 * Flow:
 * 1. Send user message + tool definitions to Anthropic
 * 2. If agent returns tool_use → execute tool → send result back → repeat
 * 3. If tool requires confirmation → pause and return pending action
 * 4. When agent returns end_turn → return final text response
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { homedir } from 'os';
import {
  getToolsForAgent,
  toolRequiresConfirmation,
  executeTool,
} from './toolExecutor.js';

// ─── Paths ────────────────────────────────────────────────
const OPENCLAW_HOME = join(homedir(), '.openclaw');
const AGENTS_DIR = join(OPENCLAW_HOME, 'agents');

// ─── Agent registry ───────────────────────────────────────
export const AGENTS = [
  { id: 'inbox-triage', name: 'Inbox Triage', description: 'Routes and categorizes requests', emoji: '📬' },
  { id: 'client-memory', name: 'Client Memory', description: 'Client knowledge keeper', emoji: '🧠' },
  { id: 'project-manager', name: 'Project Manager', description: 'Task lifecycle management', emoji: '📋' },
  { id: 'approval-feedback', name: 'Approval & Feedback', description: 'Review gate for deliverables', emoji: '✅' },
  { id: 'content-system', name: 'Content System', description: 'Content pipeline management', emoji: '📝' },
  { id: 'founder-boss', name: 'Founder Boss', description: 'Strategic decisions & overrides', emoji: '👑' },
  { id: 'research-intel', name: 'Research Intelligence', description: 'Weekly market research & competitive intel', emoji: '🛰️' },
] as const;

export type AgentId = typeof AGENTS[number]['id'];

// ─── Message types ────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Anthropic API message format (supports tool_use content blocks)
type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContent[];
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContent[];
  model: string;
  stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
  usage: { input_tokens: number; output_tokens: number };
}

// ─── Response types ───────────────────────────────────────

export interface ToolCallInfo {
  toolUseId: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  requiresConfirmation: boolean;
  result?: { success: boolean; data?: unknown; error?: string };
}

export interface AgentResponse {
  content: string;
  agentId: AgentId;
  timestamp: string;
  usage?: { input: number; output: number };
  toolCalls?: ToolCallInfo[];           // Tools that were executed
  pendingConfirmation?: ToolCallInfo;   // Tool waiting for user approval
  // Internal: messages so far (needed for confirm-action continuation)
  _messages?: AnthropicMessage[];
}

// ─── Agent role extensions ────────────────────────────────
// Additional system prompt content per agent for platform-specific behaviors.
// These augment the SOUL.md personality, not replace it.

function getAgentRoleExtension(agentId: string): string | null {
  const extensions: Record<string, string> = {
    'research-intel': `
--- RESEARCH INTELLIGENCE ROLE ---
You are Research Intelligence, the market research agent for 2FLY Marketing Command Center.
You are part of a 7-agent system managing ~11 marketing clients across restaurants,
spas/wellness, beauty, and Brazilian market businesses.

YOUR JOB: Produce actionable research findings for each client.

WORKFLOW:
1. Use get_clients or get_client_detail to understand each client's profile, location, and business type.
2. Use web_search to research these categories per client:
   - COMPETITIVE: What are competitors doing? New promotions, social campaigns?
   - TRENDS: What's trending in their niche? Seasonal patterns, viral formats?
   - LOCAL: Local events, community happenings, seasonal opportunities in their city/area?
   - CONTENT: What content formats are performing best in their niche right now?
   - INDUSTRY: Platform changes (Meta, Google, TikTok) affecting their marketing?
3. Produce structured output per client:
   INSIGHTS (2-4 per client): Type (OPPORTUNITY/THREAT/STRENGTH/WEAKNESS), title, body, priority, category
   IDEAS (3-5 per client): Type (content/ads/strategy), title, body, urgency (time-sensitive/evergreen)
4. Use update_client to save key findings to client notes.
5. Use create_content to suggest content items for time-sensitive ideas.

RULES:
- Be specific to the client's LOCATION ("Sudbury, MA" is different from "Detroit, MI")
- Prioritize TIME-SENSITIVE opportunities (events, holidays, seasonal moments)
- Keep insights ACTIONABLE — not "social media is important" but specific competitive intel
- If you find a THREAT (new competitor, negative trend), flag as high priority

CLIENT TYPES:
- Restaurants (Super Crisp, Sudbury Point Grill, Casa Nova): Food trends, local dining, reviews, seasonal menus
- Spas/Wellness (Shape SPA Miami, Shape Spa FLL, Hafiza, Ardan SPA): Wellness trends, booking patterns, influencer partnerships
- Beauty (Cristiane Amorim): Beauty trends, transformation formats, booking tools
- Brazilian Market (This is it Brazil, Pro Fortuna): Brazilian events (Carnaval, Festa Junina), community engagement

COMMANDS:
!research all — Run research for ALL clients
!research [client] — Research specific client
!research status — Show last research stats
!scan trends [niche] — Quick trend scan
!competitors [client] — Deep competitor analysis
`,

    'founder-boss': `
--- RESEARCH ORCHESTRATION ---
You can trigger the weekly research cycle:
- !research trigger — Start the weekly research cycle (sends brief to Research Intelligence)
- !research summary — Show this week's research results
When triggered, assess which clients need attention via !pulse and !risk, then brief Research Intelligence.
After research completes, review and flag top 3 strategic findings.
`,

    'client-memory': `
--- RESEARCH CONTEXT SUPPORT ---
When Research Intelligence requests context for a client:
- Provide a CONTEXT PACKET: client profile, location, business type, current objective, existing notes/insights
- Use get_client_detail to compile this
When Research Intelligence sends new findings:
- Use update_client to save insights to the client's notes
- Track last_research_date in client notes
Commands: !context [client_id] — Generate context packet
`,

    'content-system': `
--- RESEARCH-TO-PIPELINE BRIDGE ---
After Research Intelligence produces new ideas:
- Check content calendar for open slots this week/next week
- Cross-reference new research IDEAS tagged "content" with open slots
- Use create_content to suggest draft items from research findings
- Flag TIME-SENSITIVE ideas that need immediate scheduling
Commands: !suggest [client_id] — Generate content suggestions from research, !auto-schedule — Auto-fill empty slots
`,

    'project-manager': `
--- RESEARCH TASK CREATION ---
When Content System sends content suggestions from research:
- Use create_request to create tasks in IDEATION stage
- Set priority based on the research insight's priority level
- Tag tasks with source: "research-intelligence"
Commands: !research tasks [client_id] — Show research-generated tasks, !auto-create — Batch-create from suggestions
`,
  };

  return extensions[agentId] || null;
}

// ─── SOUL.md loader ───────────────────────────────────────

const soulCache = new Map<string, { content: string; loadedAt: number }>();
const SOUL_CACHE_TTL = 5 * 60 * 1000;

function getAgentSystemPrompt(agentId: string): string {
  const now = Date.now();
  const cached = soulCache.get(agentId);
  if (cached && (now - cached.loadedAt) < SOUL_CACHE_TTL) {
    return cached.content;
  }

  const parts: string[] = [];

  const soulPath = join(AGENTS_DIR, agentId, 'workspace', 'SOUL.md');
  if (existsSync(soulPath)) {
    try { parts.push(readFileSync(soulPath, 'utf-8')); } catch { /* skip */ }
  }

  const agentsMdPath = join(AGENTS_DIR, agentId, 'workspace', 'AGENTS.md');
  if (existsSync(agentsMdPath)) {
    try { parts.push(readFileSync(agentsMdPath, 'utf-8')); } catch { /* skip */ }
  }

  if (parts.length === 0) {
    const agentMeta = AGENTS.find(a => a.id === agentId);
    parts.push(
      `You are ${agentMeta?.name || agentId}, an AI agent for 2FLY Digital Marketing agency.\n` +
      `Role: ${agentMeta?.description || 'General assistant'}.\n` +
      `You work for Bruno Lima, the founder. Be concise, professional, and action-oriented.`
    );
  }

  // Platform context — now tool-aware
  parts.push(`
--- PLATFORM CONTEXT ---
You are connected to the 2FLY Command Center platform and have tools to read and write data.

TOOL-USE GUIDELINES:
- Use your tools to fetch real data before making recommendations.
- When asked about a client, use get_client_detail or get_clients first.
- When asked for a pulse or overview, use get_pulse.
- For content questions, use get_content. For task questions, use get_requests.
- Always present data naturally — don't dump raw JSON at the user.
- When taking actions (creating/updating), explain what you're about to do.
- Be proactive: if you see something wrong in the data, mention it.

HEALTH STATUS RULES:
- GREEN = on track (15+ days content buffer, no overdue requests, ROAS at target)
- YELLOW = needs attention this week (7-14 day buffer, 24-48h old requests, ROAS 80-99%)
- RED = action needed today (<7 day buffer, >48h requests or breached SLA, ROAS <80%)
`);

  // Agent-specific role extensions
  const roleExtensions = getAgentRoleExtension(agentId);
  if (roleExtensions) {
    parts.push(roleExtensions);
  }

  const content = parts.join('\n\n');
  soulCache.set(agentId, { content, loadedAt: now });
  return content;
}

// ─── API key loader ───────────────────────────────────────

let cachedApiKey: string | null = null;

function getAnthropicKey(): string {
  if (cachedApiKey) return cachedApiKey;

  if (process.env.ANTHROPIC_API_KEY) {
    cachedApiKey = process.env.ANTHROPIC_API_KEY;
    return cachedApiKey;
  }

  for (const agent of AGENTS) {
    const authPath = join(AGENTS_DIR, agent.id, 'auth-profiles.json');
    if (existsSync(authPath)) {
      try {
        const data = JSON.parse(readFileSync(authPath, 'utf-8'));
        if (data.profiles) {
          for (const [key, profile] of Object.entries(data.profiles)) {
            const p = profile as { provider?: string; token?: string };
            if ((key.startsWith('anthropic') || p.provider === 'anthropic') && p.token) {
              cachedApiKey = p.token;
              console.log(`[AGENT] Loaded API key from ${agent.id}/auth-profiles.json [${key}]`);
              return cachedApiKey;
            }
          }
        }
      } catch { /* skip */ }
    }
  }

  throw new Error(
    'No Anthropic API key found. Set ANTHROPIC_API_KEY in server/.env ' +
    'or ensure ~/.openclaw/agents/*/auth-profiles.json has an anthropic profile.'
  );
}

// ─── Anthropic Messages API ───────────────────────────────

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOOL_LOOPS = 10; // Safety limit

function getAuthHeaders(): Record<string, string> {
  const apiKey = getAnthropicKey();
  return apiKey.startsWith('sk-ant-oat')
    ? { 'Authorization': `Bearer ${apiKey}` }
    : { 'x-api-key': apiKey };
}

async function callAnthropic(
  system: string,
  messages: AnthropicMessage[],
  tools?: unknown[],
): Promise<AnthropicResponse> {
  const body: Record<string, unknown> = {
    model: MODEL,
    max_tokens: 4096,
    system,
    messages,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText.slice(0, 300)}`);
  }

  return (await response.json()) as AnthropicResponse;
}

// ─── Tool-use loop ────────────────────────────────────────

/**
 * Send a message to a specific agent with full tool-use support.
 * Automatically executes read-only tools. Pauses for write tools
 * that need user confirmation.
 */
export async function sendToAgent(
  agentId: AgentId,
  message: string,
  conversationHistory: ChatMessage[] = [],
  _sessionUser?: string,
  contextData?: string,
): Promise<AgentResponse> {
  const systemPrompt = getAgentSystemPrompt(agentId);
  const tools = getToolsForAgent(agentId);

  // Build messages
  const messages: AnthropicMessage[] = [
    ...conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // If we have pre-fetched context data, inject it
  if (contextData) {
    messages.push({
      role: 'user',
      content: `[Auto-injected platform context]\n${contextData}`,
    });
    messages.push({
      role: 'assistant',
      content: 'Got it, I have the current data. How can I help?',
    });
  }

  messages.push({ role: 'user', content: message });

  return executeToolLoop(agentId, systemPrompt, messages, tools);
}

/**
 * Continue a conversation after a tool confirmation.
 * Executes the confirmed tool, feeds the result back, and continues the loop.
 */
export async function continueAfterConfirmation(
  agentId: AgentId,
  pendingTool: ToolCallInfo,
  previousMessages: AnthropicMessage[],
): Promise<AgentResponse> {
  const systemPrompt = getAgentSystemPrompt(agentId);
  const tools = getToolsForAgent(agentId);

  // Execute the confirmed tool
  const result = await executeTool(pendingTool.toolName, pendingTool.toolInput);
  pendingTool.result = result;

  // Add the tool result to the conversation
  const messages: AnthropicMessage[] = [
    ...previousMessages,
    {
      role: 'user',
      content: [{
        type: 'tool_result' as const,
        tool_use_id: pendingTool.toolUseId,
        content: JSON.stringify(result.success ? result.data : { error: result.error }),
      }],
    },
  ];

  return executeToolLoop(agentId, systemPrompt, messages, tools, [pendingTool]);
}

async function executeToolLoop(
  agentId: AgentId,
  systemPrompt: string,
  messages: AnthropicMessage[],
  tools: unknown[],
  executedTools: ToolCallInfo[] = [],
): Promise<AgentResponse> {
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < MAX_TOOL_LOOPS; i++) {
    const response = await callAnthropic(systemPrompt, messages, tools);
    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    // Extract text and tool_use blocks
    const textBlocks = response.content.filter(b => b.type === 'text') as Array<{ type: 'text'; text: string }>;
    const toolBlocks = response.content.filter(b => b.type === 'tool_use') as Array<{
      type: 'tool_use'; id: string; name: string; input: Record<string, unknown>;
    }>;

    // If no tool calls, we're done
    if (response.stop_reason !== 'tool_use' || toolBlocks.length === 0) {
      const finalText = textBlocks.map(b => b.text).join('\n') || '(no response)';
      return {
        content: finalText,
        agentId,
        timestamp: new Date().toISOString(),
        usage: { input: totalInput, output: totalOutput },
        toolCalls: executedTools.length > 0 ? executedTools : undefined,
        _messages: messages,
      };
    }

    // Process each tool call
    // Add the assistant's full response to messages first
    messages.push({ role: 'assistant', content: response.content });

    const toolResults: AnthropicContent[] = [];

    for (const toolBlock of toolBlocks) {
      const needsConfirmation = toolRequiresConfirmation(toolBlock.name);

      if (needsConfirmation) {
        // Pause the loop — return pending confirmation to frontend
        const pendingText = textBlocks.map(b => b.text).join('\n') || '';
        return {
          content: pendingText,
          agentId,
          timestamp: new Date().toISOString(),
          usage: { input: totalInput, output: totalOutput },
          toolCalls: executedTools.length > 0 ? executedTools : undefined,
          pendingConfirmation: {
            toolUseId: toolBlock.id,
            toolName: toolBlock.name,
            toolInput: toolBlock.input,
            requiresConfirmation: true,
          },
          _messages: messages, // Save state for continuation
        };
      }

      // Auto-execute read-only tools
      console.log(`[AGENT:${agentId}] Executing tool: ${toolBlock.name}`);
      const result = await executeTool(toolBlock.name, toolBlock.input);

      const toolInfo: ToolCallInfo = {
        toolUseId: toolBlock.id,
        toolName: toolBlock.name,
        toolInput: toolBlock.input,
        requiresConfirmation: false,
        result,
      };
      executedTools.push(toolInfo);

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result.success ? result.data : { error: result.error }),
      });
    }

    // Send all tool results back
    messages.push({ role: 'user', content: toolResults });
  }

  // Hit loop limit
  return {
    content: '(Agent reached maximum tool call limit. Please try a more specific request.)',
    agentId,
    timestamp: new Date().toISOString(),
    usage: { input: totalInput, output: totalOutput },
    toolCalls: executedTools,
    _messages: messages,
  };
}

// ─── Gateway health (via CLI) ─────────────────────────────

export async function checkGatewayHealth(): Promise<{
  online: boolean;
  version?: string;
  agents?: number;
  error?: string;
}> {
  try {
    const hasKey = !!getAnthropicKey();
    let gatewayUp = false;
    let agentCount = 0;

    try {
      const token = process.env.OPENCLAW_GATEWAY_TOKEN || '';
      const tokenArg = token ? ` --token ${token}` : '';
      const result = execSync(`openclaw gateway call health --json${tokenArg}`, {
        timeout: 5000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
      });
      const parsed = JSON.parse(result);
      gatewayUp = parsed.status === 'ok' || !!parsed.uptime;
      agentCount = parsed.agents || 0;
    } catch { /* gateway not running, that's fine */ }

    return {
      online: hasKey,
      version: gatewayUp ? 'tools + gateway' : 'tools',
      agents: agentCount || AGENTS.length,
    };
  } catch (err: unknown) {
    return { online: false, error: (err as Error).message };
  }
}

export async function getAgentStatuses(): Promise<
  Array<{ id: AgentId; name: string; emoji: string; description: string; online: boolean; lastChecked: string }>
> {
  const health = await checkGatewayHealth();
  return AGENTS.map((agent) => ({
    ...agent,
    online: health.online,
    lastChecked: new Date().toISOString(),
  }));
}

// ─── Command routing ──────────────────────────────────────

export async function routeCommand(
  command: string,
  sessionUser?: string
): Promise<AgentResponse> {
  const COMMAND_ROUTES: Record<string, AgentId> = {
    '!help': 'inbox-triage', '!status': 'inbox-triage', '!route': 'inbox-triage',
    '!urgent': 'inbox-triage', '!ping': 'inbox-triage',
    '!client': 'client-memory',
    '!task': 'project-manager', '!assign': 'project-manager',
    '!overdue': 'project-manager', '!workload': 'project-manager',
    '!review': 'approval-feedback', '!pending': 'approval-feedback',
    '!approve': 'approval-feedback', '!reject': 'approval-feedback', '!revision': 'approval-feedback',
    '!draft': 'content-system', '!content': 'content-system',
    '!calendar': 'content-system', '!due': 'content-system',
    '!pulse': 'founder-boss', '!decide': 'founder-boss', '!escalate': 'founder-boss',
    '!override': 'founder-boss', '!priority': 'founder-boss',
    '!directive': 'founder-boss', '!risk': 'founder-boss',
    '!research': 'research-intel', '!scan': 'research-intel',
    '!competitors': 'research-intel',
  };

  const cmdWord = command.trim().split(/\s+/)[0]?.toLowerCase() || '';
  const agentId = COMMAND_ROUTES[cmdWord] || 'inbox-triage';

  return sendToAgent(agentId, command, [], sessionUser);
}
