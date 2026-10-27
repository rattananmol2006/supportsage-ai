import { connection, NextResponse } from "next/server";

import { getSettings, publicSettings, updateSettings } from "@/lib/db";
import { revokeGoogleToken } from "@/lib/google-calendar";

export async function POST() {
  await connection();

  const settings = getSettings();
  if (settings.googleRefreshToken) {
    try {
      await revokeGoogleToken(settings.googleRefreshToken);
    } catch (error) {
      console.error("[google-calendar] token revoke failed", error);
    }
  }

  updateSettings({
    googleAccessToken: undefined,
    googleRefreshToken: undefined,
    googleTokenExpiresAt: undefined,
    googleScope: undefined,
    googleConnectedEmail: undefined,
    googleConnectedAt: undefined,
  });

  const response = NextResponse.json({
    status: "disconnected",
    settings: publicSettings(),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
