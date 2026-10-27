import { randomBytes } from "node:crypto";

import { connection, NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  getGoogleOAuthConfig,
  getGoogleRedirectUri,
} from "@/lib/google-calendar";

function dashboardError(request: NextRequest, reason: string) {
  return NextResponse.redirect(
    new URL(`/dashboard?google=error&reason=${encodeURIComponent(reason)}`, request.url),
  );
}

export async function GET(request: NextRequest) {
  await connection();

  if (!getGoogleOAuthConfig().configured) {
    return dashboardError(request, "not_configured");
  }

  const state = randomBytes(24).toString("base64url");

  try {
    const authUrl = buildGoogleAuthUrl({
      state,
      redirectUri: getGoogleRedirectUri(request.nextUrl.origin),
    });
    const response = NextResponse.redirect(authUrl);
    response.cookies.set({
      name: GOOGLE_OAUTH_STATE_COOKIE,
      value: state,
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    console.error("[google-calendar] could not start OAuth", error);
    return dashboardError(request, "start_failed");
  }
}
