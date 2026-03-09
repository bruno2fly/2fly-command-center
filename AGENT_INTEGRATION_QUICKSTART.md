# Agent Integration — Quick Start Guide

Everything is wired up. Here's how to test it.

## Step 1: Copy files back to your project

The integration was built in the Desktop copy. Copy it back to your Cursor project:

```bash
# Replace YOUR_ORIGINAL_PATH with wherever the real project lives
cp -r ~/Desktop/2fly-command-center/* "YOUR_ORIGINAL_PATH/"
```

Or if you prefer, just work from the Desktop copy going forward.

## Step 2: Configure API Key

The agent chat calls the Anthropic API directly (not through the OpenClaw gateway).
You need one of these:

**Option A** — Set in `server/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...your-key-here...
```

**Option B** — Already have OpenClaw agents? The server auto-reads the key from:
```
~/.openclaw/agents/inbox-triage/auth-profiles.json
```

## Step 3: Start everything

You need 2 things running (gateway is optional):

```bash
# Terminal 1: Start the 2FLY platform
cd ~/Desktop/2fly-command-center   # or wherever your project is
npm run dev

# (Optional) Terminal 2: Start OpenClaw gateway for status monitoring
openclaw gateway start
```

This starts both the Express server (port 4000) and Next.js frontend (port 3001).
Agent chat works without the gateway — it calls Anthropic directly.

## Step 4: Test the Agent API (server)

Open a new terminal and test the endpoints:

```bash
# Check gateway status through the bridge
curl http://localhost:4000/api/agents/status | python3 -m json.tool

# List available agents
curl http://localhost:4000/api/agents/list | python3 -m json.tool

# Send a message to inbox-triage
curl -X POST http://localhost:4000/api/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"agent": "inbox-triage", "message": "!ping"}'

# Route a command automatically
curl -X POST http://localhost:4000/api/agents/command \
  -H "Content-Type: application/json" \
  -d '{"command": "!pulse"}'

# Test the database bridge
curl http://localhost:4000/api/agent-tools/clients | python3 -m json.tool
curl http://localhost:4000/api/agent-tools/pulse | python3 -m json.tool
```

## Step 5: Test the Agent Chat Panel (frontend)

1. Open http://localhost:3001
2. Look for the **"Agents"** button in the command bar (top right, before Focus)
3. Click it — or press **Cmd+M** — to open the agent chat panel
4. Select an agent from the dropdown
5. Try a quick action button or type `!ping`
6. Try switching between agents — each keeps its own chat history

## Step 6: Check the Dashboard Widget

1. Go to http://localhost:3001 (main dashboard)
2. Make sure you're in **Full Board** mode (not Focus)
3. Look at the right sidebar — the **AI Agents** widget should appear at the top
4. Each agent shows an online/offline indicator
5. Click any agent to open a chat with them

## What was added

### New server files (3):
- `server/src/lib/openclawClient.ts` — Direct Anthropic API client (loads SOUL.md from ~/.openclaw/agents/)
- `server/src/routes/agents.ts` — Agent chat/command/status API
- `server/src/routes/agent-tools.ts` — Database bridge for agents

### New client files (6):
- `client/src/contexts/AgentChatContext.tsx` — Chat state management
- `client/src/components/agent-chat/AgentChatPanel.tsx` — Slide-out chat panel
- `client/src/components/agent-chat/AgentSelector.tsx` — Agent picker
- `client/src/components/agent-chat/AgentMessage.tsx` — Message bubbles
- `client/src/components/agent-chat/AgentStatusBadge.tsx` — Online indicator
- `client/src/components/founder/AgentStatusWidget.tsx` — Dashboard widget

### Modified files (6):
- `server/src/index.ts` — Registered `/api/agents` and `/api/agent-tools` routes
- `server/.env` — Added `OPENCLAW_GATEWAY_URL` and `OPENCLAW_GATEWAY_TOKEN`
- `server/src/lib/automations.js` — Cron jobs now notify agents
- `client/src/components/PortalLayout.tsx` — Added AgentChatProvider + panel
- `client/src/components/CommandBar/CommandBar.tsx` — Added Agents button + Cmd+M shortcut
- `client/src/components/FounderDashboard.tsx` — Added AgentStatusWidget to sidebar

## Keyboard shortcuts
- **Cmd+M** — Toggle agent chat panel
- **Escape** — Close agent chat panel
- **Enter** — Send message
- **Shift+Enter** — New line in message

## Troubleshooting

**"Gateway offline" in the chat panel:**
- This now means "no Anthropic API key found"
- Set `ANTHROPIC_API_KEY` in `server/.env`, or make sure `~/.openclaw/agents/*/auth-profiles.json` exists
- The OpenClaw gateway is optional (only used for status monitoring)

**Agent responses are slow:**
- Claude Sonnet 4.5 typically responds in 3-8 seconds
- The typing indicator (bouncing dots) shows while waiting

**"Anthropic API error (401)" in server logs:**
- Your API key is invalid or expired. Check `server/.env` → `ANTHROPIC_API_KEY`

**Automations not notifying agents:**
- Automations use the same direct API approach as the chat panel
- Check server logs for `[AGENT:*] API unreachable` messages

**TypeScript errors in Cursor:**
- Run `cd server && npx tsc --noEmit` to check server types
- Run `cd client && npx tsc --noEmit` to check client types

## Next steps (not yet implemented)
- Per-channel Discord routing (each channel talks to its own agent)
- SOUL.md updates to teach agents about the Prisma database endpoints
- First real client creation and full workflow test
- VPS deployment
