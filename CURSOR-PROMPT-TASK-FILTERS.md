# Cursor Prompt: Redesign Task Board Filter Bar

## Problem
The current task board filters (STATUS, TYPE, SOURCE) look flat and hard to scan. They're plain text links that blend together. Bruno needs to quickly organize his brain when working on this screen — filters need to be visually distinct, grouped, and satisfying to click.

## Current State
The filters are displayed as:
```
STATUS  All  pending  in_progress  completed  TYPE  All  task  content  ads  support  SOURCE  All  manual  agent  onboarding
```
All on one line, same font weight, same style. Hard to tell which group is which.

## New Design

### Layout: Grouped Filter Chips

Each filter group should be visually separated with a clear label and **pill/chip buttons** instead of plain text.

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  STATUS                                                             │
│  [🔵 All]  [⏳ Pending]  [🔄 In Progress]  [✅ Completed]          │
│                                                                     │
│  TYPE                                                               │
│  [📋 All]  [📌 Task]  [📝 Content]  [📢 Ads]  [🛟 Support]        │
│                                                                     │
│  SOURCE                                                             │
│  [🔵 All]  [👤 Manual]  [🤖 Agent]  [📋 Onboarding]               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Chip Button Style

**Inactive chip:**
- `bg-white/5 text-gray-400 border border-white/10 rounded-lg px-3 py-1.5 text-sm`
- Hover: `bg-white/10 text-gray-200`
- Cursor: pointer

**Active chip:**
- `bg-white/15 text-white border border-white/20 rounded-lg px-3 py-1.5 text-sm font-medium shadow-sm`
- Subtle glow: `ring-1 ring-white/10`
- The "All" active chip should be a distinct accent: `bg-blue-500/20 text-blue-300 border-blue-500/30`

### Group Labels
- Labels "STATUS", "TYPE", "SOURCE" should be:
- `text-[10px] uppercase tracking-widest text-gray-600 font-semibold mb-1.5`
- Each group in its own row or separated by a vertical divider if on one line

### Two Layout Options (pick based on screen width):

**Desktop (wide):** All groups on one line, separated by vertical dividers
```
STATUS: [All] [Pending] [In Progress] [Completed]  │  TYPE: [All] [Task] [Content] [Ads] [Support]  │  SOURCE: [All] [Manual] [Agent] [Onboarding]
```

**Compact / narrow:** Stack groups vertically
```
STATUS:  [All] [Pending] [In Progress] [Completed]
TYPE:    [All] [Task] [Content] [Ads] [Support]
SOURCE:  [All] [Manual] [Agent] [Onboarding]
```

Use `flex-wrap` so it flows naturally on different screen widths.

### Emoji in Chips
Add small emoji/icons to chips to make them scannable at a glance:
- Status: ⏳ Pending, 🔄 In Progress, ✅ Completed
- Type: 📌 Task, 📝 Content, 📢 Ads, 🛟 Support
- Source: 👤 Manual, 🤖 Agent, 📋 Onboarding
- "All" chips don't need emoji, just the label

### Count Badges (bonus)
If easy to implement, show a small count badge on each chip:
```
[⏳ Pending  14]  [🔄 In Progress  1]  [✅ Completed  4]
```
Count badge: `text-[10px] bg-white/10 rounded-full px-1.5 ml-1 text-gray-500`

### Active Filter Indicator
When any filter besides "All" is active, show a small "Clear filters" link below or beside the groups:
```
Filtering: Pending + Content + Agent  [✕ Clear all]
```

### Animation
- Chips should have a subtle scale on click: `active:scale-95 transition-transform`
- Filter changes should NOT cause a page reload — keep it client-side filtering

## Implementation
Find the filter component in the tasks tab (likely in `client/src/components/client-control/tasks/` or wherever the task board filter bar is rendered). Redesign just the filter bar — do NOT change the task cards or Kanban columns below.

## Design Rules
- Match dark theme: bg-[#06060a] context
- Chips should feel tactile — like physical buttons you press
- Groups must be visually distinct from each other
- Active state must be immediately obvious (not just bold text)
- Mobile: chips wrap, groups stack
- Keep existing filter logic, just upgrade the visual presentation
