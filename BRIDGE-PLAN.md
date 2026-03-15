# 2FLY Flow → Command Center Bridge

## Architecture
2FLY Flow (port 3001) = Production tool (designers, client approvals, scheduling)
Command Center (port 3001/4000) = Agency command layer (monitoring, agents, ads, reports)

**Bridge approach**: Sync script that reads 2FLY Flow data → pushes to CC API
- Runs as CC cron (every 30 min or on-demand)
- Or: 2FLY Flow webhook calls CC API on changes

## Data Mapping

### 1. Scheduled Posts → CC Content Tab "Next Posts Scheduled"
**Source**: `2fly-client-portal/server/data/` + `GET /api/posts/scheduled`
**Target**: CC Content items with `source: "2flyflow"`, status "scheduled"

Map:
- `ScheduledPost.caption` → `ContentItem.title` (first line or first 60 chars)
- `ScheduledPost.platforms` → `ContentItem.platform` (instagram/facebook)
- `ScheduledPost.scheduledAt` → `ContentItem.scheduledDate`
- `ScheduledPost.status` → `ContentItem.status` (scheduled/published)
- `ScheduledPost.mediaUrl` → `ContentItem.mediaUrl` (new field?)

### 2. Client Requests → CC Tasks "Client Requests via 2FLY Flow"
**Source**: Portal state requests + any client-submitted requests
**Target**: CC Tasks with `source: "2flyflow"`, type "client_request"

Map:
- Request title → `Task.title`
- Request description → `Task.description`
- Priority → `Task.priority`
- Status → `Task.status` (new/in_progress/completed)

### 3. Production Tasks → CC Tasks "Designer Tasks"
**Source**: `GET /api/production/tasks`
**Target**: CC Tasks with `source: "2flyflow"`, type "production"

Map:
- `ProductionTask.caption` → `Task.title`
- `ProductionTask.status` → `Task.status`
  - assigned/in_progress → pending
  - review/changes_requested → in_progress
  - approved/ready_to_post → completed
- `ProductionTask.priority` → `Task.priority`
- `ProductionTask.deadline` → `Task.dueDate`
- `ProductionTask.designerId` → `Task.assignedTo`

## Client Matching
2FLY Flow clients need to map to CC clients.
Add `flowClientId` field to CC Client model, or match by name.
Currently only "ardanspa" in Flow → maps to "Ardan Med Spa" in CC.

## Implementation Steps

### Phase 1: Sync Script (MVP)
1. Add `flowClientId String?` to CC Client schema (optional mapping)
2. Create `server/scripts/flow-sync.js`:
   - Read 2FLY Flow JSON files directly (same machine)
   - Match clients by name or flowClientId
   - Upsert scheduled posts → CC content items
   - Upsert production tasks → CC tasks
   - Upsert client requests → CC tasks
3. Add cron job: every 30 min

### Phase 2: Webhook (Better)
1. Add webhook endpoint to CC: `POST /api/webhooks/flow`
2. Add webhook calls to 2FLY Flow on post schedule/publish/request creation
3. Real-time sync instead of polling

### Phase 3: Unified Client View
1. CC Content tab shows "Next Posts" section with 2FLY Flow scheduled posts
2. CC Tasks tab shows "Client Requests" filter for 2FLY Flow requests
3. CC Overview shows production pipeline status from 2FLY Flow

## Port Conflict Resolution
Both apps use port 3001. Options:
- Change CC frontend to 3002 (or 3001, Flow to 3002)
- Run only one at a time (current approach)
- Use nginx/caddy reverse proxy
- Recommended: Change 2FLY Flow to port 3002, keep CC on 3001
