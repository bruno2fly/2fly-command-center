# Cursor Prompt: Workspace Switcher — Agency vs SaaS

## Overview
Add a **workspace switcher** at the top of Command Center that toggles between two views:
1. **🏢 2FLY Agency** — existing client management (marketing agency clients)
2. **🚀 2FLY SaaS** — Bruno's own products/platforms (2FLY Flow, Estoqui, future products)

Both views use the same UI (client list, tabs, tasks, content, etc.) but show different "clients" (products).

## Database Changes

### Add `workspace` field to Client model

In `server/prisma/schema.prisma`, add to the Client model:
```prisma
workspace  String   @default("agency")  // "agency" or "saas"
```

Run `npx prisma db push` after.

### Seed SaaS Products

Create initial SaaS "clients" (products):

```sql
-- 2FLY Flow
INSERT INTO Client (id, name, status, platform, workspace, healthStatus, notes, retainer, adBudget, createdAt, updatedAt)
VALUES ('saas-2flyflow', '2FLY Flow', 'active', 'Web SaaS', 'saas', 'yellow', 
'{"type":"saas","description":"Agency management SaaS — content production, client portal, designer workflow, scheduling","stage":"beta","revenue":0,"targetRevenue":15000,"url":"https://2flyflow.com","techStack":"Next.js, TypeScript, JSON storage","competitors":["Planable","Later","Hootsuite","Agency Analytics"],"goals":["Launch pricing page","Get first 10 paying customers","Hit $15K MRR by June 2026"]}',
0, 0, datetime('now'), datetime('now'));

-- Estoqui (Stock of the Grocery)
INSERT INTO Client (id, name, status, platform, workspace, healthStatus, notes, retainer, adBudget, createdAt, updatedAt)
VALUES ('saas-estoqui', 'Estoqui', 'active', 'Web Platform', 'saas', 'yellow',
'{"type":"saas","description":"Stock of the Grocery — grocery/inventory management platform","stage":"planning","revenue":0,"targetRevenue":10000,"goals":["Define monetization model","Build MVP","Launch beta"]}',
0, 0, datetime('now'), datetime('now'));

-- 2FLY Command Center (potential SaaS)
INSERT INTO Client (id, name, status, platform, workspace, healthStatus, notes, retainer, adBudget, createdAt, updatedAt)
VALUES ('saas-commandcenter', '2FLY Command Center', 'active', 'Web SaaS', 'saas', 'yellow',
'{"type":"saas","description":"AI-powered agency operations dashboard — could be packaged for other agencies","stage":"internal","revenue":0,"targetRevenue":5000,"goals":["Package for external use","Define pricing","Create demo instance"]}',
0, 0, datetime('now'), datetime('now'));
```

Or create via seed script / API calls.

## Frontend Changes

### 1. Workspace Switcher Component

Create `client/src/components/WorkspaceSwitcher.tsx`:

```
┌────────────────────────────────────────────────────┐
│  [🏢 Agency]  [🚀 SaaS]              2FLY Command │
└────────────────────────────────────────────────────┘
```

Two pill buttons at the top of the sidebar or in the top nav bar:
- **🏢 Agency** — shows agency clients (workspace="agency" or no workspace field)
- **🚀 SaaS** — shows SaaS products (workspace="saas")

**Style:**
- Inactive: `bg-white/5 text-gray-400 border border-white/10 rounded-lg px-4 py-2`
- Active Agency: `bg-blue-500/20 text-blue-300 border-blue-500/30 rounded-lg px-4 py-2 font-medium`
- Active SaaS: `bg-purple-500/20 text-purple-300 border-purple-500/30 rounded-lg px-4 py-2 font-medium`
- Smooth transition between states

**Placement:** In the top header bar, left side, before the page title. Or at the very top of the sidebar above the client list.

### 2. Store Active Workspace in Context

Create or update a context to store the active workspace:

```typescript
// Add to existing ClientsContext or create WorkspaceContext
const [activeWorkspace, setActiveWorkspace] = useState<'agency' | 'saas'>(() => {
  if (typeof window !== 'undefined') {
    return (localStorage.getItem('2fly-workspace') as 'agency' | 'saas') || 'agency';
  }
  return 'agency';
});

// Persist to localStorage
useEffect(() => {
  localStorage.setItem('2fly-workspace', activeWorkspace);
}, [activeWorkspace]);
```

### 3. Filter Client List by Workspace

In the client list / sidebar, filter clients based on `activeWorkspace`:

```typescript
const filteredClients = clients.filter(c => {
  if (activeWorkspace === 'saas') return c.workspace === 'saas';
  return c.workspace !== 'saas'; // agency = everything that's not saas (backward compatible)
});
```

### 4. API Changes

Update `GET /api/clients` to support workspace filter:

```typescript
// GET /api/clients?workspace=agency
// GET /api/clients?workspace=saas
router.get('/', async (req, res) => {
  const { workspace } = req.query;
  const where: any = {};
  if (workspace === 'saas') {
    where.workspace = 'saas';
  } else if (workspace === 'agency') {
    where.workspace = { not: 'saas' }; // or where.workspace = 'agency'
  }
  const clients = await prisma.client.findMany({ where, orderBy: { name: 'asc' } });
  res.json(clients);
});
```

### 5. SaaS Product Cards (different from agency client cards)

In the SaaS view, client cards should show product-relevant info instead of agency metrics:

```
┌─────────────────────────────────────────────────────┐
│ 🚀 2FLY Flow                              🟡 Beta  │
│ Agency management SaaS                              │
│                                                     │
│ Revenue: $0/mo  →  Target: $15,000/mo               │
│ Stage: Beta  |  Customers: 0                        │
│ ████░░░░░░░░░░░░░░░░ 0% to goal                    │
│                                                     │
│ 3 tasks pending  |  Next: Launch pricing page       │
└─────────────────────────────────────────────────────┘
```

Parse the `notes` JSON field for SaaS-specific data:
- `notes.type === 'saas'` → use SaaS card layout
- Show: stage, revenue, targetRevenue, progress bar, goals

### 6. SaaS Overview Tab

When viewing a SaaS product, the Overview tab should show:
- **Revenue tracker** — current vs target, progress bar, trend
- **Stage** — planning / building / beta / launched / scaling
- **Goals** — list of milestones with checkboxes
- **Tasks** — pending tasks for this product
- **Growth Strategist recommendations** — if available

Use the same tab structure (Overview, Tasks, Content, Ads, Reports) but the Overview is customized for SaaS metrics.

### 7. Today Dashboard — Include SaaS

The Today Dashboard (`/dashboard`) should have a small section for SaaS products:

```
┌─────────────────────────────────────────────────────┐
│ 🚀 YOUR PLATFORMS                                   │
│                                                     │
│ 2FLY Flow — $0/mo → $15K target — 3 tasks pending  │
│ Estoqui — Planning stage — 0 tasks                  │
│ Command Center — Internal — 2 tasks pending         │
│                                                     │
│ Total platform revenue: $0/mo                       │
│ Target: $30,000/mo by June 2026                     │
│ Gap: $30,000/mo needed | 12 weeks left              │
└─────────────────────────────────────────────────────┘
```

### 8. Sidebar Visual Distinction

When in SaaS mode, the sidebar should have a subtle visual difference:
- Purple accent instead of blue
- "🚀 Products" header instead of "🏢 Clients"
- Product icons instead of client health dots

## Navigation

- URL should NOT change between workspaces (both use `/clients/[id]`)
- The workspace switcher is a global filter, not a route change
- Switching workspace changes the client list and default dashboard section
- Deep links to specific clients still work regardless of workspace

## Important Notes

- Existing clients (11 agency clients) should have `workspace: "agency"` or NULL (backward compatible)
- New SaaS products get `workspace: "saas"`
- ALL existing functionality works the same in both views — Tasks, Content, Ads, Reports
- The workspace switcher remembers selection in localStorage
- Agent tasks for SaaS products should use the SaaS product client IDs (e.g., `saas-2flyflow`)
- Research Intel tasks about agency-wide/platform opportunities → create under the relevant SaaS product, NOT under agency clients
- Mobile: workspace switcher becomes a dropdown or smaller pills

## Migration

For existing clients, add default workspace:
```sql
UPDATE Client SET workspace = 'agency' WHERE workspace IS NULL;
```
