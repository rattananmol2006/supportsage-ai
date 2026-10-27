import { connection, NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSettings, updateSettings } from "@/lib/db";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  GoogleOAuthError,
  exchangeGoogleCode,
  fetchGoogleEmail,
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
} from "@/lib/google-calendar";

function redirect(
  request: NextRequest,
  params: { connected?: boolean; reason?: string },
) {
  const url = new URL("/dashboard", request.url);
  if (params.connected) {
    url.searchParams.set("google", "connected");
  } else {
    url.searchParams.set("google", "error");
    url.searchParams.set("reason", params.reason ?? "unknown");
  }
  const response = NextResponse.redirect(url);
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  await connection();

  const params = request.nextUrl.searchParams;
  const state = params.get("state");
  const expectedState = request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const googleError = params.get("error");
  const code = params.get("code");

  if (googleError) {
    return redirect(request, {
      reason: googleError === "access_denied" ? "cancelled" : "google_denied",
    });
  }

  if (!state || !expectedState || state !== expectedState) {
    return redirect(request, { reason: "state_mismatch" });
  }

  if (!code) {
    return redirect(request, { reason: "missing_code" });
  }

  if (!getGoogleOAuthConfig().configured) {
    return redirect(request, { reason: "not_configured" });
  }

  try {
    const tokens = await exchangeGoogleCode({
      code,
      redirectUri: getGoogleRedirectUri(request.nextUrl.origin),
    });
    const existing = getSettings();
    const refreshToken = tokens.refresh_token ?? existing.googleRefreshToken;

    if (!refreshToken) {
      return redirect(request, { reason: "no_refresh_token" });
    }

    const email = await fetchGoogleEmail(tokens.access_token);

    updateSettings({
      googleAccessToken: tokens.access_token,
      googleRefreshToken: refreshToken,
      googleTokenExpiresAt: new Date(
        Date.now() + (Number(tokens.expires_in) || 3600) * 1000,
      ).toISOString(),
      googleScope: tokens.scope,
      googleConnectedEmail: email,
      googleConnectedAt: new Date().toISOString(),
      googleCalendarId: existing.googleCalendarId || "primary",
    });

    return redirect(request, { connected: true });
  } catch (error) {
    const reason =
      error instanceof GoogleOAuthError ? error.code : "token_exchange_failed";
    console.error("[google-calendar] OAuth callback failed", error);
    return redirect(request, { reason });
  }
}
