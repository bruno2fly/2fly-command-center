# 2Fly Marketing Command Center

Internal dashboard to reduce founder mental overload by centralizing client visibility.

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion (available, minimal usage)

## Run

```bash
 % npm run denpm run dev:server   # Runs server only (port 4000)
npm run dev:client   # Runs client only (port 3001)
```

**WhatsApp webhook (Twilio):** Use Cloudflare Tunnel to expose the server. See [TUNNEL.md](./TUNNEL.md). If Cloudflare shows DNS/connection errors, use `npm run dev:full:localtunnel` instead.

```bash
npm run dev:full            # Server + client + tunnel (all-in-one for WhatsApp)
npm run dev:with-tunnel     # Server + tunnel only (run dev:client separately)
npm run tunnel:cloudflare   # Tunnel only
```

**Checklist when WhatsApp stops working (send/receive):**
1. Kill ports: `lsof -ti:4000 -ti:3001 | xargs kill -9`
2. Run from the **project root** (not server/ or client/): `npm run dev:full:localtunnel`
3. Wait for all 3 services to show as ready in the terminal:
   - `[0]` Server: "2Fly Command Center API running on http://localhost:4000"
   - `[1]` Client: "Ready in Xs"
   - `[2]` Tunnel: "your url is: https://xxx.loca.lt"
4. Copy the tunnel URL from `[2]` line
5. In Twilio Console → Phone Numbers → your WhatsApp number → set webhook to `https://YOUR-TUNNEL-URL/api/whatsapp/webhook` (POST) → Save
6. Open http://localhost:3001/admin/whatsapp and sign in (password: in `server/.env` as `ADMIN_PASSWORD`)
7. Test: send a WhatsApp message to +13637770337 from your phone — it should appear in the dashboard

**Common issues and fixes:**
- **Cloudflare tunnel broken (DNS timeout):** Use `dev:full:localtunnel` instead of `dev:full`. Cloudflare has persistent DNS issues on this network.
- **Twilio 401 / Error 20003 (Authentication):** Verify `TWILIO_AUTH_TOKEN` in `server/.env` matches Twilio Console → Account → API Keys & Tokens. A single wrong character causes this.
- **Twilio 408 timeout on webhook:** The webhook responds immediately with TwiML, then processes in the background. If this regresses, check `server/src/routes/whatsapp.ts` — the response must be sent BEFORE any DB/classification work.
- **Port already in use (EADDRINUSE):** Run `lsof -ti:4000 -ti:3001 | xargs kill -9` then restart.
- **Tunnel URL changed:** The LocalTunnel URL changes every restart. Always update the Twilio webhook URL after restarting.
- **`_document.js` ENOENT error in client:** Run `cd client && rm -rf .next node_modules/.cache && npm run dev`. Do NOT add `outputFileTracingRoot` to next.config.ts.

Open [http://localhost:3001](http://localhost:3001) (client).

## Structure

- **`/`** — CEO Dashboard: total clients, green/yellow/red counts, alerts
- **`/clients`** — Client Overview: cards with Content Buffer, Ads Health, Requests, Backlog, Performance
- **`/clients/[id]`** — Client Detail: tabs for Content Pipeline, Requests, Ads Summary, Website Backlog

## Status Logic

- **Content Buffer**: ≥15 days → Green, 7–14 → Yellow, &lt;7 → Red
- **Ads Health**: ROAS ≥3 → Green, 1.5–3 → Yellow, &lt;1.5 → Red
- **Requests**: 0 → Green, 1–3 → Yellow, &gt;3 → Red
- **Website Backlog**: 0–2 → Green, 3–5 → Yellow, &gt;5 → Red
- **Performance Trend**: up → Green, flat → Yellow, down → Red

## Mock Data

All data is in `client/src/lib/mockData.ts`. Replace with API calls when connecting the backend.
