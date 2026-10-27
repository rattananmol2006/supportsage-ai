import { connection, NextResponse } from "next/server";

import { listOrders } from "@/lib/db";

export async function GET() {
  await connection();
  const response = NextResponse.json({ orders: listOrders() });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
