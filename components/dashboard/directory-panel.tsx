"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  Clock,
  ExternalLink,
  FileText,
  Info,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Send,
  Siren,
  Stethoscope,
  Trash2,
  Video,
  X,
} from "lucide-react";

import {
  EmptyState,
  Pill,
  SectionCard,
  mapHref,
  phoneHref,
} from "@/components/dashboard/ui";
import { Input } from "@/components/ui/input";
import type { PublicDoctor } from "@/lib/types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type DoctorForm = {
  name: string;
  specialty: string;
  qualifications: string;
  clinic: string;
  address: string;
  city: string;
  phone: string;
  secondaryPhone: string;
  email: string;
  hours: string;
  fee: string;
  languages: string;
  slotStart: string;
  slotEnd: string;
  slotMinutes: string;
  telegramChatId: string;
  workingDays: number[];
  teleconsult: boolean;
  urgentCare: boolean;
};

const EMPTY_FORM: DoctorForm = {
  name: "",
  specialty: "",
  qualifications: "",
  clinic: "",
  address: "",
  city: "",
  phone: "",
  secondaryPhone: "",
  email: "",
  hours: "Mon–Sat, 9:00 AM – 5:00 PM",
  fee: "₹800 consultation",
  languages: "English",
  slotStart: "09:00",
  slotEnd: "17:00",
  slotMinutes: "30",
  telegramChatId: "",
  workingDays: [1, 2, 3, 4, 5],
  teleconsult: true,
  urgentCare: false,
};

const fieldClass =
  "h-9 rounded-lg border-line bg-white text-[11.5px] text-ink placeholder:text-subtle/70 focus-visible:border-brand/40 focus-visible:ring-brand/10";
const labelClass =
  "mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle";

function DoctorCard({
  doctor,
  onRemove,
  busy,
}: {
  doctor: PublicDoctor;
  onRemove: (doctor: PublicDoctor) => void;
  busy: boolean;
}) {
  return (
    <article className="flex flex-col rounded-xl border border-line bg-white p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold text-ink">
            {doctor.name}
            {doctor.sourceUrl ? (
              <Pill tone="green" icon={BadgeCheck}>
                ESIC list
              </Pill>
            ) : doctor.verified ? (
              <Pill tone="green" icon={BadgeCheck}>
                Clinic added
              </Pill>
            ) : (
              <Pill tone="amber">Demo record</Pill>
            )}
            {doctor.urgentCare ? (
              <Pill tone="red" icon={Siren}>
                Urgent
              </Pill>
            ) : null}
          </p>
          <p className="mt-0.5 text-[10.5px] text-subtle">
            {doctor.specialty} · {doctor.qualifications}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onRemove(doctor)}
          disabled={busy}
          aria-label={`Remove ${doctor.name}`}
          title="Remove doctor"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-line text-subtle transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
        >
          <Trash2 className="size-3" />
        </button>
      </div>

      <p className="mt-2 text-[10.5px] font-medium text-ink">{doctor.clinic}</p>
      <div className="mt-1 space-y-1 text-[10px] leading-4 text-subtle">
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3 shrink-0 text-brand/70" />
          <a
            href={mapHref(doctor.address)}
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand hover:underline"
          >
            {doctor.address}
          </a>
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <a
            href={phoneHref(doctor.phone)}
            className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
          >
            <Phone className="size-3" />
            {doctor.phone}
          </a>
          {doctor.secondaryPhone ? (
            <span className="inline-flex items-center gap-1">
              <Phone className="size-3" />
              {doctor.secondaryPhone}
            </span>
          ) : null}
          {doctor.email ? (
            <a
              href={`mailto:${doctor.email}`}
              className="inline-flex items-center gap-1 hover:text-brand hover:underline"
            >
              <Mail className="size-3" />
              {doctor.email}
            </a>
          ) : null}
        </p>
        <p className="flex items-start gap-1.5">
          <Clock className="mt-0.5 size-3 shrink-0" />
          <span>
            {doctor.hours} · {doctor.fee} · {doctor.languages}
          </span>
        </p>
      </div>

      {doctor.sourceUrl ? (
        <a
          href={doctor.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-line bg-canvas px-1.5 py-1 text-[8.5px] font-medium text-subtle transition-colors hover:border-brand/25 hover:text-brand"
        >
          <FileText className="size-2.5" />
          {doctor.sourceTitle ?? "ESIC source list"}
          <ExternalLink className="size-2.5" />
        </a>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line/70 pt-2">
        <span className="rounded-md border border-line bg-canvas px-1.5 py-0.5 text-[8.5px] text-subtle">
          {doctor.slotStart}–{doctor.slotEnd} · {doctor.slotMinutes} min
        </span>
        {doctor.workingDays.map((day) => (
          <span
            key={day}
            className="rounded-md border border-line bg-white px-1.5 py-0.5 text-[8.5px] font-medium text-subtle"
          >
            {DAYS[day]}
          </span>
        ))}
        {doctor.teleconsult ? (
          <span className="inline-flex items-center gap-1 text-[8.5px] font-medium text-emerald-700">
            <Video className="size-2.5" />
            Video
          </span>
        ) : null}
        {doctor.telegramConfigured ? (
          <span className="ml-auto text-[8.5px] font-medium text-emerald-700">
            Telegram route set
          </span>
        ) : (
          <span className="ml-auto text-[8.5px] text-subtle">
            Clinic alert route
          </span>
        )}
      </div>

      <p className="mt-2 font-mono text-[8.5px] text-subtle/80">
        {doctor.id}
      </p>
    </article>
  );
}

export function DirectoryPanel({
  doctors,
  onRefresh,
  notify,
}: {
  doctors: PublicDoctor[];
  onRefresh: () => Promise<void>;
  notify: (tone: "success" | "error", message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<DoctorForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return doctors.filter((doctor) => {
      if (urgentOnly && !doctor.urgentCare) return false;
      if (!query) return true;
      return `${doctor.name} ${doctor.specialty} ${doctor.clinic} ${doctor.city} ${doctor.address} ${doctor.languages} ${doctor.sourceTitle ?? ""}`
        .toLowerCase()
        .includes(query);
    });
  }, [doctors, search, urgentOnly]);

  const update = <Key extends keyof DoctorForm>(
    key: Key,
    value: DoctorForm[Key],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleDay = (day: number) => {
    setForm((current) => ({
      ...current,
      workingDays: current.workingDays.includes(day)
        ? current.workingDays.filter((item) => item !== day)
        : [...current.workingDays, day].sort(),
    }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          secondaryPhone: form.secondaryPhone || undefined,
          telegramChatId: form.telegramChatId || undefined,
          slotMinutes: Number(form.slotMinutes),
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        doctor?: PublicDoctor;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not add the doctor.");
      }
      notify(
        "success",
        `${data?.doctor?.name ?? form.name} is now in the live directory. New chats can find and book this doctor.`,
      );
      setForm(EMPTY_FORM);
      setShowForm(false);
      await onRefresh();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not add the doctor.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (doctor: PublicDoctor) => {
    if (
      !window.confirm(
        `Remove ${doctor.name} from the live directory? Existing appointments and transcripts are kept.`,
      )
    ) {
      return;
    }
    setBusyId(doctor.id);
    try {
      const response = await fetch(`/api/doctors/${doctor.id}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Could not remove the doctor.");
      }
      notify("success", `${doctor.name} removed from the directory.`);
      await onRefresh();
    } catch (error) {
      notify(
        "error",
        error instanceof Error ? error.message : "Could not remove the doctor.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-3">
      <SectionCard
        title={`Chandigarh doctor directory (${doctors.length})`}
        description="The same live directory Sage searches and books against in Doctor mode. Records marked ESIC list are transcribed from the ESIC authorised medical attendants list for Chandigarh, effective 01-06-2023 to 31-05-2024."
        action={
          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
              showForm
                ? "border border-line bg-white text-subtle hover:bg-canvas"
                : "bg-brand text-white hover:bg-brand-deep"
            }`}
          >
            {showForm ? <X className="size-3" /> : <Plus className="size-3" />}
            {showForm ? "Close form" : "Add doctor"}
          </button>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, specialty, clinic, sector…"
              aria-label="Search doctors"
              className="h-9 w-full rounded-lg border border-line bg-canvas pl-8 pr-3 text-[11.5px] text-ink outline-none placeholder:text-subtle/80 focus:border-brand/35 focus:ring-2 focus:ring-brand/10"
            />
          </div>
          <button
            type="button"
            onClick={() => setUrgentOnly((current) => !current)}
            aria-pressed={urgentOnly}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[10px] font-medium transition-colors ${
              urgentOnly
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-line bg-white text-subtle hover:text-ink"
            }`}
          >
            <Siren className="size-3" />
            Urgent care
          </button>
          <p className="ml-auto text-[9.5px] text-subtle">
            {filtered.length} of {doctors.length} visible
          </p>
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-2 text-[9.5px] leading-4 text-sky-900">
          <Info className="mt-0.5 size-3 shrink-0" />
          <div>
            <p>
              Source: ESIC AMA list for Chandigarh, effective 01-06-2023 to
              31-05-2024. Names, qualifications, addresses, phones, and
              specialties are transcribed as published. The list has no
              consultation hours, fees, or languages, so those fields say “call
              clinic to confirm”. Booking windows shown here are demo
              schedules, not official clinic timings.
            </p>
            <a
              href="https://ropunjab.esic.gov.in/attachments/sstfile/0ac6a4939ae0bc729ff1df95d1c84f42.pdf"
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-semibold text-sky-800 hover:underline"
            >
              <FileText className="size-3" />
              Open the official ESIC Chandigarh list (PDF)
              <ExternalLink className="size-2.5" />
            </a>
          </div>
        </div>

        {showForm ? (
          <form
            onSubmit={(event) => void submit(event)}
            className="mt-4 rounded-xl border border-brand/15 bg-brand/[0.025] p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-semibold text-ink">
                  Add a doctor to the live directory
                </p>
                <p className="mt-0.5 text-[9.5px] text-subtle">
                  New records are marked verified and are immediately available
                  to the RAG agent.
                </p>
              </div>
              <Stethoscope className="size-4 shrink-0 text-brand/60" />
            </div>

            <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <label>
                <span className={labelClass}>Full name *</span>
                <Input
                  value={form.name}
                  onChange={(event) => update("name", event.target.value)}
                  placeholder="Dr. Manu Sharma"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Specialty *</span>
                <Input
                  value={form.specialty}
                  onChange={(event) => update("specialty", event.target.value)}
                  placeholder="General Medicine"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Qualifications</span>
                <Input
                  value={form.qualifications}
                  onChange={(event) =>
                    update("qualifications", event.target.value)
                  }
                  placeholder="MBBS, MD"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Clinic *</span>
                <Input
                  value={form.clinic}
                  onChange={(event) => update("clinic", event.target.value)}
                  placeholder="Chandigarh Clinic"
                  required
                  className={fieldClass}
                />
              </label>
              <label className="sm:col-span-2">
                <span className={labelClass}>Full address *</span>
                <Input
                  value={form.address}
                  onChange={(event) => update("address", event.target.value)}
                  placeholder="Sector 22, Chandigarh 160022"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>City *</span>
                <Input
                  value={form.city}
                  onChange={(event) => update("city", event.target.value)}
                  placeholder="Chandigarh"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Phone *</span>
                <Input
                  value={form.phone}
                  onChange={(event) => update("phone", event.target.value)}
                  placeholder="+91 172 000 0000"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Secondary phone</span>
                <Input
                  value={form.secondaryPhone}
                  onChange={(event) =>
                    update("secondaryPhone", event.target.value)
                  }
                  placeholder="+91 172 000 0001"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Email (optional)</span>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => update("email", event.target.value)}
                  placeholder="Leave blank if the clinic has no email"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Hours *</span>
                <Input
                  value={form.hours}
                  onChange={(event) => update("hours", event.target.value)}
                  placeholder="Mon–Sat, 9:00 AM – 5:00 PM"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Consultation fee *</span>
                <Input
                  value={form.fee}
                  onChange={(event) => update("fee", event.target.value)}
                  placeholder="₹800 consultation"
                  required
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Languages</span>
                <Input
                  value={form.languages}
                  onChange={(event) => update("languages", event.target.value)}
                  placeholder="English, Hindi"
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Slot start</span>
                <Input
                  type="time"
                  value={form.slotStart}
                  onChange={(event) => update("slotStart", event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Slot end</span>
                <Input
                  type="time"
                  value={form.slotEnd}
                  onChange={(event) => update("slotEnd", event.target.value)}
                  className={fieldClass}
                />
              </label>
              <label>
                <span className={labelClass}>Slot minutes</span>
                <Input
                  type="number"
                  min={10}
                  max={120}
                  step={5}
                  value={form.slotMinutes}
                  onChange={(event) =>
                    update("slotMinutes", event.target.value)
                  }
                  className={fieldClass}
                />
              </label>
              <label className="sm:col-span-2 lg:col-span-3">
                <span className={labelClass}>
                  Doctor Telegram chat ID (optional)
                </span>
                <Input
                  value={form.telegramChatId}
                  onChange={(event) =>
                    update("telegramChatId", event.target.value)
                  }
                  placeholder="Direct appointment and escalation alerts for this doctor"
                  className={fieldClass}
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap items-center gap-1">
                <span className="mr-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-subtle">
                  Working days
                </span>
                {DAYS.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(index)}
                    aria-pressed={form.workingDays.includes(index)}
                    className={`rounded-md border px-2 py-1 text-[9px] font-medium transition-colors ${
                      form.workingDays.includes(index)
                        ? "border-brand/25 bg-brand/[0.08] text-brand"
                        : "border-line bg-white text-subtle hover:text-ink"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              <label className="inline-flex items-center gap-1.5 text-[10px] text-subtle">
                <input
                  type="checkbox"
                  checked={form.teleconsult}
                  onChange={(event) =>
                    update("teleconsult", event.target.checked)
                  }
                  className="size-3.5 accent-[#4a1c3a]"
                />
                Video visits
              </label>
              <label className="inline-flex items-center gap-1.5 text-[10px] text-subtle">
                <input
                  type="checkbox"
                  checked={form.urgentCare}
                  onChange={(event) =>
                    update("urgentCare", event.target.checked)
                  }
                  className="size-3.5 accent-[#4a1c3a]"
                />
                Urgent care
              </label>
            </div>

            {formError ? (
              <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] text-red-700">
                {formError}
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
                className="rounded-lg border border-line bg-white px-3 py-1.5 text-[10px] font-medium text-subtle hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-brand-deep disabled:opacity-50"
              >
                <Send className="size-3" />
                {saving ? "Adding…" : "Add to directory"}
              </button>
            </div>
          </form>
        ) : null}

        {filtered.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              icon={Stethoscope}
              title="No doctors match"
              description="Try a different search or add a new record to the live directory."
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                onRemove={(item) => void remove(item)}
                busy={busyId === doctor.id}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
