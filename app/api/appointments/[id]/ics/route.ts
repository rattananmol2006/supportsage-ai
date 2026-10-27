import { NextResponse } from "next/server";

import { buildIcs } from "@/lib/calendar";
import { findAppointment } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  const { id } = await params;
  const appointment = findAppointment(id);
  if (!appointment) {
    return NextResponse.json(
      { error: "Appointment not found." },
      { status: 404 },
    );
  }

  const ics = buildIcs({
    reference: appointment.reference,
    doctorName: appointment.doctorName,
    doctorSpecialty: appointment.doctorSpecialty,
    clinic: appointment.clinic,
    location: appointment.location,
    patientName: appointment.patientName,
    date: appointment.date,
    time: appointment.time,
    durationMinutes: appointment.durationMinutes,
    reason: appointment.reason,
    timezone: appointment.timezone,
  });

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="supportsage-${appointment.reference}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
