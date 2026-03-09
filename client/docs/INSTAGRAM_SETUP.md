# Instagram API Setup

Follow these steps to connect real Instagram feeds to the 2Fly Command Center.

## 1. Create a Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Sign in or create a Meta Developer account
3. **My Apps** → **Create App** → **Other** → **Business**
4. Name it (e.g. "2Fly Command Center")
5. Add **App Domains** and **Privacy Policy URL** (required for production)

## 2. Add Products

1. In your app dashboard, go to **Products**
2. Add **Instagram Graph API**
3. Add **Facebook Login** (for OAuth)

## 3. Configure Facebook Login

1. **Facebook Login** → **Settings**
2. Add **Valid OAuth Redirect URIs**:
   - `http://localhost:3000/api/instagram/callback`
   - `https://yourdomain.com/api/instagram/callback`
3. Save

## 4. Get Credentials

1. **App Settings** → **Basic**
2. Copy **App ID** and **App Secret**

## 5. Environment Variables

Create `.env.local` in the `client` folder:

```
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production, set `NEXT_PUBLIC_APP_URL` to your domain.

## 6. Connect Instagram to Facebook Page

Each Instagram account must be:

- A **Business** or **Creator** account
- Linked to a **Facebook Page**

1. In Instagram app: **Settings** → **Account** → **Switch to Professional Account**
2. Connect to a Facebook Page (create one if needed)
3. Complete setup

## 7. Test the Flow

1. Add yourself as an **Instagram Tester** in the Meta app (Products → Instagram Graph API)
2. Go to a client's **Social Media** tab
3. Click **Connect Instagram**
4. Log in with Facebook and authorize the app
5. Grant access to the Page and Instagram
6. You should be redirected back with the feed loading

## 8. App Review (Production)

To allow non-tester accounts to connect:

1. Go to **App Review** in Meta dashboard
2. Request permissions: `instagram_basic`, `pages_show_list`, `pages_read_engagement`
3. Provide a screencast of the connect flow
4. Wait for approval

## API Routes

| Route | Purpose |
|-------|---------|
| `GET /api/instagram/connect?clientId=1` | Starts OAuth, redirects to Meta |
| `GET /api/instagram/callback` | Handles OAuth callback, stores token |
| `GET /api/clients/[id]/instagram/feed` | Returns feed (or demo if not connected) |
| `GET /api/clients/[id]/instagram/status` | Returns connection status |
| `POST /api/clients/[id]/instagram/disconnect` | Removes connection |

## Fallback Behavior

- If `INSTAGRAM_APP_ID` is not set: Connect button still appears but OAuth will fail with a 500.
- If client has no connection: Uses demo data from `mockSocialMediaData.ts` (if a handle is configured).
- If client has no handle or connection: Shows "No Instagram connected" with Connect button.
