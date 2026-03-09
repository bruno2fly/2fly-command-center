/**
 * GET /api/instagram/callback?code=...&state=csrf:clientId
 * Validates CSRF, exchanges code for short-lived then long-lived token,
 * fetches Pages + Instagram Business Account, stores connection.
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getConnection, setConnection } from "@/lib/instagram/store";

const BASE = "https://graph.facebook.com/v21.0";
const COOKIE_NAME = "instagram_oauth_state";

function redirectError(baseUrl: string, clientId: string, message: string) {
  return NextResponse.redirect(
    `${baseUrl}/clients/${clientId}?tab=social&error=instagram_auth_failed&reason=${encodeURIComponent(message)}`
  );
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const error = searchParams.get("error");
  const errorReason = searchParams.get("error_reason");

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/instagram/callback`;

  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;

  const cookieStore = await cookies();
  const storedState = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);

  let clientId = "";

  if (error) {
    const parts = (stateParam ?? storedState ?? "").split(":");
    clientId = parts[1] ?? "1";
    const msg = errorReason ?? error;
    return redirectError(baseUrl, clientId, msg);
  }

  if (!code || !stateParam || !appId || !appSecret) {
    return NextResponse.redirect(
      `${baseUrl}/clients?error=instagram_auth_failed&reason=${encodeURIComponent("Missing parameters")}`
    );
  }

  if (!storedState || storedState !== stateParam) {
    return NextResponse.redirect(
      `${baseUrl}/clients?error=instagram_auth_failed&reason=${encodeURIComponent("Invalid state (CSRF)")}`
    );
  }

  const parts = stateParam.split(":");
  clientId = parts[1] ?? "";
  if (!clientId) {
    return NextResponse.redirect(
      `${baseUrl}/clients?error=instagram_auth_failed&reason=${encodeURIComponent("Invalid state")}`
    );
  }

  try {
    const shortLivedRes = await fetch(
      `${BASE}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`,
      { method: "GET" }
    );
    const shortData = (await shortLivedRes.json()) as {
      access_token?: string;
      error?: { message: string };
    };

    if (!shortData.access_token) {
      const msg = shortData.error?.message ?? "Token exchange failed";
      return redirectError(baseUrl, clientId, msg);
    }

    const longLivedRes = await fetch(
      `${BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortData.access_token}`,
      { method: "GET" }
    );
    const longData = (await longLivedRes.json()) as {
      access_token?: string;
      error?: { message: string };
    };

    const longLivedToken = longData.access_token ?? shortData.access_token;

    const pagesRes = await fetch(
      `${BASE}/me/accounts?access_token=${longLivedToken}`
    );
    const pagesData = (await pagesRes.json()) as {
      data?: Array<{ id: string; access_token: string }>;
      error?: { message: string };
    };

    if (!pagesData.data?.length) {
      return redirectError(
        baseUrl,
        clientId,
        "No Facebook Pages found. Create a Page and link it to your account."
      );
    }

    let igAccount: { id: string; username: string } | null = null;
    let pageAccessToken = "";

    for (const page of pagesData.data) {
      const pageDetailRes = await fetch(
        `${BASE}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`,
        { method: "GET" }
      );
      const pageDetail = (await pageDetailRes.json()) as {
        instagram_business_account?: { id: string; username: string };
      };

      if (pageDetail.instagram_business_account) {
        igAccount = pageDetail.instagram_business_account;
        pageAccessToken = page.access_token;
        break;
      }
    }

    if (!igAccount || !pageAccessToken) {
      return redirectError(
        baseUrl,
        clientId,
        "No Instagram Business/Creator account linked to your Facebook Page. Link one in Facebook Page settings."
      );
    }

    await setConnection({
      clientId,
      accessToken: pageAccessToken,
      username: igAccount.username,
      instagramUserId: igAccount.id,
    });

    return NextResponse.redirect(
      `${baseUrl}/clients/${clientId}?tab=social&connected=1`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return redirectError(baseUrl, clientId, msg);
  }
}
