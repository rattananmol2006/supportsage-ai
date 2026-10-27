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
};

function parseLocalDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

function zonedToUtc(date: string, time: string, timeZone: string): Date {
  const { year, month, day, hour, minute } = parseLocalDateTime(date, time);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(guess));

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const observed = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );

  return new Date(guess - (observed - guess));
}

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
        "Booked through SupportSage AI",
      ].join("\n"),
    )}`,
    `LOCATION:${escapeIcs(event.location)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
