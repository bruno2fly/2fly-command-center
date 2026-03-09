/**
 * server/src/lib/toolExecutor.ts
 *
 * Executes agent tool calls by routing them to the existing
 * /api/agent-tools/* endpoints via internal HTTP.
 *
 * This keeps all data access in one place (agent-tools.ts)
 * and avoids duplicating Prisma logic.
 */

const BASE_URL = 'http://localhost:' + (process.env.PORT || '4000');
const AGENT_KEY = process.env.AGENT_TOOLS_SECRET || '';

// ─── Tool Definitions (Anthropic format) ──────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  requiresConfirmation?: boolean; // custom flag, not sent to Anthropic
}

export const ALL_TOOLS: ToolDefinition[] = [
  // ── Read-only tools ──
  {
    name: 'get_clients',
    description: 'Get a list of all active clients with their current health status (green/yellow/red). Use this for an overview of the agency portfolio.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_client_detail',
    description: 'Get full details for a specific client including health history, open requests, content items, and ad reports. Use this when you need deep info about one client.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID to look up' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'get_requests',
    description: 'List client requests/tasks. Can filter by client and/or status. Returns requests sorted by creation date (newest first).',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Optional: filter by client ID' },
        status: { type: 'string', description: 'Optional: filter by status (new, acknowledged, in_progress, review, completed, closed)' },
      },
    },
  },
  {
    name: 'get_content',
    description: 'List content items in the pipeline. Can filter by client and/or status. Returns items sorted by scheduled date.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Optional: filter by client ID' },
        status: { type: 'string', description: 'Optional: filter by status (draft, review, approved, scheduled, published)' },
      },
    },
  },
  {
    name: 'get_ads',
    description: 'Get ad performance reports for a client. Returns weekly reports with spend, ROAS, CPA, CTR, and top campaigns.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'Optional: filter by client ID' },
      },
    },
  },
  {
    name: 'get_health',
    description: 'Get a full health recompute for all clients. Returns each client with module-level breakdowns (content buffer, requests, ads) and overall status.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_pulse',
    description: 'Get an executive pulse summary: health counts (green/yellow/red), open and breached requests, upcoming content for the next 7 days. Best for quick strategic overview.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // ── Write tools (require confirmation) ──
  {
    name: 'update_client',
    description: 'Update a client record. Can change name, platform, retainer, ad budget, ROAS target, status, or notes.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID to update' },
        data: {
          type: 'object',
          description: 'Fields to update. Can include: name, platform, retainer, adBudget, roasTarget, status, notes',
          properties: {
            name: { type: 'string' },
            platform: { type: 'string' },
            retainer: { type: 'number' },
            adBudget: { type: 'number' },
            roasTarget: { type: 'number' },
            status: { type: 'string', enum: ['active', 'paused', 'offboarded'] },
            notes: { type: 'string' },
          },
        },
      },
      required: ['clientId', 'data'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'create_request',
    description: 'Create a new client request/task. Requires clientId, title, and type. Optionally set priority, dueDate, assignedTo, and description.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client this request belongs to' },
        title: { type: 'string', description: 'Short title for the request' },
        type: { type: 'string', enum: ['revision', 'new_content', 'strategy', 'reporting', 'other'], description: 'Request type' },
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], description: 'Priority level (default: normal)' },
        description: { type: 'string', description: 'Detailed description' },
        dueDate: { type: 'string', description: 'Due date in ISO format' },
        assignedTo: { type: 'string', description: 'Team member name to assign' },
      },
      required: ['clientId', 'title', 'type'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'update_request',
    description: 'Update a request/task. Can change status, assignment, due date, or mark as resolved.',
    input_schema: {
      type: 'object',
      properties: {
        requestId: { type: 'string', description: 'The request ID to update' },
        data: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            status: { type: 'string', enum: ['new', 'acknowledged', 'in_progress', 'review', 'completed', 'closed'] },
            assignedTo: { type: 'string' },
            dueDate: { type: 'string' },
            resolvedAt: { type: 'string', description: 'ISO date when resolved' },
          },
        },
      },
      required: ['requestId', 'data'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'create_content',
    description: 'Create a new content item in the pipeline. Requires clientId, title, and contentType.',
    input_schema: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client this content is for' },
        title: { type: 'string', description: 'Content title' },
        contentType: { type: 'string', enum: ['post', 'reel', 'story', 'carousel', 'ad_creative'], description: 'Type of content' },
        platform: { type: 'string', enum: ['meta', 'google', 'instagram', 'tiktok', 'linkedin'], description: 'Target platform' },
        status: { type: 'string', enum: ['draft', 'review', 'approved', 'scheduled', 'published'], description: 'Initial status (default: draft)' },
        scheduledDate: { type: 'string', description: 'Scheduled publish date in ISO format' },
        assignedTo: { type: 'string', description: 'Team member name' },
        body: { type: 'string', description: 'Content body/copy' },
      },
      required: ['clientId', 'title', 'contentType'],
    },
    requiresConfirmation: true,
  },
  {
    name: 'update_content',
    description: 'Update a content item. Can change status, scheduled date, body, or assignment.',
    input_schema: {
      type: 'object',
      properties: {
        contentId: { type: 'string', description: 'The content item ID to update' },
        data: {
          type: 'object',
          description: 'Fields to update',
          properties: {
            status: { type: 'string', enum: ['draft', 'review', 'approved', 'scheduled', 'published'] },
            scheduledDate: { type: 'string' },
            publishedDate: { type: 'string' },
            body: { type: 'string' },
            assignedTo: { type: 'string' },
          },
        },
      },
      required: ['contentId', 'data'],
    },
    requiresConfirmation: true,
  },

  // ── Revenue tools ──
  {
    name: 'get_revenue',
    description: 'Get revenue dashboard: total MRR, revenue by client, at-risk revenue, ad spend totals. Use for financial overview.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  {
    name: 'get_content_calendar',
    description: 'Get content scheduled across all clients for a date range. Returns items grouped by date with client, platform, type, and status. Default: current week.',
    input_schema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start date YYYY-MM-DD (default: Monday of current week)' },
        end: { type: 'string', description: 'End date YYYY-MM-DD (default: Sunday of current week)' },
      },
    },
  },
  {
    name: 'get_team',
    description: 'Get list of team members with their roles and status. Use for employee tracking and task assignment.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_team_workload',
    description: 'Get workload for a specific team member — their open requests and content assignments across all clients.',
    input_schema: {
      type: 'object',
      properties: {
        memberId: { type: 'string', description: 'Team member ID' },
      },
      required: ['memberId'],
    },
  },
  {
    name: 'get_payments',
    description: 'Get payments dashboard: outstanding invoices, overdue amounts, due this week, recently paid. Use for financial tracking and cash flow visibility.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_brief',
    description: 'Get the daily agency briefing: health status per client (green/yellow/red), content due this week, overdue requests, revenue at risk. Perfect for morning check-ins and Monday overviews.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },

  // ── Research tools ──
  {
    name: 'web_search',
    description: 'Search the web for current information. Use for competitive research, market trends, local events, industry news. Returns search results with titles, snippets, and URLs.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'The search query. Be specific — include location, business type, and timeframe when relevant.' },
        num_results: { type: 'number', description: 'Number of results to return (default: 5, max: 10)' },
      },
      required: ['query'],
    },
  },
];

// ─── Agent tool access matrix ─────────────────────────────

import type { AgentId } from './openclawClient.js';

const AGENT_TOOL_ACCESS: Record<string, string[]> = {
  'inbox-triage': ['get_clients', 'get_requests', 'create_request', 'update_request', 'get_pulse'],
  'client-memory': ['get_client_detail', 'get_clients', 'update_client', 'get_health', 'get_ads'],
  'project-manager': ['get_requests', 'create_request', 'update_request', 'get_clients', 'get_pulse', 'get_team', 'get_team_workload'],
  'approval-feedback': ['get_content', 'update_content', 'get_requests', 'update_request'],
  'content-system': ['get_content', 'create_content', 'update_content', 'get_clients', 'get_health', 'get_brief', 'get_requests', 'get_content_calendar'],
  'founder-boss': ALL_TOOLS.map(t => t.name), // full access
  'research-intel': ['get_clients', 'get_client_detail', 'get_content', 'get_health', 'get_ads', 'get_pulse', 'web_search', 'update_client', 'create_content'],
};

/**
 * Get the tool definitions for a specific agent (Anthropic API format).
 * Strips the custom `requiresConfirmation` flag before sending.
 */
export function getToolsForAgent(agentId: AgentId): Array<{ name: string; description: string; input_schema: unknown }> {
  const allowed = AGENT_TOOL_ACCESS[agentId] || [];
  return ALL_TOOLS
    .filter(t => allowed.includes(t.name))
    .map(({ requiresConfirmation: _, ...tool }) => tool);
}

/**
 * Check if a tool requires user confirmation before executing.
 */
export function toolRequiresConfirmation(toolName: string): boolean {
  const tool = ALL_TOOLS.find(t => t.name === toolName);
  return tool?.requiresConfirmation ?? false;
}

// ─── Tool execution ───────────────────────────────────────

interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

async function callAgentTools(method: string, path: string, body?: unknown): Promise<ToolResult> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (AGENT_KEY) headers['x-agent-key'] = AGENT_KEY;

    const opts: RequestInit = { method, headers };
    if (body && (method === 'POST' || method === 'PATCH')) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE_URL}/api/agent-tools${path}`, {
      ...opts,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Execute a tool call and return the result.
 */
export async function executeTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  switch (toolName) {
    // ── Read tools ──
    case 'get_clients':
      return callAgentTools('GET', '/clients');

    case 'get_client_detail':
      return callAgentTools('GET', `/clients/${input.clientId}`);

    case 'get_requests': {
      const params = new URLSearchParams();
      if (input.clientId) params.set('clientId', String(input.clientId));
      if (input.status) params.set('status', String(input.status));
      const qs = params.toString();
      return callAgentTools('GET', `/requests${qs ? '?' + qs : ''}`);
    }

    case 'get_content': {
      const params = new URLSearchParams();
      if (input.clientId) params.set('clientId', String(input.clientId));
      if (input.status) params.set('status', String(input.status));
      const qs = params.toString();
      return callAgentTools('GET', `/content${qs ? '?' + qs : ''}`);
    }

    case 'get_ads': {
      const params = new URLSearchParams();
      if (input.clientId) params.set('clientId', String(input.clientId));
      const qs = params.toString();
      return callAgentTools('GET', `/ads${qs ? '?' + qs : ''}`);
    }

    case 'get_health':
      return callAgentTools('GET', '/health');

    case 'get_pulse':
      return callAgentTools('GET', '/pulse');

    case 'get_revenue':
      return callAgentTools('GET', '/revenue');

    case 'get_content_calendar': {
      const params = new URLSearchParams();
      if (input.start) params.set('start', input.start as string);
      if (input.end) params.set('end', input.end as string);
      const qs = params.toString();
      return callAgentTools('GET', `/content-calendar${qs ? `?${qs}` : ''}`);
    }

    case 'get_team':
      return callAgentTools('GET', '/team');

    case 'get_team_workload':
      return callAgentTools('GET', `/team/${input.memberId}/workload`);

    case 'get_payments':
      return callAgentTools('GET', '/payments');

    case 'get_brief':
      return callAgentTools('GET', '/brief');

    // ── Write tools ──
    case 'update_client':
      return callAgentTools('PATCH', `/clients/${input.clientId}`, input.data);

    case 'create_request':
      return callAgentTools('POST', '/requests', input);

    case 'update_request':
      return callAgentTools('PATCH', `/requests/${input.requestId}`, input.data);

    case 'create_content':
      return callAgentTools('POST', '/content', input);

    case 'update_content':
      return callAgentTools('PATCH', `/content/${input.contentId}`, input.data);

    // ── Research tools ──
    case 'web_search': {
      return executeWebSearch(String(input.query), Number(input.num_results) || 5);
    }

    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

// ─── Web search implementation ────────────────────────────
// Uses a simple fetch to a search API. Falls back gracefully.

async function executeWebSearch(query: string, numResults: number): Promise<ToolResult> {
  try {
    // Use DuckDuckGo instant answer API (no key required) + scraping lite results
    const encodedQuery = encodeURIComponent(query);
    const res = await fetch(
      `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`,
      { signal: AbortSignal.timeout(10000) }
    );

    if (!res.ok) {
      return { success: false, error: `Search API error: ${res.status}` };
    }

    const data = await res.json() as Record<string, unknown>;

    // Extract results from DuckDuckGo response
    const results: Array<{ title: string; snippet: string; url: string }> = [];

    // Abstract (main answer)
    if (data.Abstract && data.AbstractURL) {
      results.push({
        title: String(data.Heading || 'Top Result'),
        snippet: String(data.Abstract).slice(0, 300),
        url: String(data.AbstractURL),
      });
    }

    // Related topics
    const topics = (data.RelatedTopics || []) as Array<Record<string, unknown>>;
    for (const topic of topics.slice(0, numResults - results.length)) {
      if (topic.Text && topic.FirstURL) {
        results.push({
          title: String(topic.Text).split(' - ')[0]?.slice(0, 100) || 'Related',
          snippet: String(topic.Text).slice(0, 300),
          url: String(topic.FirstURL),
        });
      }
      // Nested topics
      if (topic.Topics && Array.isArray(topic.Topics)) {
        for (const sub of (topic.Topics as Array<Record<string, unknown>>).slice(0, 2)) {
          if (sub.Text && sub.FirstURL) {
            results.push({
              title: String(sub.Text).split(' - ')[0]?.slice(0, 100) || 'Related',
              snippet: String(sub.Text).slice(0, 300),
              url: String(sub.FirstURL),
            });
          }
        }
      }
    }

    // If no results from DDG, return a helpful message
    if (results.length === 0) {
      return {
        success: true,
        data: {
          query,
          results: [],
          note: 'No instant results found. Try a more specific query or rephrase. The agent can still reason about this topic from training knowledge.',
        },
      };
    }

    return {
      success: true,
      data: { query, results: results.slice(0, numResults) },
    };
  } catch (err) {
    return { success: false, error: `Web search failed: ${(err as Error).message}` };
  }
}
