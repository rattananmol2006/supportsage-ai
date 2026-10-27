import { connection, NextResponse } from "next/server";

import { listConversations } from "@/lib/db";
import type { ChatMode } from "@/lib/types";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  const mode: ChatMode | undefined =
    modeParam === "doctor" || modeParam === "business" ? modeParam : undefined;

  const response = NextResponse.json({
    conversations: listConversations(mode),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
