"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarPlus,
  Clock,
  Download,
  ExternalLink,
  MapPin,
  Phone,
  Stethoscope,
} from "lucide-react";

import {
  EmptyState,
  Pill,
  SectionCard,
  appointmentStatusTone,
  formatMonthDay,
  formatShortDate,
  notificationTone,
  phoneHref,
} from "@/components/dashboard/ui";
import type { Appointment } from "@/lib/types";

type Filter = "all" | "confirmed" | "completed" | "cancelled";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "confirmed", label: "Confirmed" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
];

function notificationLabel(status: Appointment["notificationStatus"]) {
  if (status === "sent") return "Clinic alerted";
  if (status === "failed") return "Alert failed";
  return "Alert queued";
}

export function AppointmentsPanel({
  appointments,
  onRefresh,
  notify,
}: {
  appointments: Appointment[];
  onRefresh: () => Promise<void>;
  notify: (tone: "success" | "error", message: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return appointments;
    return appointments.filter(
      (appointment) => appointment.status === filter,
    );
  }, [appointments, filter]);

  const updateStatus = async (id: string, status: Appointment["status"]) => {
    setBusyId(id);
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not update the appointment.");
      }
      notify("success", `Appointment marked ${status}.`);
      await onRefresh();
    } catch (error) {
      notify(
        "error",
        error instanceof Error
          ? error.message
          : "Could not update the appointment.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SectionCard
      title="Appointments"
      description="Bookings created by Sage, with live clinic notification status and calendar handoff. Calendar buttons open a prefilled Google Calendar event; .ics files work in Apple, Outlook, and Google Calendar."
      action={
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              aria-pressed={filter === option.id}
              className={`rounded-md px-2 py-1 text-[9.5px] font-medium transition-colors ${
                filter === option.id
                  ? "bg-brand text-white"
                  : "text-subtle hover:bg-canvas hover:text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
      contentClassName={filtered.length === 0 ? "p-4 sm:p-5" : "space-y-2.5 p-4 sm:p-5"}
    >
      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments in this view"
          description="Ask Sage in Doctor mode to find a doctor and book a live slot. Confirmed bookings appear here instantly."
        />
      ) : (
        filtered.map((appointment) => {
          const date = formatMonthDay(appointment.date);
          const busy = busyId === appointment.id;
          return (
            <article
              key={appointment.id}
              className={`rounded-xl border border-line bg-white p-3 ${
                appointment.status === "cancelled" ? "opacity-65" : ""
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="flex shrink-0 items-center gap-2.5 sm:w-16 sm:flex-col sm:gap-0">
                  <div className="flex size-12 flex-col items-center justify-center rounded-lg border border-line bg-canvas">
                    <span className="text-[8px] font-semibold uppercase tracking-wide text-subtle">
                      {date.month}
                    </span>
                    <span className="text-[16px] font-semibold leading-5 text-ink">
                      {date.day}
                    </span>
                  </div>
                  <p className="text-[10px] font-medium text-subtle sm:mt-1">
                    {appointment.time}
                  </p>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-ink">
                        <Stethoscope className="size-3.5 text-brand" />
                        {appointment.doctorName}
                        <Pill tone={appointmentStatusTone(appointment.status)}>
                          {appointment.status}
                        </Pill>
                        <Pill
                          tone={notificationTone(appointment.notificationStatus)}
                        >
                          {notificationLabel(appointment.notificationStatus)}
                        </Pill>
                      </p>
                      <p className="mt-0.5 text-[10.5px] text-subtle">
                        {appointment.doctorSpecialty} · {appointment.clinic} ·{" "}
                        <span className="font-mono">{appointment.reference}</span>
                      </p>
                    </div>
                    <select
                      value={appointment.status}
                      disabled={busy}
                      onChange={(event) =>
                        void updateStatus(
                          appointment.id,
                          event.target.value as Appointment["status"],
                        )
                      }
                      aria-label={`Status for ${appointment.reference}`}
                      className="h-8 rounded-lg border border-line bg-white px-2 text-[10px] font-medium text-ink outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 disabled:opacity-50"
                    >
                      <option value="confirmed">Confirmed</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  <div className="mt-2 grid gap-1 text-[10px] leading-4 text-subtle sm:grid-cols-2">
                    <p className="flex items-start gap-1.5">
                      <Clock className="mt-0.5 size-3 shrink-0" />
                      {formatShortDate(appointment.date)} at {appointment.time} ·{" "}
                      {appointment.durationMinutes} min
                    </p>
                    <p className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 size-3 shrink-0" />
                      {appointment.location}
                    </p>
                    <p className="flex items-start gap-1.5">
                      <Phone className="mt-0.5 size-3 shrink-0" />
                      {appointment.patientName} ·{" "}
                      <a
                        href={phoneHref(appointment.phone)}
                        className="hover:text-brand hover:underline"
                      >
                        {appointment.phone}
                      </a>
                    </p>
                    <p className="line-clamp-1">Reason: {appointment.reason}</p>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <a
                      href={appointment.calendarUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-brand px-2 py-1.5 text-[9.5px] font-medium text-white transition-colors hover:bg-brand-deep"
                    >
                      <CalendarPlus className="size-3" />
                      Google Calendar
                    </a>
                    <a
                      href={appointment.icsUrl}
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1.5 text-[9.5px] font-medium text-ink transition-colors hover:bg-canvas"
                    >
                      <Download className="size-3" />
                      Download .ics
                    </a>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        appointment.location,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1.5 text-[9.5px] font-medium text-ink transition-colors hover:bg-canvas"
                    >
                      <ExternalLink className="size-3" />
                      Map
                    </a>
                    <span className="ml-auto self-center text-[9px] text-subtle">
                      Booked {new Date(appointment.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })
      )}
    </SectionCard>
  );
}
