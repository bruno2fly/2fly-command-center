# Tunnel Setup for Twilio WhatsApp Webhook

The Twilio webhook needs a public URL to receive incoming WhatsApp messages. **Cloudflare Tunnel** is recommended (no interstitial page, unlike ngrok free tier).

## Prerequisites

Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/):

```bash
# macOS (Homebrew)
brew install cloudflared

# Or download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/
```

## Run with Cloudflare Tunnel

1. **Start the server** (in one terminal):
   ```bash
   npm run dev:server
   ```

2. **Start the tunnel** (in another terminal):
   ```bash
   npm run tunnel:cloudflare
   ```

   Or run both together:
   ```bash
   npm run dev:with-tunnel
   ```

3. **Copy the public URL** from the cloudflared output, e.g.:
   ```
   Your quick Tunnel has been created! Visit it at:
   https://random-name-123.trycloudflare.com
   ```

4. **Update Twilio webhook**:
   - Go to [Twilio Console](https://console.twilio.com/) → Messaging → Try it out → Send a WhatsApp message
   - Or: Phone Numbers → Manage → Active numbers → your WhatsApp number
   - Set the webhook URL to:
     ```
     https://YOUR-TUNNEL-URL.trycloudflare.com/api/whatsapp/webhook
     ```
   - Method: **POST**
   - Save

## Webhook URL

| Component | Value |
|-----------|-------|
| Base URL | From cloudflared output (e.g. `https://xyz.trycloudflare.com`) |
| Path | `/api/whatsapp/webhook` |
| Full URL | `https://YOUR-TUNNEL-URL.trycloudflare.com/api/whatsapp/webhook` |

**Note:** The tunnel URL changes each time you restart cloudflared (unless using a named tunnel). You must update the Twilio webhook URL whenever you get a new tunnel URL.

## When Cloudflare Tunnel Fails (DNS / Connection Errors)

If you see errors like **"Failed to refresh DNS local resolver"** or **"lookup region1.v2.argotunnel.com: i/o timeout"**:

1. **Change system DNS to Cloudflare 1.1.1.1** (often fixes the issue):
   - **macOS**: System Settings → Network → Wi‑Fi → Details → DNS → add `1.1.1.1` (and optionally `1.0.0.1`)
   - **Windows**: Settings → Network → Change adapter options → Properties → IPv4 → Use DNS: `1.1.1.1`

2. **Try Cloudflare with IPv4 only**:
   ```bash
   npm run tunnel:cloudflare:ipv4
   ```

3. **Use LocalTunnel instead** (free fallback, works with Twilio webhooks):
   ```bash
   npm run dev:full:localtunnel
   ```
   Or run tunnel only: `npm run tunnel:localtunnel`. Copy the URL (e.g. `https://xxx.loca.lt`) and set Twilio webhook to `https://YOUR-URL/api/whatsapp/webhook`.

## ngrok (Alternative)

If you prefer ngrok with a **paid account** (avoids the interstitial page that causes 403s):

```bash
ngrok http 4000
```

Then set Twilio webhook to: `https://YOUR-NGROK-URL.ngrok.io/api/whatsapp/webhook`

Free ngrok shows an interstitial page that blocks Twilio’s webhook requests (403).
