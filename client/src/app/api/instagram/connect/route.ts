/**
 * GET /api/instagram/connect?clientId=1
 * Redirects to Facebook OAuth (v21.0) with CSRF state stored in cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const META_OAUTH_URL = "https://www.facebook.com/v21.0/dialog/oauth";
const SCOPES = [
  "instagram_basic",
  "instagram_manage_insights",
  "pages_show_list",
  "pages_read_engagement",
].join(",");

const COOKIE_NAME = "instagram_oauth_state";
const COOKIE_MAX_AGE = 600; // 10 min

export async function GET(request: NextRequest) {
  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const appId = process.env.INSTAGRAM_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: "INSTAGRAM_APP_ID not configured" },
      { status: 500 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin;
  const redirectUri = `${baseUrl.replace(/\/$/, "")}/api/instagram/callback`;

  const csrfToken = randomBytes(32).toString("hex");
  const state = `${csrfToken}:${clientId}`;

  const url = new URL(META_OAUTH_URL);
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set(COOKIE_NAME, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return res;
}
