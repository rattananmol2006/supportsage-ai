import { connection, NextResponse } from "next/server";

import { listEscalations } from "@/lib/db";

export async function GET() {
  await connection();
  const response = NextResponse.json({ escalations: listEscalations() });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
