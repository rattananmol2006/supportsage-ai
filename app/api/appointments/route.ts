import { connection, NextResponse } from "next/server";

import { listAppointments } from "@/lib/db";

export async function GET() {
  await connection();
  const response = NextResponse.json({
    appointments: listAppointments(),
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
