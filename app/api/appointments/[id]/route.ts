import { NextResponse } from "next/server";

import { findAppointment, updateAppointment } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const appointment = findAppointment(id);
  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
  } | null;
  const status = body?.status;
  if (status !== "confirmed" && status !== "completed" && status !== "cancelled") {
    return NextResponse.json(
      { error: "Status must be confirmed, completed, or cancelled." },
      { status: 400 },
    );
  }

  const updated = updateAppointment(id, { status });
  return NextResponse.json({ appointment: updated });
}
