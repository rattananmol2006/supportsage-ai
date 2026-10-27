import { NextResponse } from "next/server";

import { findAppointment, updateAppointment } from "@/lib/db";
import {
  createEventForAppointment,
  deleteGoogleCalendarEvent,
  isGoogleCalendarConnected,
  updateGoogleCalendarReminder,
} from "@/lib/google-calendar";
import { computeReminderAt } from "@/lib/scheduling";
import type { Appointment } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Google Calendar sync failed.";
}

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
  let googleWarning: string | undefined;

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

  if (patch.status === "cancelled" && appointment.googleEventId) {
    try {
      await deleteGoogleCalendarEvent(appointment.googleEventId);
      patch.googleEventId = undefined;
      patch.googleEventLink = undefined;
      patch.googleSyncedAt = undefined;
      patch.googleSyncError = undefined;
    } catch (error) {
      googleWarning = errorMessage(error);
      patch.googleSyncError = googleWarning;
      console.error("[google-calendar] cancellation sync failed", error);
    }
  }

  if (
    patch.status === "confirmed" &&
    !appointment.googleEventId &&
    isGoogleCalendarConnected()
  ) {
    try {
      const event = await createEventForAppointment({
        ...appointment,
        status: "confirmed",
      });
      patch.googleEventId = event.id;
      patch.googleEventLink = event.htmlLink;
      patch.googleSyncedAt = new Date().toISOString();
      patch.googleSyncError = undefined;
    } catch (error) {
      googleWarning = errorMessage(error);
      patch.googleSyncError = googleWarning;
      console.error("[google-calendar] resync failed", error);
    }
  }

  const googleEventId = patch.googleEventId ?? appointment.googleEventId;

  if (
    patch.reminderMinutesBefore !== undefined &&
    patch.status !== "cancelled" &&
    googleEventId
  ) {
    try {
      await updateGoogleCalendarReminder(
        googleEventId,
        patch.reminderMinutesBefore,
      );
      patch.googleSyncError = undefined;
    } catch (error) {
      googleWarning = errorMessage(error);
      patch.googleSyncError = googleWarning;
      console.error("[google-calendar] reminder sync failed", error);
    }
  }

  const updated = updateAppointment(id, patch);
  const response = NextResponse.json({
    appointment: updated,
    googleWarning,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
