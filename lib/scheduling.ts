import type {
  Appointment,
  CalendarDay,
  CalendarDoctorAvailability,
  Doctor,
  ScheduleSlot,
} from "@/lib/types";

export type ScheduleDay = {
  date: string;
  label: string;
  slots: string[];
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function todayInTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function currentMinutesInTimeZone(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return Number(values.hour) * 60 + Number(values.minute);
}

export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T12:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

export function weekday(date: string): number {
  return new Date(`${date}T12:00:00.000Z`).getUTCDay();
}

export function formatDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function doctorSlotTimes(doctor: Doctor): string[] {
  const slots: string[] = [];
  const start = timeToMinutes(doctor.slotStart);
  const end = timeToMinutes(doctor.slotEnd);

  for (let minute = start; minute + doctor.slotMinutes <= end; minute += doctor.slotMinutes) {
    slots.push(minutesToTime(minute));
  }

  return slots;
}

function parseLocalDateTime(date: string, time: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return { year, month, day, hour, minute };
}

/**
 * Convert a clinic-local date/time into the matching UTC instant, accounting
 * for the timezone's offset on that date (including DST where applicable).
 */
export function zonedToUtc(date: string, time: string, timeZone: string): Date {
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

export function computeReminderAt(
  date: string,
  time: string,
  timeZone: string,
  minutesBefore: number,
): string {
  const start = zonedToUtc(date, time, timeZone).getTime();
  return new Date(start - Math.max(0, minutesBefore) * 60_000).toISOString();
}

export function getDoctorSchedule(
  doctor: Doctor,
  appointments: Appointment[],
  timeZone: string,
  maxDays = 5,
): ScheduleDay[] {
  const days: ScheduleDay[] = [];
  const today = todayInTimeZone(timeZone);
  const nowMinutes = currentMinutesInTimeZone(timeZone);
  const booked = new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.doctorId === doctor.id &&
          appointment.status === "confirmed",
      )
      .map((appointment) => `${appointment.date}|${appointment.time}`),
  );

  for (let offset = 0; offset < 21 && days.length < maxDays; offset += 1) {
    const date = addDays(today, offset);
    if (!doctor.workingDays.includes(weekday(date))) continue;

    const slots = doctorSlotTimes(doctor).filter((time) => {
      if (booked.has(`${date}|${time}`)) return false;
      if (date === today && timeToMinutes(time) <= nowMinutes + 45) return false;
      return true;
    });

    if (slots.length === 0) continue;

    days.push({
      date,
      label: offset === 0 ? "Today" : formatDayLabel(date),
      slots: slots.slice(0, 8),
    });
  }

  return days;
}

export function isBookableSlot(
  doctor: Doctor,
  date: string,
  time: string,
  appointments: Appointment[],
  timeZone: string,
): boolean {
  const today = todayInTimeZone(timeZone);
  if (date < today) return false;
  if (!doctor.workingDays.includes(weekday(date))) return false;

  const minutes = timeToMinutes(time);
  if (minutes < timeToMinutes(doctor.slotStart)) return false;
  if (minutes + doctor.slotMinutes > timeToMinutes(doctor.slotEnd)) return false;
  if ((minutes - timeToMinutes(doctor.slotStart)) % doctor.slotMinutes !== 0) {
    return false;
  }

  const conflict = appointments.some(
    (appointment) =>
      appointment.doctorId === doctor.id &&
      appointment.date === date &&
      appointment.time === time &&
      appointment.status === "confirmed",
  );

  return !conflict;
}

export function nextAvailableSlots(
  doctor: Doctor,
  appointments: Appointment[],
  timeZone: string,
  count = 4,
): { date: string; time: string }[] {
  const schedule = getDoctorSchedule(doctor, appointments, timeZone, 6);
  return schedule
    .flatMap((day) =>
      day.slots.map((time) => ({ date: day.date, time })),
    )
    .slice(0, count);
}

/**
 * Find the first open slot on or after a requested date. Used to keep a
 * booking moving when the patient's preferred day or time is already full.
 */
export function findNextOpenSlot(
  doctor: Doctor,
  appointments: Appointment[],
  timeZone: string,
  notBeforeDate: string,
  afterTime?: string,
  maxDays = 45,
): ScheduleSlot | null {
  const today = todayInTimeZone(timeZone);
  const startDate = notBeforeDate < today ? today : notBeforeDate;
  const nowMinutes = currentMinutesInTimeZone(timeZone);
  const booked = new Set(
    appointments
      .filter(
        (appointment) =>
          appointment.doctorId === doctor.id &&
          appointment.status === "confirmed",
      )
      .map((appointment) => `${appointment.date}|${appointment.time}`),
  );

  for (let offset = 0; offset < maxDays; offset += 1) {
    const date = addDays(startDate, offset);
    if (!doctor.workingDays.includes(weekday(date))) continue;

    for (const time of doctorSlotTimes(doctor)) {
      if (booked.has(`${date}|${time}`)) continue;
      if (date === today && timeToMinutes(time) <= nowMinutes + 45) continue;
      if (offset === 0 && afterTime && timeToMinutes(time) <= timeToMinutes(afterTime)) {
        continue;
      }
      return { date, time };
    }
  }

  return null;
}

export function formatFullDayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function buildCalendarDays(
  doctors: Doctor[],
  appointments: Appointment[],
  timeZone: string,
  options: { from?: string; days?: number; doctorId?: string } = {},
): CalendarDay[] {
  const today = todayInTimeZone(timeZone);
  const from = options.from ?? addDays(today, -7);
  const dayCount = Math.min(60, Math.max(1, options.days ?? 35));
  const nowMinutes = currentMinutesInTimeZone(timeZone);
  const scoped = options.doctorId
    ? doctors.filter((doctor) => doctor.id === options.doctorId)
    : doctors;
  const confirmed = appointments.filter(
    (appointment) => appointment.status === "confirmed",
  );

  const result: CalendarDay[] = [];

  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = addDays(from, offset);
    const dayOfWeek = weekday(date);
    const isToday = date === today;
    const isPast = date < today;
    const rows: CalendarDoctorAvailability[] = [];
    let openSlots = 0;
    let bookedSlots = 0;

    for (const doctor of scoped) {
      const works = doctor.workingDays.includes(dayOfWeek);
      const bookedTimes = new Set(
        confirmed
          .filter(
            (appointment) =>
              appointment.doctorId === doctor.id &&
              appointment.date === date,
          )
          .map((appointment) => appointment.time),
      );

      let open = 0;
      if (works && !isPast) {
        for (const time of doctorSlotTimes(doctor)) {
          if (bookedTimes.has(time)) continue;
          if (isToday && timeToMinutes(time) <= nowMinutes + 45) continue;
          open += 1;
        }
      }

      if (!works && bookedTimes.size === 0) continue;

      openSlots += open;
      bookedSlots += bookedTimes.size;
      rows.push({
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        openSlots: open,
        bookedSlots: bookedTimes.size,
      });
    }

    result.push({
      date,
      label: isToday ? "Today" : formatDayLabel(date),
      isToday,
      isPast,
      openSlots,
      bookedSlots,
      doctors: rows,
    });
  }

  return result;
}
