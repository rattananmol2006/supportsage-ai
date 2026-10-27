"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  CalendarDays,
  CalendarCheck2,
  Clock,
  Stethoscope,
} from "lucide-react";

import {
  EmptyState,
  Pill,
  SectionCard,
  StatCard,
  appointmentStatusTone,
  formatShortDate,
} from "@/components/dashboard/ui";
import { formatReminderAt, isReminderUpcoming } from "@/lib/reminders";
import type { Appointment, CalendarDay, PublicDoctor } from "@/lib/types";

function weekdayShort(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function dayNumber(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function fullDay(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export function CalendarPanel({
  calendar,
  appointments,
  doctors,
}: {
  calendar: CalendarDay[];
  appointments: Appointment[];
  doctors: PublicDoctor[];
}) {
  const today = calendar.find((day) => day.isToday);
  const firstUpcoming =
    calendar.find((day) => !day.isPast && day.openSlots > 0)?.date ??
    today?.date ??
    calendar[0]?.date;

  const [selectedDate, setSelectedDate] = useState(firstUpcoming);
  const [doctorId, setDoctorId] = useState("all");

  const scopedDays = useMemo(
    () =>
      calendar.map((day) => {
        const rows =
          doctorId === "all"
            ? day.doctors
            : day.doctors.filter((row) => row.doctorId === doctorId);
        return {
          ...day,
          doctors: rows,
          openSlots: rows.reduce((sum, row) => sum + row.openSlots, 0),
          bookedSlots: rows.reduce((sum, row) => sum + row.bookedSlots, 0),
        };
      }),
    [calendar, doctorId],
  );

  const selected =
    scopedDays.find((day) => day.date === selectedDate) ?? scopedDays[0];

  const doctorMap = useMemo(
    () => new Map(doctors.map((doctor) => [doctor.id, doctor])),
    [doctors],
  );

  const dayAppointments = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.date === selected?.date &&
            (doctorId === "all" || appointment.doctorId === doctorId),
        )
        .sort((a, b) => a.time.localeCompare(b.time)),
    [appointments, doctorId, selected?.date],
  );

  const allReminders = useMemo(
    () =>
      appointments
        .filter(
          (appointment) =>
            appointment.status === "confirmed" &&
            isReminderUpcoming(appointment.reminderAt) &&
            (doctorId === "all" || appointment.doctorId === doctorId),
        )
        .sort((a, b) => a.reminderAt.localeCompare(b.reminderAt)),
    [appointments, doctorId],
  );
  const upcomingReminders = allReminders.slice(0, 4);

  const weekOpen = scopedDays
    .filter((day) => !day.isPast)
    .slice(0, 8)
    .reduce((sum, day) => sum + day.openSlots, 0);
  const todayOpen = today
    ? (doctorId === "all"
        ? today.openSlots
        : today.doctors.find((row) => row.doctorId === doctorId)?.openSlots ?? 0)
    : 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <StatCard
          label="Open today"
          value={todayOpen}
          detail="Bookable demo slots remaining today"
          icon={CalendarCheck2}
          tone="green"
        />
        <StatCard
          label="Next 8 days"
          value={weekOpen}
          detail="Open slots across upcoming days"
          icon={CalendarDays}
          tone="brand"
        />
        <StatCard
          label="Booked"
          value={appointments.filter((item) => item.status === "confirmed").length}
          detail="Confirmed appointments in the calendar"
          icon={Stethoscope}
          tone="blue"
        />
        <StatCard
          label="Reminders"
          value={allReminders.length}
          detail="Upcoming patient reminders"
          icon={BellRing}
          tone="amber"
        />
      </div>

      <SectionCard
        title="Availability calendar"
        description="A 35-day view of real Chandigarh doctor records: the last seven days for context, today, and the next four weeks. Booking windows are demo schedules; official clinic hours are not published in the ESIC list — call the clinic to confirm."
        action={
          <label className="inline-flex items-center gap-1.5 text-[9.5px] text-subtle">
            <Stethoscope className="size-3.5" />
            <span className="sr-only">Filter by doctor</span>
            <select
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              className="h-8 max-w-[220px] rounded-lg border border-line bg-white px-2 text-[10px] font-medium text-ink outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10"
            >
              <option value="all">All doctors</option>
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name} · {doctor.specialty}
                </option>
              ))}
            </select>
          </label>
        }
        contentClassName="space-y-4 p-4 sm:p-5"
      >
        <div>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-subtle">
              Last 7 days, today, next 4 weeks
            </p>
            <div className="flex items-center gap-2 text-[8.5px] text-subtle">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Open
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-brand" /> Booked
              </span>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-7">
            {scopedDays.map((day) => {
              const active = day.date === selected?.date;
              const available = day.openSlots > 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  aria-pressed={active}
                  aria-label={`${fullDay(day.date)}: ${day.openSlots} open, ${day.bookedSlots} booked`}
                  className={`relative rounded-lg border px-1.5 py-2 text-left transition-colors ${
                    active
                      ? "border-brand bg-brand/[0.06] ring-1 ring-brand/20"
                      : day.isToday
                        ? "border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50"
                        : day.isPast
                          ? "border-line/70 bg-canvas/50 hover:border-line"
                          : "border-line bg-white hover:border-brand/25 hover:bg-canvas/60"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[8px] font-semibold uppercase tracking-wide ${
                        day.isPast ? "text-subtle/60" : "text-subtle"
                      }`}
                    >
                      {weekdayShort(day.date)}
                    </span>
                    {day.isToday ? (
                      <span className="rounded-full bg-emerald-600 px-1 text-[7px] font-semibold uppercase tracking-wide text-white">
                        Today
                      </span>
                    ) : null}
                  </div>
                  <p
                    className={`text-[15px] font-semibold leading-5 ${
                      day.isPast ? "text-subtle/70" : "text-ink"
                    }`}
                  >
                    {dayNumber(day.date)}
                  </p>
                  <p
                    className={`mt-0.5 truncate text-[8px] font-medium ${
                      day.isPast
                        ? "text-subtle/60"
                        : available
                          ? "text-emerald-700"
                          : "text-subtle"
                    }`}
                  >
                    {day.isPast
                      ? `${day.bookedSlots} booked`
                      : available
                        ? `${day.openSlots} open`
                        : "Full / closed"}
                  </p>
                  {day.bookedSlots > 0 ? (
                    <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-brand/70"
                        style={{
                          width: `${Math.min(
                            100,
                            (day.bookedSlots /
                              Math.max(1, day.bookedSlots + day.openSlots)) *
                              100,
                          )}%`,
                        }}
                      />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {selected ? (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-line bg-canvas/40 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[11.5px] font-semibold text-ink">
                    {fullDay(selected.date)}
                    {selected.isToday ? " · Today" : ""}
                    {selected.isPast ? " · Past day" : ""}
                  </p>
                  <p className="text-[9.5px] text-subtle">
                    {selected.isPast
                      ? `${selected.bookedSlots} appointment${selected.bookedSlots === 1 ? "" : "s"} recorded`
                      : `${selected.openSlots} open · ${selected.bookedSlots} booked`}
                  </p>
                </div>
                <Pill tone={selected.isPast ? "gray" : selected.openSlots ? "green" : "amber"}>
                  {selected.isPast
                    ? "History"
                    : selected.openSlots
                      ? "Available"
                      : "No open slots"}
                </Pill>
              </div>

              <div className="mt-2.5 space-y-1.5">
                {selected.doctors.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line bg-white px-3 py-4 text-center text-[10px] text-subtle">
                    No doctor schedule on this day.
                  </p>
                ) : (
                  selected.doctors.map((row) => {
                    const doctor = doctorMap.get(row.doctorId);
                    return (
                      <div
                        key={row.doctorId}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10.5px] font-semibold text-ink">
                            {row.doctorName}
                          </p>
                          <p className="truncate text-[9px] text-subtle">
                            {row.specialty}
                            {doctor ? ` · ${doctor.clinic}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {row.openSlots > 0 && !selected.isPast ? (
                            <Pill tone="green">{row.openSlots} open</Pill>
                          ) : null}
                          {row.bookedSlots > 0 ? (
                            <Pill tone="brand">{row.bookedSlots} booked</Pill>
                          ) : null}
                          {row.openSlots === 0 && row.bookedSlots === 0 ? (
                            <Pill tone="gray">
                              {selected.isToday ? "No slots left" : "Off"}
                            </Pill>
                          ) : null}
                        </div>
                        {doctor ? (
                          <a
                            href={`tel:${doctor.phone.replace(/[^\d+]/g, "")}`}
                            className="text-[8.5px] font-medium text-brand hover:underline"
                          >
                            Call clinic
                          </a>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="rounded-xl border border-line bg-canvas/40 p-3">
              <p className="text-[11.5px] font-semibold text-ink">
                Appointments on this day
              </p>
              <p className="text-[9.5px] text-subtle">
                {dayAppointments.length
                  ? "Confirmed bookings and reminder schedule"
                  : "No appointments booked for this day."}
              </p>
              <div className="mt-2.5 space-y-1.5">
                {dayAppointments.length === 0 ? (
                  <EmptyState
                    icon={CalendarDays}
                    title="Nothing booked"
                    description="Ask Sage in Doctor mode to book a slot; it will appear here with its reminder."
                  />
                ) : (
                  dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="rounded-lg border border-line bg-white px-2.5 py-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <p className="text-[10.5px] font-semibold text-ink">
                          {appointment.time} · {appointment.doctorName}
                        </p>
                        <Pill tone={appointmentStatusTone(appointment.status)}>
                          {appointment.status}
                        </Pill>
                      </div>
                      <p className="mt-0.5 text-[9px] text-subtle">
                        {appointment.patientName} · {appointment.reference} ·{" "}
                        {formatShortDate(appointment.date)}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[8.5px] text-emerald-700">
                        <BellRing className="size-2.5" />
                        {formatReminderAt(
                          appointment.reminderAt,
                          appointment.timezone,
                        )}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-line bg-white p-3">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-ink">
            <BellRing className="size-3.5 text-brand" />
            Upcoming reminders
          </p>
          {upcomingReminders.length === 0 ? (
            <p className="mt-1 text-[10px] text-subtle">
              No upcoming reminders. Every new booking sets one automatically.
            </p>
          ) : (
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {upcomingReminders.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-line bg-canvas/50 px-2.5 py-2 text-[9.5px]"
                >
                  <Clock className="size-3 text-brand" />
                  <span className="font-medium text-ink">
                    {appointment.patientName}
                  </span>
                  <span className="text-subtle">
                    {formatReminderAt(
                      appointment.reminderAt,
                      appointment.timezone,
                    )}
                  </span>
                  <span className="ml-auto text-[8.5px] text-subtle">
                    {appointment.doctorName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
