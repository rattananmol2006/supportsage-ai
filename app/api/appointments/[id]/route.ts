import { NextResponse } from "next/server";

import { findAppointment, updateAppointment } from "@/lib/db";
import { computeReminderAt } from "@/lib/scheduling";
import type { Appointment } from "@/lib/types";

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
    reminderMinutesBefore?: unknown;
  } | null;

  const patch: Partial<Appointment> = {};

  if (body?.status !== undefined) {
    const status = body.status;
    if (
      status !== "confirmed" &&
      status !== "completed" &&
      status !== "cancelled"
    ) {
      return NextResponse.json(
        { error: "Status must be confirmed, completed, or cancelled." },
        { status: 400 },
      );
    }
    patch.status = status;
  }

  if (body?.reminderMinutesBefore !== undefined) {
    const minutes = Number(body.reminderMinutesBefore);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 10080) {
      return NextResponse.json(
        {
          error:
            "Reminder must be between 5 minutes and 1 week (10080 minutes).",
        },
        { status: 400 },
      );
    }
    patch.reminderMinutesBefore = minutes;
    patch.reminderAt = computeReminderAt(
      appointment.date,
      appointment.time,
      appointment.timezone,
      minutes,
    );
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Send a status or reminder update." },
      { status: 400 },
    );
  }

  const updated = updateAppointment(id, patch);
  return NextResponse.json({ appointment: updated });
}
