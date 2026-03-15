# Cursor Prompt: Content Strategy Tab

## Overview
Add a **Strategy** sub-section to the client Content tab that displays AI-generated content strategy data (brand profiles, audience psychology, content pillars, hook libraries, competitor insights, and content scoring).

## Database Changes

### New Prisma Model
Add to `server/prisma/schema.prisma`:

```prisma
model ContentStrategy {
  id        String   @id @default(cuid())
  clientId  String
  client    Client   @relation(fields: [clientId], references: [id], onDelete: Cascade)
  type      String   // brand_profile, audience_map, competitor_analysis, review_mining, trend_intel, content_pillars, hook_library, content_scores, local_intel, visual_direction
  title     String
  data      String   // JSON stringified strategy data
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([clientId, type])
}
```

Add relation to Client model:
```prisma
contentStrategies ContentStrategy[]
```

Run `npx prisma db push` after.

## API Routes

### New file: `server/src/routes/content-strategy.ts`

```typescript
// GET /api/clients/:clientId/strategy — list all strategy docs for a client
// GET /api/clients/:clientId/strategy/:type — get latest strategy doc of a type
// POST /api/clients/:clientId/strategy — create/update strategy doc
// DELETE /api/clients/:clientId/strategy/:id — delete a strategy doc
```

**POST body:**
```json
{
  "type": "brand_profile",
  "title": "Brand Intelligence Profile",
  "data": { ...structured JSON data... }
}
```

If a strategy doc of the same `type` already exists for the client, increment `version` and create a new record (keep history).

Register routes in `server/src/index.ts`:
```typescript
import contentStrategyRoutes from './routes/content-strategy';
app.use('/api/clients', contentStrategyRoutes);
```

## Frontend Components

### 1. Strategy Toggle in Content Tab

Update the Content tab (`ClientContentTab.tsx` or wherever the content tab lives) to add a view toggle:

```
[📊 Pipeline] [📅 Calendar] [🧠 Strategy]
```

Use a simple tab bar at the top. When "Strategy" is selected, show the `ContentStrategyView` component.

### 2. New Component: `client/src/components/client-control/content/ContentStrategyView.tsx`

Props: `{ clientId: string; clientName?: string }`

On mount, fetch: `GET /api/clients/${clientId}/strategy`

Display strategy documents as **expandable cards** in this order:

#### Card Layout:
```
┌──────────────────────────────────────────────────────────────┐
│ 🔍 Brand Intelligence Profile                    v2 · Mar 13│
│ ─────────────────────────────────────────────────────────────│
│ Brand: Cafe St. Petersburg                                   │
│ UVP: Authentic Eastern European cuisine — rare in Boston     │
│ Voice: Friendly, warm, culturally rich                       │
│ Audience: International food enthusiasts, families, event... │
│                                                              │
│ [▼ Expand Full Profile]                                      │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ 🧠 Audience Psychology                           v1 · Mar 13│
│ ─────────────────────────────────────────────────────────────│
│ Primary Desires: Authentic cultural dining experiences       │
│ Fears: Generic, overpriced restaurants                       │
│ Triggers: Nostalgia, community belonging, discovery          │
│                                                              │
│ [▼ Expand Full Analysis]                                     │
└──────────────────────────────────────────────────────────────┘
```

#### Card Types (in display order):
1. 🔍 **Brand Intelligence Profile** (`brand_profile`)
   - Summary view: Brand name, UVP, voice, target audience (1-liners)
   - Expanded: Full profile with all fields

2. 🧠 **Audience Psychology** (`audience_map`)
   - Summary: Top 3 desires, fears, triggers
   - Expanded: Full psychology breakdown

3. 📊 **Competitor & Market Analysis** (`competitor_analysis`)
   - Summary: # competitors analyzed, top opportunity
   - Expanded: Full competitor breakdown, gaps, differentiation

4. ⭐ **Review Mining Insights** (`review_mining`)
   - Summary: Top compliment, top complaint, # reviews analyzed
   - Expanded: All insights with customer quotes

5. 🔥 **Trend Intelligence** (`trend_intel`)
   - Summary: Top 3 trending formats/topics
   - Expanded: Full trend analysis with platform breakdown

6. 📐 **Content Pillars** (`content_pillars`)
   - Summary: 5 pillar names with emoji
   - Expanded: Purpose, audience reaction, example topics per pillar

7. 🎣 **Hook Library** (`hook_library`)
   - Summary: "15 hooks generated" + 3 previews
   - Expanded: All hooks grouped by category, with copy-to-clipboard button on each
   - Copy button: small clipboard icon, shows "Copied!" toast on click

8. 📍 **Local Intelligence** (`local_intel`)
   - Summary: # upcoming events, seasonal opportunities
   - Expanded: Full local insights

9. 🎨 **Visual Direction** (`visual_direction`)
   - Summary: Primary mood/style keywords
   - Expanded: Full visual guidelines

### 3. Hook Library Special Treatment

The Hook Library card deserves special UI:

```
┌──────────────────────────────────────────────────────────────┐
│ 🎣 Hook Library                          15 hooks · v1      │
│ ─────────────────────────────────────────────────────────────│
│                                                              │
│ CURIOSITY                                                    │
│ ┌──────────────────────────────────────────────────── [📋] ┐ │
│ │ "Most restaurants buy frozen. We make everything..."     │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────── [📋] ┐ │
│ │ "Your Easter table is set — but not at home."           │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ CONTRARIAN                                                   │
│ ┌──────────────────────────────────────────────────── [📋] ┐ │
│ │ "Stop scrolling food pics. Come taste it for real."     │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ STORY-DRIVEN                                                 │
│ ┌──────────────────────────────────────────────────── [📋] ┐ │
│ │ "She booked her birthday here on a whim. Now she..."    │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

Each hook has a copy button. Grouped by category with headers.

### 4. Content Scoring on Content Items

Add a visual score badge to content items in the Pipeline view:

If a content item has scoring data in its notes (look for "Score: X/10"), display a small colored badge:
- 9-10: 🟢 green badge "9/10"
- 7-8: 🟡 amber badge "8/10"  
- 5-6: 🟠 orange badge "6/10"
- Below 5: 🔴 red badge

### 5. Empty State

When no strategy data exists for a client:

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│              🧠 No Strategy Generated Yet                    │
│                                                              │
│   Ask the Content Agent to run a full strategy analysis:     │
│   "full strategy [client name]"                              │
│                                                              │
│   The agent will research the brand, analyze competitors,    │
│   map audience psychology, and generate a complete           │
│   content strategy with hooks and visual direction.          │
│                                                              │
│              [🤖 Ask Content Agent]                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

The "Ask Content Agent" button opens the FloatingChatWidget pre-selected to the content-system agent with the message pre-filled: "full strategy [clientName]"

## Design Guidelines

- Match existing dark theme aesthetic (bg-[#06060a], border-white/5, etc.)
- Cards: rounded-xl, subtle border, hover glow effect
- Collapsed cards show 2-3 key fields as a scannable summary
- Expand/collapse with smooth animation (max-height transition)
- Version badge: small pill showing "v2 · Mar 13" in muted text
- Use existing color palette from the app
- Mobile responsive: cards stack full-width

## Data Structure Examples

### brand_profile data JSON:
```json
{
  "brandName": "Cafe St. Petersburg",
  "summary": "Authentic Eastern European restaurant...",
  "productsServices": ["Dine-in", "Private Events", "Catering", "Themed Nights"],
  "uvp": "Authentic Eastern European cuisine — rare in the Boston area",
  "tone": "Friendly, warm, culturally rich",
  "targetAudience": "International food enthusiasts, families, event planners",
  "painPoints": ["Finding authentic cuisine", "Boring restaurant experiences"],
  "desires": ["Cultural discovery", "Memorable dining", "Community belonging"],
  "positioning": "Premium casual dining with cultural entertainment"
}
```

### hook_library data JSON:
```json
{
  "hooks": [
    { "category": "curiosity", "text": "Most restaurants buy frozen. We make everything from scratch." },
    { "category": "story", "text": "She booked her birthday here on a whim. Now she books every year." },
    { "category": "contrarian", "text": "Stop scrolling food pics. Come taste it for real." }
  ]
}
```

### content_pillars data JSON:
```json
{
  "pillars": [
    {
      "name": "Authority",
      "emoji": "👨‍🍳",
      "purpose": "Establish expertise in Eastern European cuisine",
      "reaction": "They really know their food",
      "topics": ["Kitchen behind-the-scenes", "Chef stories", "Ingredient sourcing"]
    }
  ]
}
```

## Important Notes
- Don't break existing Content tab Pipeline or Calendar views
- Strategy is a NEW sub-view, toggled by the tab bar
- The `data` field in Prisma is a JSON string — parse it on the frontend
- Keep version history — when agent updates a strategy, create new version (don't overwrite)
- The "Ask Content Agent" button should open the existing FloatingChatWidget (use AgentChatContext)
- All fetches use direct fetch to `${API_BASE}/api/clients/${clientId}/strategy`
