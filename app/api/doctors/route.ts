import { connection, NextResponse } from "next/server";

import {
  addDoctor,
  getSettings,
  listAppointments,
  listDoctors,
  publicDoctor,
} from "@/lib/db";
import { nextAvailableSlots } from "@/lib/scheduling";
import type { DoctorResult } from "@/lib/types";

function clock(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value.trim() : fallback;
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function text(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function doctorResults(doctors: ReturnType<typeof listDoctors>): DoctorResult[] {
  const appointments = listAppointments();
  const timezone = getSettings().timezone;
  return doctors.map((doctor) => ({
    ...publicDoctor(doctor),
    nextSlots: nextAvailableSlots(doctor, appointments, timezone, 4),
  }));
}

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
  const city = (url.searchParams.get("city") ?? "").trim().toLowerCase();
  const specialty = (url.searchParams.get("specialty") ?? "")
    .trim()
    .toLowerCase();
  const urgentOnly = url.searchParams.get("urgent") === "true";

  const doctors = listDoctors().filter((doctor) => {
    if (urgentOnly && !doctor.urgentCare) return false;
    if (city && !doctor.city.toLowerCase().includes(city)) return false;
    if (specialty && !doctor.specialty.toLowerCase().includes(specialty)) {
      return false;
    }
    if (q) {
      const haystack =
        `${doctor.name} ${doctor.specialty} ${doctor.clinic} ${doctor.city} ${doctor.address} ${doctor.languages} ${doctor.email} ${doctor.phone}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const response = NextResponse.json({
    doctors: doctorResults(doctors),
    count: doctors.length,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid doctor record." }, { status: 400 });
  }

  const name = text(body.name, 120);
  const specialty = text(body.specialty, 160);
  const clinic = text(body.clinic, 160);
  const address = text(body.address, 300);
  const city = text(body.city, 100);
  const phone = text(body.phone, 40);
  const email = text(body.email, 160);
  const hours = text(body.hours, 160);
  const fee = text(body.fee, 100);

  if (
    !name ||
    !specialty ||
    !clinic ||
    !address ||
    !city ||
    !phone ||
    !email ||
    !hours ||
    !fee
  ) {
    return NextResponse.json(
      {
        error:
          "Name, specialty, clinic, address, city, phone, email, hours, and fee are required.",
      },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  if (phone.replace(/\D/g, "").length < 8) {
    return NextResponse.json(
      { error: "Enter a valid phone number." },
      { status: 400 },
    );
  }

  const slotStart = clock(body.slotStart, "09:00");
  const slotEnd = clock(body.slotEnd, "17:00");
  if (!slotStart || !slotEnd || slotEnd <= slotStart) {
    return NextResponse.json(
      { error: "Enter a valid slot start and end time (HH:MM)." },
      { status: 400 },
    );
  }

  const requestedMinutes = Number(body.slotMinutes);
  const slotMinutes =
    Number.isFinite(requestedMinutes) &&
    requestedMinutes >= 10 &&
    requestedMinutes <= 120
      ? Math.round(requestedMinutes)
      : 30;

  const workingDays = Array.isArray(body.workingDays)
    ? [
        ...new Set(
          body.workingDays
            .map((day) => Number(day))
            .filter(
              (day): day is number =>
                Number.isInteger(day) && day >= 0 && day <= 6,
            ),
        ),
      ].sort()
    : [1, 2, 3, 4, 5];

  const created = addDoctor({
    name,
    specialty,
    qualifications: text(body.qualifications, 160) || "MBBS",
    clinic,
    address,
    city,
    phone,
    secondaryPhone: text(body.secondaryPhone, 40) || undefined,
    email,
    hours,
    fee,
    languages: text(body.languages, 160) || "English",
    teleconsult: body.teleconsult === true,
    urgentCare: body.urgentCare === true,
    verified: true,
    workingDays: workingDays.length > 0 ? workingDays : [1, 2, 3, 4, 5],
    slotStart,
    slotEnd,
    slotMinutes,
    telegramChatId: text(body.telegramChatId, 120) || undefined,
  });

  const response = NextResponse.json(
    {
      doctor: doctorResults([created])[0],
      message:
        "Doctor added to the live directory. New chat searches will use this record.",
    },
    { status: 201 },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
