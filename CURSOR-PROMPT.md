# PASTE THIS INTO CURSOR CHAT:

Wire Client Overview tab to real API data.

The client Overview tab (visible when you click a client → Overview) currently uses mock data from `mockClientControlData.ts` and `mockClientTabData.ts`. Wire it to the real Express API at `http://localhost:4000/api/agent-tools/`.

## API endpoints available:

- `GET /api/agent-tools/clients/:id` → full client detail (name, retainer, contacts, notes, industry, etc.)
- `GET /api/agent-tools/requests?clientId=:id` → client requests (title, status, priority, type, dueDate, slaBreach, createdAt)
- `GET /api/agent-tools/content?clientId=:id` → content items (title, status, scheduledDate, type, platform)
- `GET /api/agent-tools/health` → all clients health (overall, contentBuffer, requests, ads modules)
- `GET /api/agent-tools/revenue` → MRR, invoices, overdue amounts

## What to wire:

### 1. KPI Bar (MQLs, ROAS, Website, Payment, Content %):
- Payment status: fetch from `/revenue` — check if client has overdue invoices
- Content %: calculate from `/content?clientId=X` — (delivered + scheduled) / total
- ROAS: keep from mock data for now (will come from Meta API later)
- MQLs: keep from mock data for now
- Website: keep from mock data for now (will come from uptime check later)

### 2. Critical Blockers:
- Fetch from `/requests?clientId=X` — show requests where `status` is `new` or `acknowledged` AND (`priority` is `urgent` or `high`, OR `slaBreach` is true, OR `dueDate` is past)
- Also check `/revenue` for overdue invoices → show as "Invoice overdue" blocker

### 3. Workbench (active tasks):
- Fetch from `/requests?clientId=X` — show requests where `status` is `in_progress` or `acknowledged`
- Display: title, type badge, due date, status, Remind/Edit/Chat actions

### 4. Pipeline (Requests → In Progress → Waiting Client → Review/Approval → Delivered):
- Fetch from `/requests?clientId=X` — count by status:
  - Requests = status `new`
  - In Progress = status `in_progress` or `acknowledged`
  - Waiting Client = status `waiting_client`
  - Review/Approval = status `review`
  - Delivered = status `completed`

### 5. Activity Log (right sidebar):
- Fetch from `/requests?clientId=X` — show recent requests sorted by `updatedAt` desc, limit 5
- Show as "[action] - [title]" with relative timestamp

## Pattern to follow:

```tsx
const [data, setData] = useState<Type | null>(null);
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

useEffect(() => {
  fetch(`${API}/api/agent-tools/requests?clientId=${clientId}`)
    .then(r => r.json())
    .then(d => setData(d))
    .catch(() => {}); // fall back to mock data on error
}, [clientId]);
```

## Rules:
- Keep mock data as fallback — if API fetch fails, show mock data (don't break the UI)
- Use `NEXT_PUBLIC_API_URL` env var (already set to `http://localhost:4000` in `.env.local`)
- Don't change the visual design — only change WHERE data comes from
- Support dark mode (already implemented, don't break it)
- Don't change any other tabs (Ads, Content, Social Media, etc.)
- When changing Prisma schema, use `npx prisma db push` NOT `--force-reset`. If reset is needed, run `bash prisma/seed-all.sh` after.
