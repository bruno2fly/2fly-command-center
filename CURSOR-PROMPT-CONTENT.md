# PASTE THIS INTO CURSOR CHAT:

## Content Tab v2 — Real Content Management

The Content tab currently shows real data from the API but has no way to CREATE, EDIT, or manage content. Turn it into a real content management tool.

### Current State:
- Content items exist in DB (156 items, statuses: draft/scheduled/approved/published/cancelled)
- API works: `GET /api/content?clientId=:id` returns content items
- Pipeline kanban exists but is read-only
- Content ideas are stored in localStorage (should be in DB)

### What to Build:

#### 1. Create Content Modal

**New component: `client/src/components/client-control/content/CreateContentModal.tsx`**

A modal to add new content items. Opens from a "+ Add Content" button.

Fields:
- **Title** (required): text input
- **Platform**: dropdown — instagram, facebook, tiktok, google (default: instagram)
- **Content Type**: dropdown — post, carousel, reel, story, video (default: post)
- **Status**: dropdown — draft, scheduled, approved, published (default: draft)
- **Scheduled Date**: date picker (optional)
- **Caption**: textarea (optional, for the post caption)
- **Notes**: textarea (optional, internal notes)

On submit:
```javascript
POST /api/content
{
  clientId, title, platform, contentType, status, scheduledDate, caption, notes
}
```

After creation: close modal, refresh content list, toast "✅ Content added"

#### 2. Add POST endpoint if missing

Check if `POST /api/content` exists. If not, add to `server/src/routes/content.js`:

```javascript
router.post("/", async (req, res) => {
  const { clientId, title, platform, contentType, status, scheduledDate, caption, notes } = req.body;
  if (!clientId || !title) return res.status(400).json({ error: "clientId and title required" });

  const item = await prisma.contentItem.create({
    data: {
      clientId,
      title,
      platform: platform || "instagram",
      contentType: contentType || "post",
      status: status || "draft",
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      caption: caption || null,
      notes: notes || null,
    }
  });
  res.json(item);
});
```

#### 3. Edit Content — Click to Open Detail

When clicking a content item in the pipeline kanban or calendar, open a detail modal:

```
┌──────────────────────────────────────────────────────────────┐
│  ✕  Edit Content                                             │
│                                                              │
│  Title: [Client transformation — carousel                 ]  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Platform │  │ Type     │  │ Status   │  │ Date     │    │
│  │ [IG ▾]   │  │[Carousel]│  │[Publish▾]│  │ [📅    ] │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  Caption:                                                    │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Before & after transformation at The Shape SPA...     │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  Notes:                                                      │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Use photo set from March 1 shoot                      │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│                    [Delete 🗑]  [Save Changes ✅]            │
└──────────────────────────────────────────────────────────────┘
```

On save: `PATCH /api/content/:id` with changed fields, refresh list, toast "✅ Updated"
On delete: `DELETE /api/content/:id` with confirmation, refresh list

#### 4. Add PATCH and DELETE endpoints if missing

```javascript
router.patch("/:id", async (req, res) => {
  const { title, platform, contentType, status, scheduledDate, caption, notes } = req.body;
  const data = {};
  if (title !== undefined) data.title = title;
  if (platform !== undefined) data.platform = platform;
  if (contentType !== undefined) data.contentType = contentType;
  if (status !== undefined) data.status = status;
  if (scheduledDate !== undefined) data.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
  if (caption !== undefined) data.caption = caption;
  if (notes !== undefined) data.notes = notes;
  if (status === "published" && !data.publishedDate) data.publishedDate = new Date();

  const item = await prisma.contentItem.update({ where: { id: req.params.id }, data });
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  await prisma.contentItem.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});
```

#### 5. Quick Status Change on Pipeline Kanban

In `ContentPipelineKanban.tsx`, add the ability to change content status directly:
- Each card gets a small dropdown or button row to change status
- When status changes: `PATCH /api/content/:id` with `{ status: newStatus }`
- Animate card moving between columns
- Toast "📝 Moved to [status]"

#### 6. Content Stats Bar

At the top of the Content tab, show real stats computed from API data:

```
📊 Total: 12  |  📝 Drafts: 3  |  📅 Scheduled: 4  |  ✅ Published: 5  |  🔥 Streak: 3 days
```

The streak calculation already exists in `ClientContentTab.tsx` (`computePostingStreak`).

#### 7. "+ Add Content" Button

Add to the Content tab header and to the pipeline kanban:
- In the Content tab header: primary button, same style as "Create Task"
- In each kanban column: small "+ Add" link at the bottom

Both open the CreateContentModal with the appropriate default status:
- From Draft column: status defaults to "draft"
- From Scheduled column: status defaults to "scheduled"

### Design:
- Match existing dark theme aesthetic
- Modal: dark backdrop, centered, max-w-lg
- Platform icons: 📸 Instagram, 📘 Facebook, 🎵 TikTok, 🔍 Google
- Status colors: draft=gray, scheduled=blue, approved=green, published=emerald, cancelled=red
- Content type badges: small pills with icons

### API client additions needed in `client/src/lib/api.ts`:
```typescript
createContent: (data: { clientId: string; title: string; platform?: string; contentType?: string; status?: string; scheduledDate?: string; caption?: string; notes?: string }) =>
  fetchAPI('/content', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

updateContent: (id: string, data: Partial<{ title: string; platform: string; contentType: string; status: string; scheduledDate: string; caption: string; notes: string }>) =>
  fetchAPI(`/content/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }),

deleteContent: (id: string) =>
  fetchAPI(`/content/${id}`, { method: 'DELETE' }),
```

### Important:
- Don't remove the AI Content Ideas or Reel Ideas sections — keep them
- Don't break the existing pipeline kanban view — enhance it
- The Monthly Planner should also reflect real data (it may already)
- Keep dark theme support
- When changing Prisma schema, use `npx prisma db push` NOT `--force-reset`
