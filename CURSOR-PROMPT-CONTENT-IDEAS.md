# Cursor Prompt: AI Content Ideas — Approval Flow

## Overview
**REPLACE** the current "Production Pipeline" grid in the Content tab with an **AI Content Ideas** approval flow. No more Kanban/pipeline columns. Instead: a list of AI-generated content idea cards that Bruno can Approve, Edit, or Reject. Approved ideas move to an "Approved & Ready" section where they can be sent to the team.

## Remove
- Remove the Production Pipeline grid/table (the Kanban-style view with Ideation → Creation → Review → Approved → Scheduled columns)
- Keep any existing content stats bar if it exists

## New Layout

The Content tab should now have TWO sections:

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 AI CONTENT IDEAS                                         │
│ [ALL] [FEED] [REELS] [STORIES] [CAROUSEL]                  │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📸 Feed Post                    [✅ Approve] [✏️ Edit] [❌ Reject] │
│ │ "Easter Brunch Announcement"                             │
│ │                                                          │
│ │ 📝 CAPTION                      📐 FORMAT                │
│ │ Your Easter table is set —      Carousel (3 slides)      │
│ │ but not at home.                                         │
│ │                                                          │
│ │ 🎣 HOOK                         🏷️ HASHTAGS              │
│ │ Your Easter table is set —      #easter #brunch #boston   │
│ │ but not at home.                                         │
│ │                                                          │
│ │ ⏰ BEST TIME                    💡 WHY THIS WORKS        │
│ │ Thu/Sat 11am-1pm               Seasonal hooks feel       │
│ │                                 timely and relevant.      │
│ │                                                          │
│ │ 🤖 AI Generated · 2h ago                       Score 9/10│
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎬 Reel                         [✅ Approve] [✏️ Edit] [❌ Reject] │
│ │ "Behind the Scenes — how we do it"                       │
│ │ ...                                                      │
│ │ 🤖 AI Generated · 2d ago                                 │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✅ APPROVED & READY TO SEND                        3 items  │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📸 Feed Post — "Easter Brunch Announcement"              │
│ │ Approved Mar 13                [📤 Send to Team] [📅 Schedule] │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Content Idea Card — Detailed Spec

Each card displays a content item that has status `draft` or `proposed` (not yet approved).

### Card Fields (parsed from content item data):

Map these from the content item's `notes` field (JSON or structured text) and main fields:

- **Content Type Badge**: Top-left. Derived from `type` field:
  - `social_post` → "📸 Feed Post"
  - `reel_script` → "🎬 Reel"
  - `story` → "📱 Story"
  - `carousel` → "🎠 Carousel"
  - `video_script` → "🎥 Video"
  
- **Title**: Bold, prominent. From `title` field.

- **Caption**: From notes field, look for text after "Hook:" or first line of notes. Or add a `caption` field.

- **Hook**: The attention-grabbing first line. Parse from notes (look for "Hook:" prefix).

- **Format**: e.g., "Carousel (3 slides)", "15s Reel", "Static 1080x1080". Parse from notes (look for "Format:").

- **Best Time**: Suggested posting time. Parse from notes or default to "—".

- **Hashtags**: Relevant hashtags. Parse from notes or generate placeholder.

- **Why This Works**: Brief strategic reasoning. Parse from notes (look for "Goal:" or "Why:").

- **Score Badge**: Bottom-right. Parse "Score: X/10" from notes. Color-coded:
  - 9-10: green
  - 7-8: amber
  - 5-6: orange
  - <5: red

- **Source Badge**: Bottom-left. "🤖 AI Generated · Xh ago" or "👤 Manual · Xh ago" based on content source.

### Card Actions (top-right buttons):

1. **✅ Approve** (green button)
   - `PATCH /api/content/:id` with `{ status: "approved" }`
   - Card animates out of Ideas section, appears in Approved section
   - Toast: "Content approved ✅"

2. **✏️ Edit** (neutral button)
   - Opens an edit modal (use existing `EditContentModal` if available, or create inline edit)
   - Should allow editing: title, caption, hook, format, hashtags, notes
   - Save → `PATCH /api/content/:id`

3. **❌ Reject** (red text button, not filled — less prominent)
   - Confirmation: "Reject this content idea?"
   - `PATCH /api/content/:id` with `{ status: "rejected" }`
   - Card fades out
   - Toast: "Content rejected"

### Filter Tabs:
Top of the section: `[ALL] [FEED] [REELS] [STORIES] [CAROUSEL]`
- ALL: show all content ideas
- FEED: filter where `type` = `social_post`
- REELS: filter where `type` = `reel_script`
- STORIES: filter where `type` = `story`
- CAROUSEL: filter where `type` = `carousel`

Active tab: underline + bold. Inactive: muted text.

## Approved & Ready Section

Below the AI Content Ideas section, separated by a divider.

Shows content items with `status: "approved"`.

Each approved item is a **compact card** (not full detail):
- Content type emoji + title
- "Approved [date]" badge
- Two action buttons:
  1. **📤 Send to Team** — Creates a task in the Tasks tab for the design team with the visual brief from the content item's notes. `POST /api/clients/:clientId/tasks` with title "🎨 Design: [content title]", description pulled from visual direction in notes, source "agent".
  2. **📅 Schedule** — Opens a date picker to set `scheduledDate`. Updates content status to "scheduled". `PATCH /api/content/:id` with `{ status: "scheduled", scheduledDate: "..." }`

When "Send to Team" is clicked:
- Button changes to "✅ Sent" (disabled, green check)
- Toast: "Design task created for [title]"

## API Endpoints (all exist):
- `GET /api/content?clientId=:id` — list content items
- `PATCH /api/content/:id` — update status, fields
- `POST /api/clients/:clientId/tasks` — create design task
- Content items already have: id, title, type, platform, status, notes, clientId, createdAt

## Data Parsing

The `notes` field on content items contains structured info. Parse it to extract card fields:

```typescript
function parseContentNotes(notes: string): {
  hook?: string;
  format?: string;
  caption?: string;
  bestTime?: string;
  hashtags?: string;
  whyThisWorks?: string;
  score?: number;
  visualBrief?: string;
} {
  // Notes format example:
  // "Hook: Your Easter table is set — but not at home. | Format: Carousel — 3 slides: ... | Goal: Drive reservations | CTA: Reserve your table | Visual: Warm golden lighting... Score: 9/10"
  
  const result: any = {};
  
  // Extract Hook
  const hookMatch = notes.match(/Hook:\s*([^|]+)/i);
  if (hookMatch) result.hook = hookMatch[1].trim();
  
  // Extract Format
  const formatMatch = notes.match(/Format:\s*([^|]+)/i);
  if (formatMatch) result.format = formatMatch[1].trim();
  
  // Extract Goal / Why this works
  const goalMatch = notes.match(/Goal:\s*([^|]+)/i);
  if (goalMatch) result.whyThisWorks = goalMatch[1].trim();
  
  // Extract CTA as caption
  const ctaMatch = notes.match(/CTA:\s*([^|]+)/i);
  if (ctaMatch) result.caption = ctaMatch[1].trim();
  
  // Extract Visual brief
  const visualMatch = notes.match(/Visual:\s*(.+?)(?:Score:|$)/i);
  if (visualMatch) result.visualBrief = visualMatch[1].trim();
  
  // Extract Score
  const scoreMatch = notes.match(/Score:\s*(\d+)\/10/i);
  if (scoreMatch) result.score = parseInt(scoreMatch[1]);
  
  return result;
}
```

## Empty States

**No ideas yet:**
```
🤖 No content ideas yet
Ask the Content Agent to generate ideas for this client.
[🧠 Generate Ideas]
```

Button opens FloatingChatWidget pre-selected to content-system agent.

**No approved items:**
```
✅ No approved content yet
Approve ideas above to move them here.
```

## Design

- Dark theme matching existing app (bg-[#06060a] or bg-[#0a0a0f])
- Cards: rounded-xl, border border-white/5, hover:border-white/10
- Approve button: bg-emerald-600 hover:bg-emerald-500, white text
- Edit button: bg-white/10 hover:bg-white/15, white text
- Reject button: text-red-400 hover:text-red-300, no background (text-only)
- Score badge: small pill, colored background matching score range
- Source badge: muted text, small font
- Filter tabs: text-sm, active has border-b-2 border-white
- Approved section: slightly different background (bg-white/[0.02]) to differentiate
- Smooth animations on approve/reject (fade out, slide in)
- Cards should have subtle left border color based on content type:
  - Feed: blue
  - Reel: purple
  - Story: pink
  - Carousel: amber

## Component Structure

```
client/src/components/client-control/content/
├── ContentIdeasView.tsx          (main component — replaces pipeline)
├── ContentIdeaCard.tsx           (individual idea card)
├── ContentIdeaFilters.tsx        (ALL/FEED/REELS/STORIES/CAROUSEL tabs)
├── ApprovedContentSection.tsx    (approved & ready section)
├── ApprovedContentCard.tsx       (compact approved card)
├── ContentStatsBar.tsx           (keep existing)
├── CreateContentModal.tsx        (keep existing)
├── EditContentModal.tsx          (keep existing — used by Edit button)
└── parseContentNotes.ts          (utility to parse notes field)
```

## Important
- REMOVE the Production Pipeline / Kanban grid entirely
- Content items with status `draft` or `proposed` → show in AI Content Ideas
- Content items with status `approved` → show in Approved & Ready
- Content items with status `scheduled` or `published` → hide from both (or show in a small "Scheduled" count)
- Content items with status `rejected` → hide (or show count with toggle)
- The Edit button should use the existing EditContentModal if it exists
- Mobile: cards go full width, buttons stack vertically on small screens
