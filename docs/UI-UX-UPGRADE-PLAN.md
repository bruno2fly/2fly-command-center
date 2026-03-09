# 2Fly Command Center — UI/UX Upgrade Plan

**Document purpose:** Audit, component map, refactor strategy, and phased implementation plan.  
**Constraint:** Preserve architecture, routes, contexts, data flow, and backend. UI/UX evolution only.

---

## 1. CURRENT COMPONENT MAP

### Layout Shell (KEEP — do not restructure)
| Component | Location | Role |
|------------|----------|------|
| `PortalLayout` | `components/PortalLayout.tsx` | Root shell: ThemeProvider, FocusMode, Clients, Actions, DailyPlanner, AgentChat. Renders CommandBar + Sidebar + main + AgentChatPanel |
| `CommandBar` | `components/CommandBar/CommandBar.tsx` | Top bar: Search (⌘K), CriticalAlertChip, nav links, counters (urgent/waiting/due), Agents, theme toggle, user menu |
| `SidebarClientList` | `components/SidebarClientList.tsx` | Left rail: Dashboard, All Clients, Settings, WhatsApp Inbox, WhatsApp Chat, client list with health dots, Add Client |
| `AgentChatPanel` | `components/agent-chat/AgentChatPanel.tsx` | Slide-out agent chat panel |

### Command Bar Subcomponents
| Component | Role |
|-----------|------|
| `CommandSearchModal` | ⌘K search modal |
| `AlertsApprovalsDrawer` | Alerts + approvals drawer |
| `CriticalAlertChip` | Top-priority critical item chip (invoice/alert/approval) |

### Dashboard (`/`) — FounderDashboard
| Component | Location | Role |
|------------|----------|------|
| `FounderDashboard` | `components/FounderDashboard.tsx` | Orchestrator: fetches pulse/brief, renders dashboard widgets |
| `FireLane` | `components/dashboard/FireLane.tsx` | Top 5 priority items, Do it / View actions |
| `WaitingRadar` | `components/dashboard/WaitingRadar.tsx` | On Client / On Team / On Me columns |
| `LiveFeed` | `components/dashboard/LiveFeed.tsx` | Activity stream (hardcoded light-mode styles) |
| `TodaySequence` | `components/dashboard/TodaySequence.tsx` | Numbered task list, capacity bar, START → Focus Lock overlay |
| `MomentumWidget` | `components/dashboard/MomentumWidget.tsx` | Today / Week / Streak stats |
| `AgentStatusWidget` | `components/founder/AgentStatusWidget.tsx` | 7 agents list, gateway status (hardcoded light-mode) |

### Clients Page (`/clients`)
| Component | Location | Role |
|------------|----------|------|
| `ClientTriageTable` | `components/ClientTriageTable.tsx` | Filterable/sortable table, health indicators, Payment/Ads columns |

### Client Detail (`/clients/[id]`) — Client Control Room
| Component | Location | Role |
|------------|----------|------|
| `ClientCommandHeader` | `components/mission-control/ClientCommandHeader.tsx` | Client name, health badge, retainer, last delivery, next promise, action buttons |
| `ClientTabBar` | `components/client-control/ClientTabBar.tsx` | Tabs: Overview, Tasks & Requests, Client Plan, Ads, Content, Social Media |
| `ClientOverviewTab` | `components/client-control/tabs/ClientOverviewTab.tsx` | 3 ATC cards (Brief, Content Brief, 2FlyFlow), Tasks list, New Ideas, Activity Log, Quick Actions, Task Velocity |
| `ClientTasksRequestsTab` | `components/client-control/tabs/ClientTasksRequestsTab.tsx` | Requests pipeline + Tasks pipeline |
| `ClientPlanTab` | `components/client-control/tabs/ClientPlanTab.tsx` | Goals, KPIs, Roadmap |
| `ClientAdsTab` | `components/client-control/tabs/ClientAdsTab.tsx` | Spend, ROAS, campaigns, alerts |
| `ClientContentTab` | `components/client-control/tabs/ClientContentTab.tsx` | ContentCalendar + pipeline + ideas |
| `ClientSocialMediaTab` | `components/client-control/tabs/ClientSocialMediaTab.tsx` | Social media section |

### Payments (`/payments`)
| Component | Location | Role |
|------------|----------|------|
| Payments page | `app/payments/page.tsx` | Overdue, Due This Week, Recently Paid sections; Chase, Send reminder, Go actions |

### WhatsApp Inbox (`/whatsapp-inbox`)
| Component | Location | Role |
|------------|----------|------|
| WhatsApp Inbox page | `app/whatsapp-inbox/page.tsx` | 2-panel: filterable list (All, Needs Reply, Requests, FYI) + action panel with AI suggestion, Create Task, Reply, Dismiss, Snooze |

### Content (`/content`)
| Component | Location | Role |
|------------|----------|------|
| `ContentCalendar` | `components/ContentCalendar.tsx` | Week/month view, colored blocks by type (post/video/story/ad), status borders |
| Content page | `app/content/page.tsx` | Cross-client calendar |

### Settings (`/settings`)
| Component | Location | Role |
|------------|----------|------|
| Settings page | `app/settings/page.tsx` | Sidebar nav: General, Notifications, Integrations, Team, Clients, Data |

### Mission Control (used in various places)
| Component | Role |
|------------|------|
| `MissionStatusBadge` | Health variant badge |
| `ActionCenter` | Action queue (used in ClientOperationsTab — not in current tab set) |
| `UnifiedPipeline` | Pipeline view |
| `StatusWall` | Health, Performance, Memory (used in ClientOperationsTab) |

### Unused / Legacy (present but not in main flow)
- `ClientOperationsTab`, `ClientStrategyTab` — replaced by individual tabs
- `ClientInbox`, `ClientInboxDrawer` — used when Operations tab existed
- `TopBar`, `ClientCard`, `ClientSnapshot`, `ClientHeaderCard`, `ClientLanesTable` — older patterns
- `dashboard-focus/*`, `daily-planner/*`, `founder/*` (except AgentStatusWidget) — alternate views

---

## 2. WHAT PARTS SHOULD STAY

### Architecture (unchanged)
- All routes and page structure
- `PortalLayout`, `CommandBar`, `SidebarClientList`, `AgentChatPanel` structure
- Context providers (Theme, Clients, Actions, FocusMode, DailyPlanner, AgentChat)
- Data flow: `mockClientControlData`, `mockClientTabData`, `founderData`, `api.ts`
- `buildClientLanes`, `getClientUrgencySignal`, `mergeClientControlItems`

### Components to keep (logic + structure, refine styling only)
- `CommandBar` — nav, counters, search, agents — keep structure
- `SidebarClientList` — client list, links — keep structure
- `CriticalAlertChip` — keep logic, refine visual
- `ClientTabBar` — keep tabs and URL behavior
- `ClientCommandHeader` — keep props and actions
- `ClientTriageTable` — keep filter, search, sort logic
- `ContentCalendar` — keep week/week logic and data structure
- `FounderDashboard` — keep composition and data fetching

### Components that work well (minor polish)
- `FireLane` — solid structure, needs hierarchy and severity refinement
- `TodaySequence` — good concept, needs clarity
- `MomentumWidget` — simple, effective
- `ClientTasksRequestsTab` — pipeline structure is good

---

## 3. WHAT PARTS SHOULD BE REFACTORED

### High priority (biggest UX impact)

| Component | Issue | Refactor direction |
|-----------|-------|--------------------|
| `LiveFeed` | Hardcoded light-mode (`border-gray-200`, `bg-white`), ignores `isDark` | Add theme support; improve event row hierarchy and severity |
| `AgentStatusWidget` | Hardcoded light-mode, feels disconnected from cockpit | Theme support; integrate with command-center aesthetic |
| `ClientOverviewTab` | Dense, side-by-side cards can feel cramped; task list lacks severity hierarchy | Sharper hierarchy; severity tiers (critical/important/routine); better spacing |
| `ClientCommandHeader` | Stats (last delivery, next promise) compete with actions | Clearer stat grouping; stronger primary action (Create Task) |
| `ClientTriageTable` | Emoji-heavy (🔴🟡🟢); row hierarchy flat | Replace emoji with `HealthDot`/`SeverityBadge`; row severity styling |
| `Payments` page | Overdue/Due/Paid sections similar weight | Overdue as dominant; amount and risk more prominent |

### Medium priority

| Component | Issue | Refactor direction |
|-----------|-------|--------------------|
| `WaitingRadar` | Columns equal weight; "On Me" should stand out | "On Me" as primary; age/days more visible |
| `FireLane` | Cards similar; emoji for risk | Severity-based card styling; replace emoji with dots/badges |
| `TodaySequence` | Capacity bar subtle; START button competes | Capacity bar more prominent; START as clear CTA |
| `WhatsApp Inbox` | Filter pills and list rows uniform | Urgency hierarchy; AI classification more scannable |
| `ContentCalendar` | Week view functional but plain | Stronger type/status coding; better scan speed |

### Lower priority (polish)

| Component | Issue | Refactor direction |
|-----------|-------|--------------------|
| `MomentumWidget` | Works but could feel more premium | Refined typography and spacing |
| `ClientPlanTab`, `ClientAdsTab`, `ClientContentTab`, `ClientSocialMediaTab` | Adequate | Consistency pass; hierarchy and spacing |
| `Settings` | Functional | Spacing, hierarchy, consistency |

---

## 4. PHASED UI/UX UPGRADE PLAN BY PAGE

### Phase 1 — Dashboard (Week 1)
**Goal:** Make `/` feel like the daily command deck.

1. **Fire Lane**
   - Introduce `SeverityBadge` (critical/important/routine) instead of emoji
   - Add `ActionQueueCard` for consistent card styling
   - Stronger primary action (Do it) vs secondary (View)
   - Critical items with subtle red tint; important with amber

2. **Waiting Radar**
   - "On Me" column emphasized (larger, different border)
   - Age/days more visible
   - Theme support for all columns

3. **Live Feed**
   - Full theme support
   - `ActivityEventRow` with type icon, severity, timestamp
   - Link to client more prominent

4. **Today Sequence**
   - Capacity bar more visible (height, color)
   - START button as primary CTA
   - Task rows with clearer numbering and severity

5. **Momentum + Agent Status**
   - `MomentumWidget`: theme support, refined typography
   - `AgentStatusWidget`: theme support, cockpit styling, "Ask Founder Boss" as clear action

**Deliverables:** Refined `FounderDashboard` and all dashboard widgets; no new routes or data changes.

---

### Phase 2 — Client Detail Overview Tab (Week 2)
**Goal:** Best-in-class mission-control UX for client overview.

1. **Client Command Header**
   - `ClientHeaderStat` for retainer, last delivery, next promise
   - Create Task as dominant primary button
   - Secondary actions grouped and de-emphasized

2. **Overview Tab — Brief Section**
   - `BriefPanel` or `CommandSection` wrapper
   - Clear hierarchy: summary line → bullet list
   - Priority dots (red/amber/green) instead of emoji

3. **Overview Tab — Tasks**
   - `PriorityTaskRow` with severity levels
   - Critical: red tint, bold
   - Important: amber tint
   - Routine: muted
   - "Do it" only on actionable rows

4. **Overview Tab — Side Panels**
   - `QuickActionCluster` for WhatsApp, Drive, Ad Platform
   - `ActivityEventRow` for Activity Log
   - New Ideas as compact cards with tags

5. **Overview Tab — Layout**
   - Brief/Content/2FlyFlow cards: consistent `ATCSectionCard` styling
   - Task Velocity bar: clearer label and progress

**Deliverables:** Refined `ClientOverviewTab`, `ClientCommandHeader`; reusable `CommandSection`, `SeverityBadge`, `PriorityTaskRow`.

---

### Phase 3 — Clients Table (Week 3)
**Goal:** Instant scan of which clients need attention.

1. **ClientTriageTable**
   - `HealthDot` component (no emoji)
   - Row background by health (red/yellow/green tint)
   - At-risk rows more prominent
   - Inline actions: View, Quick actions

2. **Filter Pills**
   - Counts per filter
   - Active state clearer

3. **Search**
   - Refined styling
   - Clear empty state

**Deliverables:** Refined `ClientTriageTable`; `HealthDot`, `StatusStrip` (if useful).

---

### Phase 4 — Payments (Week 4)
**Goal:** Money control, not invoice clutter.

1. **Summary Strip**
   - Total Outstanding, Overdue, Due Soon
   - Overdue amount emphasized (size, color)

2. **Overdue Section**
   - `PaymentRiskChip` for days overdue
   - Amount prominent
   - Chase as primary, Go as secondary

3. **Due This Week**
   - Clear due date
   - Send reminder as primary action

4. **Recently Paid**
   - Muted, compact
   - No competing visual weight

**Deliverables:** Refined payments page; `PaymentRiskChip` if reusable.

---

### Phase 5 — WhatsApp Inbox (Week 5)
**Goal:** Intelligent communications ops center.

1. **Filter Pills**
   - Needs Reply emphasized when active
   - Counts per filter

2. **Message List**
   - Urgency hierarchy (red/amber/gray)
   - AI classification badge (type + confidence)
   - Client name and time clearer

3. **Action Panel**
   - AI suggestion as `AgentSuggestionCard`
   - Actions: Create Task, Reply, Dismiss, Snooze — clear hierarchy

**Deliverables:** Refined WhatsApp Inbox page; `AgentSuggestionCard` if reusable.

---

### Phase 6 — Content Page (Week 6)
**Goal:** One-glance content operations control.

1. **ContentCalendar**
   - Type colors (post/video/story/ad) more distinct
   - Status (draft/scheduled/review/published) clearer
   - Week navigation more obvious

2. **Cross-Client View**
   - Client indicator on each item
   - Optional client filter

**Deliverables:** Refined `ContentCalendar` and content page.

---

### Phase 7 — Settings + Consistency Pass (Week 7)
**Goal:** Polish and consistency.

1. **Settings**
   - Section spacing
   - Consistent form styling
   - Delete client flow unchanged

2. **Global Consistency**
   - `SectionLabel` for all section headers
   - Card border and radius
   - Button hierarchy (primary/secondary/ghost)
   - Replace remaining emoji with `HealthDot`/`SeverityBadge` where appropriate

**Deliverables:** Settings polish; shared `SectionLabel`, `CommandSection` usage across app.

---

## 5. HIGHEST-IMPACT CHANGES WITH LOWEST RISK

### Tier 1 — Quick wins (1–2 hours each)
| Change | Impact | Risk |
|--------|--------|------|
| Add theme support to `LiveFeed` | High — fixes broken dark mode | Very low |
| Add theme support to `AgentStatusWidget` | High — fixes broken dark mode | Very low |
| Replace emoji with `HealthDot` in `ClientTriageTable` | Medium — cleaner look | Low |
| Replace emoji in `FireLane` with `SeverityBadge` | Medium — more professional | Low |
| Payments: emphasize Overdue amount and Chase action | High — money at risk clearer | Low |

### Tier 2 — Medium effort (2–4 hours each)
| Change | Impact | Risk |
|--------|--------|------|
| `ClientOverviewTab`: task severity tiers (critical/important/routine) | High — clearer "what to do next" | Low |
| `ClientCommandHeader`: stat grouping, Create Task prominence | Medium — better hierarchy | Low |
| `WaitingRadar`: emphasize "On Me" column | Medium — blocks more visible | Low |
| Dashboard: Fire Lane card hierarchy | High — top fires stand out | Low |
| WhatsApp: urgency hierarchy in list | Medium — triage faster | Low |

### Tier 3 — Larger refactors (4–8 hours each)
| Change | Impact | Risk |
|--------|--------|------|
| Create reusable `CommandSection`, `SeverityBadge`, `HealthDot` | High — design system | Low |
| `ClientOverviewTab`: merge/reorganize brief cards | High — less redundancy | Medium |
| Content Calendar: stronger type/status coding | Medium — scan speed | Low |

---

## 6. REUSABLE COMPONENTS TO CREATE

| Component | Purpose |
|------------|---------|
| `SectionLabel` | Consistent `text-[10px] uppercase tracking-widest font-semibold text-zinc-500` |
| `HealthDot` | 6–8px dot: green/amber/red, no emoji |
| `SeverityBadge` | Pill: critical (red), important (amber), routine (muted) |
| `CommandSection` | Card wrapper with optional ATC accent, consistent padding |
| `PriorityTaskRow` | Task row with severity styling, optional "Do it" |
| `ActionQueueCard` | Fire Lane / priority card with consistent structure |
| `QuickActionCluster` | Group of quick action buttons/links |
| `PaymentRiskChip` | Days overdue, amount at risk |
| `AgentSuggestionCard` | AI suggestion in WhatsApp panel |
| `ActivityEventRow` | Activity log row with icon, text, time |

---

## 7. IMPLEMENTATION ORDER (RECOMMENDED)

1. **Create design tokens / shared components** — `SectionLabel`, `HealthDot`, `SeverityBadge`
2. **Fix theme bugs** — `LiveFeed`, `AgentStatusWidget`
3. **Dashboard refinement** — Fire Lane, Waiting Radar, Today Sequence
4. **Client Overview** — Header, task severity, side panels
5. **Clients table** — HealthDot, row hierarchy
6. **Payments** — Urgency and amount emphasis
7. **WhatsApp** — Urgency hierarchy, action panel
8. **Content** — Type/status clarity
9. **Settings** — Polish
10. **Consistency pass** — Replace remaining emoji, unify spacing

---

## 8. THINGS TO AVOID

- Changing routes or page structure
- Modifying context providers or data flow
- New API contracts or backend changes
- Removing or renaming existing tabs
- Turning the product into a generic CRM
- Overdesigned neon/sci-fi aesthetics
- Clutter or fake HUD overlays
- Breaking the mission-control / cockpit identity

---

*End of UI/UX Upgrade Plan. Proceed with Phase 1 when ready.*
