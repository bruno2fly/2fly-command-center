# 2FLY Command Center API — For Claude Code

Base URL: `http://localhost:4000`

## Push Tasks
```bash
curl -X POST http://localhost:4000/api/clients/{clientId}/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Task title",
    "description": "Full description with steps",
    "priority": "high",
    "status": "pending",
    "source": "agent"
  }'
```

## Push Content Ideas
```bash
curl -X POST http://localhost:4000/api/content \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "{clientId}",
    "title": "Content title",
    "contentType": "post",
    "platform": "instagram",
    "status": "draft",
    "notes": "Hook: ... | Format: Carousel (3 slides) | Goal: Drive engagement | CTA: Link in bio | Visual: Warm lighting, overhead shot Score: 8/10"
  }'
```

## Push Agent Actions (proposals)
```bash
curl -X POST http://localhost:4000/api/agent-actions \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "{clientId}",
    "agentId": "claude-code",
    "title": "Action title",
    "description": "What to do and why",
    "status": "proposed",
    "actionType": "recommendation"
  }'
```

## List Clients
```bash
# Agency clients
curl http://localhost:4000/api/clients?workspace=agency

# SaaS products
curl http://localhost:4000/api/clients?workspace=saas
```

## Get Client Details
```bash
curl http://localhost:4000/api/agent-tools/clients/{clientId}
```

## Update Task Status
```bash
curl -X PATCH http://localhost:4000/api/clients/{clientId}/tasks/{taskId} \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

## Client IDs

### Agency Clients
| Client | ID |
|--------|-----|
| Shape SPA Miami | cmml1eoiv000112dhgab4sa2f |
| Shape Spa FLL | cmml1eoiw000212dh9pbvfqig |
| Sudbury Point Grill | cmml1eoix000312dh09sr9paw |
| Pro Fortuna | cmml1eoix000412dhfd1zyv1f |
| Casa Nova | cmml1eoiy000512dh9t8msfyv |
| Ardan Med Spa | cmml1eoiz000612dhumvxv3e4 |
| This is it Brazil | cmml1eoiz000712dh325pvxb3 |
| Super Crisp | cmml1eoj0000812dhaqydcbuw |
| Hafiza | cmml1eoj0000912dhqmeqwy9y |
| Cristiane Amorim | cmml1eoj1000a12dh67dswhb2 |
| Cafe St. Petersburg | cmmmkh2ss0000zoqznsxthdbi |

### SaaS Products
| Product | ID |
|---------|-----|
| 2FLY Flow | cmmpuhc6n0000j75de6k9qyot |
| Estoqui | cmmpuhc7t0001j75dajkrr28m |
| 2FLY Command Center | cmmpuhc8c0002j75dhbnk1f2b |

## Notes Format for Content
Content notes use pipe-separated fields that get parsed by the UI:
```
Hook: [attention grabber] | Format: [Carousel/Reel/Story] | Goal: [engagement/conversion/authority] | CTA: [call to action] | Visual: [designer brief] Score: [1-10]/10
```

## Content Types
post, reel, story, carousel, video, blog_post, email_campaign, ad_copy, newsletter

## Platforms
instagram, facebook, tiktok, youtube, twitter, linkedin, email, blog

## Available Agents

These agents run on OpenClaw (not localhost). To request agent work, create an agent action via the API:

```bash
curl -X POST http://localhost:4000/api/agent-actions \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "{clientId}",
    "agentId": "{agentId}",
    "title": "What you want done",
    "description": "Full details + context",
    "status": "proposed",
    "actionType": "recommendation",
    "priority": "high"
  }'
```

| Agent ID | Name | What It Does |
|----------|------|-------------|
| content-system | Content Intelligence Engine | 13-step content strategy: brand research, audience psychology, competitor analysis, hook generation, 30-day calendars, visual briefs for designers |
| meta-traffic | Meta Traffic Agent | Real Meta Ads execution: pause/resume campaigns, scale budgets, analyze performance, propose optimizations. Connected to 4 real ad accounts |
| growth-strategist | Growth Strategist | Tracks $30K/mo revenue goal by June 2026. Weekly strategy reviews, revenue math, accountability |
| research-intel | Research Intel | AI trend scanning, competitor research, market analysis. Posts to #ai-updates. Can download + transcribe Instagram reels |
| founder-boss | Founder Boss | Strategic decisions, system overview, cross-client visibility |
| project-manager | Project Manager | Task routing, priority management |
| inbox-triage | Inbox Triage | Message classification and routing |
| client-memory | Client Memory | Stores and retrieves client context |

### How to use agents from Claude Code:
1. **Create agent actions** — POST to `/api/agent-actions` with the agent's ID. The action shows up in CC for Bruno to approve, then the agent executes.
2. **Create tasks** — POST to `/api/clients/{clientId}/tasks`. Tasks can be executed by agents via the CC UI (🤖 Execute button).
3. **Script approach** — Generate a bash script with curl commands, Bruno runs locally.

### Example: Ask content agent to create a launch strategy
```bash
curl -X POST http://localhost:4000/api/agent-actions \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "cmmpuhc6n0000j75de6k9qyot",
    "agentId": "content-system",
    "title": "Create 2FLY Flow launch content strategy",
    "description": "Run full 13-step content intelligence pipeline for 2FLY Flow SaaS launch. Target audience: small marketing agencies (2-50 employees). Generate: brand positioning, content pillars, 15+ hooks, 30-day launch content calendar, visual briefs for all posts. Focus on ClickUp-replacement angle and AI-powered workflow.",
    "status": "proposed",
    "actionType": "content_strategy",
    "priority": "high"
  }'
```
```
