# PASTE THIS INTO CURSOR CHAT:

## Wire Tasks & Requests tab to real API data + design upgrade

The Tasks & Requests tab currently shows mock data. Wire it to the real Express API and upgrade the design to match the Ads tab quality.

### API Endpoints:

```
GET /api/agent-tools/requests?clientId=:id
→ Returns: { requests: [{ id, clientId, title, description, type, priority, status, source, dueDate, slaBreach, createdAt, updatedAt }] }

Status values: new, acknowledged, in_progress, waiting_client, review, completed, closed
Priority values: low, normal, high, urgent
Type values: revision, bug, feature, content, general
Source values: whatsapp, 2flyflow, email, internal
```

### What to wire:

#### REQUESTS sub-tab (Kanban board):
- Fetch from `/api/agent-tools/requests?clientId=${clientId}`
- Map statuses to kanban columns:
  - **New** = status `new`
  - **Acknowledged** = status `acknowledged` 
  - **In Progress** = status `in_progress`
  - **Waiting Client** = status `waiting_client`
  - **In Review** = status `review`
  - **Done** = status `completed` or `closed`
- Each card shows:
  - Title (bold)
  - Source badge (WhatsApp green, 2FlyFlow blue, Email gray, Internal purple)
  - Due date (red if overdue, yellow if due today, gray otherwise)
  - Priority indicator (🔴 urgent, 🟡 high, ⚪ normal)
  - SLA breach badge (red "SLA" pill if `slaBreach: true`)
  - Type badge (subtle, lowercase)
  - Time since created ("2h ago", "3d ago")

#### TASKS sub-tab:
- Keep using existing task data for now (tasks come from a different source)
- No changes needed here

### Design upgrade (match Ads tab quality):

#### Kanban columns:
```css
/* Column */
background: dark ? rgba(30,41,59,0.3) : rgba(248,250,252,1)
border-radius: 16px
padding: 16px
min-height: 400px
border: 1px solid dark ? rgba(51,65,85,0.3) : rgba(226,232,240,0.8)

/* Column header */
uppercase tracking-wider text-xs font-semibold
with count badge: bg-blue-500/10 text-blue-400 rounded-full px-2 py-0.5 text-xs ml-2

/* Cards */
background: dark ? rgba(30,41,59,0.8) : white
border: 1px solid dark ? rgba(51,65,85,0.5) : rgba(226,232,240,1)
border-radius: 12px
padding: 14px
hover:shadow-md hover:border-blue-500/20
transition: all 0.2s ease
cursor: pointer
```

#### Priority left border on cards:
```css
urgent → border-left: 3px solid #ef4444 (red)
high → border-left: 3px solid #f59e0b (amber)
normal → border-left: 3px solid #6b7280 (gray)
low → border-left: 3px solid #d1d5db (light gray)
```

#### Source badges:
```css
WhatsApp → bg-emerald-500/10 text-emerald-400 text-[10px] uppercase tracking-wider
2FlyFlow → bg-blue-500/10 text-blue-400
Email → bg-gray-500/10 text-gray-400
Internal → bg-purple-500/10 text-purple-400
```

#### Animations (framer-motion):
- Cards: stagger entrance from bottom (`initial={{ opacity: 0, y: 10 }}`)
- Column counts: animate on data change
- Cards entering a column: `AnimatePresence` with layout animation

#### Empty column state:
- Subtle dashed border, muted text: "No items"
- Don't hide empty columns — show all 6 always

#### Summary bar above kanban:
Add a compact stats row:
```
📋 Total: 5  |  🔴 Urgent: 1  |  ⏰ Overdue: 2  |  ⚠️ SLA Breach: 1  |  ✅ Done this week: 3
```
Style: same as Ads KPI bar — horizontal row of metric cards, but compact (single line).

### Pattern:
```tsx
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const [requests, setRequests] = useState<ApiRequestItem[]>([]);

useEffect(() => {
  fetch(`${API}/api/agent-tools/requests?clientId=${clientId}`)
    .then(r => r.json())
    .then(d => setRequests(d.requests || []))
    .catch(() => {}); // keep existing mock data as fallback
}, [clientId]);
```

### Rules:
- Keep mock data as fallback if API fails
- Support dark mode with `useTheme()` / `isDark`
- Don't change other tabs
- Don't change the tab bar or Requests/Tasks sub-tab toggle
- The Requests sub-tab should feel like a premium Kanban board (think Linear, Notion)
- Each card should be clickable (onClick can be empty/console.log for now)
