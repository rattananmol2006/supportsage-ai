import type { Appointment, Doctor } from "@/lib/types";

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

function slotTimes(doctor: Doctor): string[] {
  const slots: string[] = [];
  const start = timeToMinutes(doctor.slotStart);
  const end = timeToMinutes(doctor.slotEnd);

  for (let minute = start; minute + doctor.slotMinutes <= end; minute += doctor.slotMinutes) {
    slots.push(minutesToTime(minute));
  }

  return slots;
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

    const slots = slotTimes(doctor).filter((time) => {
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
