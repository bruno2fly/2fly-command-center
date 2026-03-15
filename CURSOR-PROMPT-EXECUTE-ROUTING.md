# Cursor Prompt: Task Execution Routing System

## Problem
When a user clicks "🤖 Execute" on a task, the AI agent needs to:
1. Actually DO the work (not just return text)
2. Create REAL database items in the appropriate place
3. Show results where they belong (Content tab, Ads tab, Reports tab)

Currently the Execute button calls `/api/agents/chat` which tries to use a direct Anthropic API key. We need to change this to use the OpenClaw gateway AND route results to the correct destination.

## Architecture

### Execution Flow:
```
User clicks Execute
    ↓
POST /api/tasks/:taskId/execute
    ↓
Backend detects task type (content/ads/research/general)
    ↓
Backend calls OpenClaw gateway to get AI response
    ↓
Backend PARSES the response into structured items
    ↓
Backend CREATES items in the right table (Content, AgentAction, Report)
    ↓
Backend returns summary of what was created
    ↓
Frontend shows "✅ Created 5 content ideas — view in Content tab"
```

### New API Endpoint: `POST /api/tasks/:taskId/execute`

Create in `server/src/routes/task-execute.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Detect what kind of execution this task needs
function detectExecutionType(task: any): 'content' | 'ads' | 'research' | 'general' {
  const text = `${task.title} ${task.description || ''}`.toLowerCase();
  
  if (/content|post|calendar|caption|hook|reel|story|carousel|social media|strategy|promotion|creative/.test(text)) {
    return 'content';
  }
  if (/ads?|campaign|budget|meta|facebook ads|roas|spend|targeting/.test(text)) {
    return 'ads';
  }
  if (/research|competitor|analysis|market|report|audit/.test(text)) {
    return 'research';
  }
  return 'general';
}

router.post('/:taskId/execute', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    // 1. Get the task
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { client: true }
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    // 2. Get full client context
    const client = await prisma.client.findUnique({
      where: { id: task.clientId },
      include: { contentItems: { take: 5, orderBy: { createdAt: 'desc' } } }
    });
    
    // 3. Detect execution type
    const execType = detectExecutionType(task);
    
    // 4. Build the AI prompt based on type
    const prompt = buildExecutionPrompt(task, client, execType);
    
    // 5. Call OpenClaw gateway for AI response
    const aiResponse = await callOpenClawGateway(prompt);
    
    // 6. Parse response and create items based on type
    let result;
    switch (execType) {
      case 'content':
        result = await createContentItems(aiResponse, task.clientId, task.id);
        break;
      case 'ads':
        result = await createAgentActions(aiResponse, task.clientId, task.id);
        break;
      case 'research':
        result = await createReport(aiResponse, task.clientId, task.id);
        break;
      default:
        result = { type: 'general', summary: aiResponse, itemsCreated: 0 };
    }
    
    // 7. Update task status
    await prisma.task.update({
      where: { id: taskId },
      data: { 
        status: 'completed',
        // Store execution result reference
      }
    });
    
    // 8. Return what was created
    res.json({
      success: true,
      executionType: execType,
      ...result
    });
    
  } catch (err) {
    console.error('[task-execute] Error:', err);
    res.status(500).json({ error: 'Execution failed' });
  }
});

function buildExecutionPrompt(task: any, client: any, execType: string): string {
  let clientNotes: any = {};
  try { clientNotes = JSON.parse(client?.notes || '{}'); } catch { clientNotes = {}; }
  
  let systemContext = `You are a marketing agency AI executing a task for client "${client?.name}".

CLIENT CONTEXT:
- Name: ${client?.name}
- Platform: ${client?.platform || 'Instagram, Facebook'}
- Ad Budget: $${client?.adBudget || 0}/mo
- Retainer: $${client?.monthlyRetainer || client?.retainer || 0}/mo
`;

  if (clientNotes.redLines) {
    systemContext += `\n⚠️ RULES (NEVER BREAK):\n${clientNotes.redLines.map((r: string) => `- ${r}`).join('\n')}\n`;
  }
  if (clientNotes.brandAssets?.voice) {
    systemContext += `\nBrand Voice: ${clientNotes.brandAssets.voice}\n`;
  }
  if (clientNotes.operations) {
    systemContext += `\nOperations: ${clientNotes.operations.hours || ''} | ${clientNotes.operations.schedule || ''}\n`;
  }
  if (clientNotes.unique) {
    systemContext += `\nUnique Selling Points:\n${clientNotes.unique.map((u: string) => `- ${u}`).join('\n')}\n`;
  }
  if (clientNotes.revenuePriorities) {
    systemContext += `\nRevenue Priorities:\n${clientNotes.revenuePriorities.map((p: string) => `- ${p}`).join('\n')}\n`;
  }
  if (clientNotes.links) {
    systemContext += `\nReference Links:\n${Object.entries(clientNotes.links).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`;
  }
  if (clientNotes.digitalPresence) {
    systemContext += `\nDigital Presence:\n${Object.entries(clientNotes.digitalPresence).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n`;
  }

  // Type-specific output instructions
  if (execType === 'content') {
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
  } else if (execType === 'ads') {
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
  } else if (execType === 'research') {
    systemContext += `
OUTPUT FORMAT — Respond with a JSON object:
{
  "title": "Report title",
  "summary": "Executive summary (2-3 sentences)",
  "findings": ["Finding 1", "Finding 2", ...],
  "recommendations": ["Recommendation 1", "Recommendation 2", ...],
  "data": "Detailed analysis text"
}

Respond ONLY with the JSON object, no other text.
`;
  }

  return `${systemContext}\n\nTASK TO EXECUTE:\nTitle: ${task.title}\nDescription: ${task.description || 'No additional details.'}\n\nExecute this task fully. Be specific to this client — no generic content.`;
}

// Call OpenClaw gateway instead of direct Anthropic
async function callOpenClawGateway(prompt: string): Promise<string> {
  // Option A: Use OpenClaw CLI
  const { execSync } = require('child_process');
  try {
    const result = execSync(
      `echo ${JSON.stringify(prompt)} | openclaw run --model anthropic/claude-sonnet-4-20250514 --no-stream 2>/dev/null`,
      { encoding: 'utf-8', timeout: 120000 }
    );
    return result.trim();
  } catch {
    // Option B: Fallback to direct API if ANTHROPIC_API_KEY is set
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('No AI provider available');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    
    const data = await response.json() as any;
    return data.content?.[0]?.text || '';
  }
}

// Parse AI response and create content items
async function createContentItems(aiResponse: string, clientId: string, taskId: string) {
  let items: any[];
  try {
    // Try to extract JSON from response (might have markdown wrapper)
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    items = JSON.parse(jsonMatch?.[0] || aiResponse);
  } catch {
    return { type: 'content', summary: aiResponse, itemsCreated: 0, error: 'Could not parse AI response into content items' };
  }
  
  const created = [];
  for (const item of items) {
    const contentItem = await prisma.contentItem.create({
      data: {
        clientId,
        title: item.title || 'Untitled',
        contentType: item.type || 'post',
        platform: item.platform || 'instagram',
        status: 'draft', // Goes to Content tab as idea to approve
        notes: [
          item.hook ? `Hook: ${item.hook}` : '',
          item.format ? `| Format: ${item.format}` : '',
          item.whyThisWorks ? `| Goal: ${item.whyThisWorks}` : '',
          item.cta ? `| CTA: ${item.cta}` : '',
          item.visualBrief ? `| Visual: ${item.visualBrief}` : '',
          item.score ? `Score: ${item.score}/10` : '',
        ].filter(Boolean).join(' '),
        // Store full data as JSON if there's a metadata field
      }
    });
    created.push(contentItem);
  }
  
  return {
    type: 'content',
    summary: `Created ${created.length} content ideas — view in Content tab`,
    itemsCreated: created.length,
    items: created.map(c => ({ id: c.id, title: c.title, type: c.contentType })),
    destination: 'content' // tells frontend where to link
  };
}

// Parse AI response and create agent actions for ads
async function createAgentActions(aiResponse: string, clientId: string, taskId: string) {
  let items: any[];
  try {
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    items = JSON.parse(jsonMatch?.[0] || aiResponse);
  } catch {
    return { type: 'ads', summary: aiResponse, itemsCreated: 0, error: 'Could not parse' };
  }
  
  const created = [];
  for (const item of items) {
    const action = await prisma.agentAction.create({
      data: {
        clientId,
        agentId: 'meta-traffic',
        actionType: item.type || 'recommendation',
        title: item.title,
        description: `${item.action}\n\nReasoning: ${item.reasoning}`,
        status: 'proposed', // Shows in Ads tab for approval
        priority: item.priority || 'medium',
      }
    });
    created.push(action);
  }
  
  return {
    type: 'ads',
    summary: `Created ${created.length} ad recommendations — view in Ads tab`,
    itemsCreated: created.length,
    destination: 'ads'
  };
}

// Create a report
async function createReport(aiResponse: string, clientId: string, taskId: string) {
  let report: any;
  try {
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    report = JSON.parse(jsonMatch?.[0] || aiResponse);
  } catch {
    report = { title: 'AI Research Report', summary: aiResponse, findings: [], recommendations: [] };
  }
  
  const created = await prisma.dailyReport.create({
    data: {
      clientId,
      date: new Date(),
      type: 'research',
      summary: report.summary || '',
      details: JSON.stringify(report),
    }
  });
  
  return {
    type: 'research',
    summary: `Report created — view in Reports tab`,
    itemsCreated: 1,
    destination: 'reports'
  };
}

export default router;
```

Register in `server/src/index.ts`:
```typescript
import taskExecuteRoutes from './routes/task-execute';
app.use('/api/tasks', taskExecuteRoutes);
```

## Frontend Changes

### Update Execute button in TaskDetailModal

Change the Execute flow to use the new endpoint:

```typescript
// OLD: 
// api.postAgentChat({ agent, message, clientId })

// NEW:
const handleExecute = async () => {
  setExecuting(true);
  try {
    const res = await fetch(`${API_BASE}/api/tasks/${task.id}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await res.json();
    
    if (result.success) {
      setExecuteResult(result);
      toast.success(result.summary);
      onStatusChange?.(task.id, 'completed');
    } else {
      toast.error(result.error || 'Execution failed');
    }
  } catch (err) {
    toast.error("Agent couldn't execute — try Copy Prompt instead");
  }
  setExecuting(false);
};
```

### Show Results with Navigation

After execution, show what was created with a link to the right tab:

```
┌─────────────────────────────────────────────────────────────┐
│ ✅ Execution Complete                                        │
│─────────────────────────────────────────────────────────────│
│                                                             │
│ Created 7 content ideas for Cafe St. Petersburg             │
│                                                             │
│ • 📸 Easter Brunch Announcement (Score: 9/10)               │
│ • 🎬 Jazz Thursday Reel (Score: 8/10)                       │
│ • 📸 Sunday Brunch Family Promo (Score: 8/10)               │
│ • 🎬 Kitchen Behind-the-Scenes (Score: 9/10)                │
│ • 📱 Weekend Story Teaser (Score: 7/10)                     │
│ • 🎠 Menu Highlights Carousel (Score: 8/10)                 │
│ • 📸 Event Testimonial (Score: 8/10)                        │
│                                                             │
│ [📝 View in Content Tab →]                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

The "View in [Tab]" link navigates to the appropriate tab:
- `destination: 'content'` → switch to Content tab
- `destination: 'ads'` → switch to Ads tab  
- `destination: 'reports'` → switch to Reports tab

### Result Navigation Link

```typescript
const destinationLabels: Record<string, { label: string; tab: string }> = {
  content: { label: '📝 View in Content Tab →', tab: 'content' },
  ads: { label: '📊 View in Ads Tab →', tab: 'ads' },
  reports: { label: '📈 View in Reports Tab →', tab: 'reports' },
};

// On click: call the parent's tab switcher
// e.g. onTabChange?.('content')
```

## Same changes for TaskCard compact buttons

Update the compact 🤖 button on task cards to also use `POST /api/tasks/:taskId/execute` instead of `postAgentChat`.

## Important Notes

- The `callOpenClawGateway` function tries `openclaw run` CLI first (uses your existing model/keys), falls back to direct Anthropic API
- Content items are created with status `draft` so they appear in the Content Ideas approval flow
- Agent actions are created with status `proposed` so they appear for approval in Ads tab
- Reports go to the Reports tab
- The task is marked `completed` after successful execution
- If AI response can't be parsed into structured items, fall back to showing raw text
- All items are linked to the correct clientId
