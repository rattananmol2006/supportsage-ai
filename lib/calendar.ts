import { reminderLabel } from "@/lib/reminders";
import { zonedToUtc } from "@/lib/scheduling";

type CalendarEvent = {
  reference: string;
  doctorName: string;
  doctorSpecialty: string;
  clinic: string;
  location: string;
  patientName: string;
  date: string;
  time: string;
  durationMinutes: number;
  reason: string;
  timezone: string;
  reminderMinutesBefore?: number;
};

function utcStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function compactLocal(date: string, time: string): string {
  return `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = new Date(
    zonedToUtc(event.date, event.time, event.timezone).getTime(),
  );
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const endTime = end.toLocaleTimeString("en-GB", {
    timeZone: event.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const endDate = end
    .toLocaleDateString("en-CA", { timeZone: event.timezone })
    .replace(/\//g, "-");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Appointment with ${event.doctorName}`,
    dates: `${compactLocal(event.date, event.time)}/${compactLocal(endDate, endTime)}`,
    ctz: event.timezone,
    details: [
      `${event.doctorSpecialty} · ${event.clinic}`,
      `Patient: ${event.patientName}`,
      `Reason: ${event.reason}`,
      `Reference: ${event.reference}`,
      `Reminder: ${reminderLabel(event.reminderMinutesBefore ?? 60)}`,
      "Booked through SupportSage AI",
    ].join("\n"),
    location: event.location,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function buildIcs(event: CalendarEvent): string {
  const start = zonedToUtc(event.date, event.time, event.timezone);
  const end = new Date(start.getTime() + event.durationMinutes * 60_000);
  const now = new Date();
  const reminderMinutes = Math.max(0, event.reminderMinutesBefore ?? 60);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SupportSage AI//Clinic Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${escapeIcs(event.reference)}@supportsage.ai`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcs(`Appointment with ${event.doctorName}`)}`,
    `DESCRIPTION:${escapeIcs(
      [
        `${event.doctorSpecialty} · ${event.clinic}`,
        `Patient: ${event.patientName}`,
        `Reason: ${event.reason}`,
        `Reference: ${event.reference}`,
        `Reminder: ${reminderLabel(reminderMinutes)}`,
        "Booked through SupportSage AI",
      ].join("\n"),
    )}`,
    `LOCATION:${escapeIcs(event.location)}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(`Reminder — appointment with ${event.doctorName}`)}`,
    `TRIGGER:-PT${reminderMinutes}M`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
