"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  RotateCcw,
  Send,
  ShieldAlert,
  Siren,
  Sparkles,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  chatModes,
  DEFAULT_CHAT_MODE,
  getChatMode,
  type ChatMode,
} from "@/lib/chat-modes";
import type {
  Appointment,
  ChatResponse,
  Conversation,
  DoctorResult,
  EmergencyContact,
  Escalation,
  Notification,
  Order,
  ScheduleSlot,
  SourceRef,
} from "@/lib/types";

type WidgetMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  error?: boolean;
  sources?: SourceRef[];
  tools?: string[];
  doctors?: DoctorResult[];
  appointment?: Appointment;
  escalation?: Escalation;
  order?: Order;
  emergencyContacts?: EmergencyContact[];
  notificationStatus?: Notification["status"];
  urgent?: boolean;
  urgencyLevel?: "emergency" | "urgent" | null;
};

type ModeSession = {
  conversationId?: string;
  messages: WidgetMessage[];
};

type Sessions = Record<ChatMode, ModeSession>;

const TOOL_LABELS: Record<string, string> = {
  search_doctors: "Doctor search",
  get_doctor_schedule: "Live schedule",
  book_appointment: "Booking",
  escalate_case: "Escalation",
  lookup_order: "Order lookup",
};

function greetingMessage(mode: ChatMode): WidgetMessage {
  return {
    id: `welcome-${mode}`,
    role: "assistant",
    content: getChatMode(mode).greeting,
  };
}

function createSessions(): Sessions {
  return chatModes.reduce((current, mode) => {
    current[mode.id] = { messages: [greetingMessage(mode.id)] };
    return current;
  }, {} as Sessions);
}

function storageKey(mode: ChatMode) {
  return `supportsage.conversation.${mode}`;
}

function formatAssistantText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?;:]|$)/g, "$1$2")
    .replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?;:]|$)/g, "$1$2")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(parsed);
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function mapHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function statusLabel(status: Notification["status"] | undefined) {
  if (status === "sent") return "Telegram sent";
  if (status === "failed") return "Telegram failed";
  if (status === "queued") return "Telegram queued";
  return "";
}

function statusClass(status: Notification["status"] | undefined) {
  if (status === "sent") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "failed") return "bg-red-50 text-red-700 border-red-200";
  return "bg-amber-50 text-amber-800 border-amber-200";
}

function fromStored(message: {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: SourceRef[];
  tools?: string[];
  doctors?: DoctorResult[];
  appointment?: Appointment;
  escalation?: Escalation;
  order?: Order;
  emergencyContacts?: EmergencyContact[];
  notificationStatus?: Notification["status"];
  urgent?: boolean;
  urgencyLevel?: "emergency" | "urgent" | null;
}): WidgetMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sources: message.sources,
    tools: message.tools,
    doctors: message.doctors,
    appointment: message.appointment,
    escalation: message.escalation,
    order: message.order,
    emergencyContacts: message.emergencyContacts,
    notificationStatus: message.notificationStatus,
    urgent: message.urgent,
    urgencyLevel: message.urgencyLevel,
  };
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-subtle">
      {children}
    </p>
  );
}

function DoctorCardView({
  doctor,
  onBook,
}: {
  doctor: DoctorResult;
  onBook: (doctor: DoctorResult, slot: ScheduleSlot) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-semibold leading-4 text-ink">
            {doctor.name}
            {doctor.verified ? (
              <span className="inline-flex items-center gap-0.5 rounded-full border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-emerald-700">
                <BadgeCheck className="size-2.5" />
                Verified
              </span>
            ) : (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-amber-700">
                Demo record
              </span>
            )}
          </p>
          <p className="mt-0.5 text-[10.5px] leading-4 text-subtle">
            {doctor.specialty} · {doctor.qualifications}
          </p>
        </div>
        {doctor.urgentCare ? (
          <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-red-700">
            Urgent care
          </span>
        ) : null}
      </div>

      <div className="mt-2 space-y-1 text-[10.5px] leading-4 text-subtle">
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3 shrink-0 text-brand/70" />
          <a
            href={mapHref(doctor.address)}
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand hover:underline"
          >
            {doctor.clinic} · {doctor.address}
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
          <a
            href={`mailto:${doctor.email}`}
            className="inline-flex items-center gap-1 break-all hover:text-brand hover:underline"
          >
            <Mail className="size-3" />
            {doctor.email}
          </a>
        </p>
        <p className="flex items-center gap-1.5">
          <Clock className="size-3 shrink-0" />
          {doctor.hours}
        </p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{doctor.fee}</span>
          <span>{doctor.languages}</span>
          {doctor.teleconsult ? (
            <span className="inline-flex items-center gap-1 text-emerald-700">
              <Video className="size-3" /> Video visits
            </span>
          ) : null}
        </p>
      </div>

      <div className="mt-2.5 border-t border-line/80 pt-2">
        <SectionLabel>Next available</SectionLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {doctor.nextSlots?.length ? (
            doctor.nextSlots.slice(0, 4).map((slot) => (
              <button
                key={`${slot.date}-${slot.time}`}
                type="button"
                onClick={() => onBook(doctor, slot)}
                className="rounded-md border border-brand/20 bg-brand/[0.04] px-2 py-1 text-[9.5px] font-medium text-brand transition-colors hover:border-brand/40 hover:bg-brand/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
              >
                {formatDate(slot.date)} · {slot.time}
              </button>
            ))
          ) : (
            <span className="text-[10px] text-subtle">
              Call the clinic for same-day availability.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function AppointmentCardView({ appointment }: { appointment: Appointment }) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
            <CheckCircle2 className="size-3.5" />
            Appointment confirmed
          </p>
          <p className="mt-0.5 text-[10px] font-medium tracking-wide text-emerald-800">
            {appointment.reference}
          </p>
        </div>
        <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-medium ${statusClass(appointment.notificationStatus)}`}>
          {statusLabel(appointment.notificationStatus)}
        </span>
      </div>

      <div className="mt-2 space-y-1 text-[10.5px] leading-4 text-emerald-950/80">
        <p className="font-medium text-emerald-950">
          {appointment.doctorName} · {appointment.doctorSpecialty}
        </p>
        <p className="flex items-center gap-1.5">
          <CalendarDays className="size-3" />
          {formatDate(appointment.date)} at {appointment.time} ·{" "}
          {appointment.durationMinutes} min
        </p>
        <p className="flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3 shrink-0" />
          {appointment.location}
        </p>
        <p>Patient: {appointment.patientName} · {appointment.phone}</p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <a
          href={appointment.calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1.5 text-[9.5px] font-medium text-white transition-colors hover:bg-emerald-800"
        >
          <ExternalLink className="size-3" />
          Add to Google Calendar
        </a>
        <a
          href={appointment.icsUrl}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1.5 text-[9.5px] font-medium text-emerald-800 transition-colors hover:bg-emerald-50"
        >
          <Download className="size-3" />
          Download .ics
        </a>
      </div>
    </div>
  );
}

function OrderCardView({ order }: { order: Order }) {
  const duplicate = order.duplicateCharge;
  return (
    <div className="rounded-xl border border-line bg-canvas/70 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <BadgeCheck className="size-3.5 text-brand" />
            Order verified
          </p>
          <p className="mt-0.5 font-mono text-[10px] font-medium tracking-wide text-subtle">
            #{order.id}
          </p>
        </div>
        <span
          className={`rounded-full border px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide ${
            duplicate
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {order.status}
        </span>
      </div>
      <div className="mt-2 space-y-1 text-[10.5px] leading-4 text-subtle">
        <p className="font-medium text-ink">
          {order.customer} · {order.currency} {order.amount}
        </p>
        <p>{order.items}</p>
        <p>{order.notes}</p>
      </div>
    </div>
  );
}

function EscalationCardView({ escalation }: { escalation: Escalation }) {
  const urgent = escalation.priority === "high";
  return (
    <div
      className={`rounded-xl border p-3 ${
        urgent
          ? "border-red-200 bg-red-50/70"
          : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p
          className={`flex items-center gap-1.5 text-[11px] font-semibold ${
            urgent ? "text-red-900" : "text-amber-900"
          }`}
        >
          <ShieldAlert className="size-3.5" />
          {escalation.type === "emergency"
            ? "Emergency case opened"
            : escalation.priority === "high"
              ? "Urgent case opened"
              : "Support case opened"}
        </p>
        <span className="rounded-full border border-current/20 bg-white/70 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide">
          {escalation.priority}
        </span>
      </div>
      <p className="mt-1 font-mono text-[10px] font-medium tracking-wide text-ink">
        {escalation.reference}
      </p>
      <p className="mt-1 text-[10.5px] leading-4 text-subtle">
        {escalation.subject}
        {escalation.doctorName ? ` · Routed to ${escalation.doctorName}` : ""}
      </p>
      <p className="mt-1 text-[9.5px] font-medium uppercase tracking-wide text-subtle">
        Status: {escalation.status}
      </p>
    </div>
  );
}

function UrgentBanner({
  message,
  mode,
}: {
  message: WidgetMessage;
  mode: ChatMode;
}) {
  if (!message.urgent) return null;
  const emergency = message.urgencyLevel === "emergency";
  const contacts = message.emergencyContacts ?? [];
  const telegram = statusLabel(message.notificationStatus);

  return (
    <div
      className={`mb-2.5 rounded-lg border p-2.5 ${
        emergency
          ? "border-red-200 bg-red-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <p
        className={`flex items-center gap-1.5 text-[10.5px] font-semibold ${
          emergency ? "text-red-900" : "text-amber-900"
        }`}
      >
        <Siren className="size-3.5" />
        {mode === "doctor"
          ? emergency
            ? "Emergency — get help now"
            : "Urgent — same-day review recommended"
          : emergency
            ? "Priority incident — owner follow-up needed"
            : "Priority customer issue — owner follow-up recommended"}
      </p>
      {mode === "doctor" ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {contacts.map((contact) => (
            <a
              key={contact.label}
              href={contact.href}
              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[9.5px] font-medium text-red-800 hover:bg-red-100"
            >
              <Phone className="size-3" />
              {contact.label}: {contact.value}
            </a>
          ))}
        </div>
      ) : null}
      {message.escalation ? (
        <p className="mt-1.5 text-[9.5px] text-amber-900/80">
          Case {message.escalation.reference} · {telegram || "Owner alert logged"}
        </p>
      ) : telegram ? (
        <p className="mt-1.5 text-[9.5px] text-amber-900/80">{telegram}</p>
      ) : null}
    </div>
  );
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<ChatMode>(DEFAULT_CHAT_MODE);
  const [sessions, setSessions] = useState<Sessions>(createSessions);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const modeConfig = getChatMode(activeMode);
  const ModeIcon = modeConfig.icon;
  const session = sessions[activeMode];
  const messages = session.messages;

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const next = createSessions();
      await Promise.all(
        chatModes.map(async (mode) => {
          const id = window.localStorage.getItem(storageKey(mode.id));
          if (!id) return;
          try {
            const response = await fetch(
              `/api/conversations/${encodeURIComponent(id)}`,
            );
            if (!response.ok) {
              window.localStorage.removeItem(storageKey(mode.id));
              return;
            }
            const data = (await response.json()) as {
              conversation?: Conversation;
            };
            if (!data.conversation) return;
            if (cancelled) return;
            next[mode.id] = {
              conversationId: data.conversation.id,
              messages: data.conversation.messages.map(fromStored),
            };
          } catch {
            // Keep the local greeting if history cannot be restored.
          }
        }),
      );
      if (!cancelled) {
        setSessions(next);
        setRestoring(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [open, activeMode, sessions, isLoading]);

  const switchMode = (mode: ChatMode) => {
    if (isLoading || mode === activeMode) return;
    setActiveMode(mode);
    setInput("");
  };

  const resetConversation = () => {
    if (isLoading) return;
    window.localStorage.removeItem(storageKey(activeMode));
    setSessions((current) => ({
      ...current,
      [activeMode]: { messages: [greetingMessage(activeMode)] },
    }));
    setInput("");
    inputRef.current?.focus();
  };

  const handleBookSlot = (doctor: DoctorResult, slot: ScheduleSlot) => {
    setInput(
      `Book an appointment with ${doctor.name} on ${slot.date} at ${slot.time}.`,
    );
    inputRef.current?.focus();
  };

  const sendMessage = async (override?: string) => {
    const content = (override ?? input).trim();
    if (!content || isLoading || restoring) return;

    const modeAtSend = activeMode;
    const sessionAtSend = sessions[modeAtSend];
    const conversationId = sessionAtSend.conversationId;
    const userMessage: WidgetMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setSessions((current) => ({
      ...current,
      [modeAtSend]: {
        ...current[modeAtSend],
        messages: [...current[modeAtSend].messages, userMessage],
      },
    }));
    setInput("");
    setIsLoading(true);

    let failure =
      "I couldn't complete that response. Please try again in a moment.";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: modeAtSend,
          message: content,
          conversationId,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | (Partial<ChatResponse> & { error?: string })
        | null;

      if (!response.ok || !data?.reply) {
        failure = data?.error || failure;
        const recoveredId = data?.conversationId;
        if (recoveredId) {
          window.localStorage.setItem(storageKey(modeAtSend), recoveredId);
          setSessions((current) => ({
            ...current,
            [modeAtSend]: {
              ...current[modeAtSend],
              conversationId: recoveredId,
            },
          }));
        }
        throw new Error("chat_request_failed");
      }

      const assistantMessage: WidgetMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        sources: data.sources,
        tools: data.tools,
        doctors: data.doctors,
        appointment: data.appointment,
        escalation: data.escalation,
        order: data.order,
        emergencyContacts: data.emergencyContacts,
        notificationStatus: data.notificationStatus,
        urgent: data.urgent,
        urgencyLevel: data.urgencyLevel,
      };

      if (data.conversationId) {
        window.localStorage.setItem(
          storageKey(modeAtSend),
          data.conversationId,
        );
      }

      setSessions((current) => ({
        ...current,
        [modeAtSend]: {
          conversationId: data.conversationId ?? current[modeAtSend].conversationId,
          messages: [...current[modeAtSend].messages, assistantMessage],
        },
      }));
    } catch {
      setSessions((current) => ({
        ...current,
        [modeAtSend]: {
          ...current[modeAtSend],
          messages: [
            ...current[modeAtSend].messages,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: failure,
              error: true,
            },
          ],
        },
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const startEmergency = () => {
    if (activeMode === "doctor") {
      void sendMessage(
        "This is a medical emergency. I need urgent help now. Please escalate and give me the nearest urgent-care doctor.",
      );
    } else {
      void sendMessage(
        "This is an urgent incident. Please escalate it to the owner now and open a tracked case.",
      );
    }
  };

  return (
    <>
      {open ? (
        <div
          id="support-chat"
          role="dialog"
          aria-labelledby="support-chat-title"
          className="fixed bottom-[5.75rem] right-4 z-50 flex h-[min(680px,calc(100dvh-7.5rem))] w-[calc(100vw-2rem)] max-w-[410px] animate-in flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_30px_80px_-24px_rgba(26,26,26,0.4)] fade-in-0 slide-in-from-bottom-3 duration-200 sm:bottom-24 sm:right-6"
        >
          <div className="shrink-0 border-b border-line px-4 pb-3 pt-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-white">
                  <Sparkles className="size-4" strokeWidth={1.9} />
                </span>
                <div className="min-w-0">
                  <p
                    id="support-chat-title"
                    className="truncate text-[13px] font-semibold text-ink"
                  >
                    SupportSage AI
                  </p>
                  <p className="flex items-center gap-1.5 text-[9.5px] font-medium uppercase tracking-[0.12em] text-subtle">
                    <span
                      className="size-1.5 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    RAG · Tools · Telegram
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <a
                  href="/dashboard"
                  aria-label="Open owner dashboard"
                  title="Owner dashboard"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-gray-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                >
                  <LayoutDashboard className="size-3.5" />
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={resetConversation}
                  disabled={isLoading || restoring}
                  aria-label={`Start a new ${modeConfig.label} chat`}
                  title="New chat"
                  className="size-8 rounded-lg text-subtle hover:bg-gray-100 hover:text-ink disabled:opacity-40"
                >
                  <RotateCcw className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="size-8 rounded-lg text-subtle hover:bg-gray-100 hover:text-ink"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div
              role="group"
              aria-label="Chat mode"
              className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-canvas p-1"
            >
              {chatModes.map((mode) => {
                const Icon = mode.icon;
                const isActive = mode.id === activeMode;

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => switchMode(mode.id)}
                    aria-pressed={isActive}
                    disabled={isLoading}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isActive
                        ? "bg-white text-brand shadow-[0_1px_3px_rgba(16,24,40,0.08)] ring-1 ring-line"
                        : "text-subtle hover:text-ink"
                    }`}
                  >
                    <Icon className="size-3.5" strokeWidth={1.8} />
                    {mode.label}
                  </button>
                );
              })}
            </div>

            <p className="mt-2 text-[10px] leading-4 text-subtle">
              {modeConfig.description}
            </p>

            <div className="mt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={startEmergency}
                disabled={isLoading || restoring}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[9.5px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <Siren className="size-3" />
                {activeMode === "doctor" ? "Emergency help" : "Priority incident"}
              </button>
              <span className="text-[8.5px] uppercase tracking-[0.1em] text-subtle">
                {restoring ? "Loading history…" : "Persisted to dashboard"}
              </span>
            </div>
          </div>

          <div
            ref={scrollRef}
            role="log"
            aria-label={`${modeConfig.label} chat messages`}
            aria-live="polite"
            className="flex-1 space-y-3 overflow-y-auto bg-canvas px-4 py-4"
          >
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-brand px-3.5 py-2.5 text-[12.5px] leading-5 text-white shadow-[0_4px_12px_-8px_rgba(74,28,58,0.8)]">
                    {message.content}
                  </div>
                </div>
              ) : (
                <div key={message.id} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand/[0.07] text-brand ring-1 ring-inset ring-brand/10">
                    <ModeIcon className="size-3.5" strokeWidth={1.8} />
                  </span>
                  <div
                    className={`max-w-[88%] min-w-0 rounded-2xl rounded-tl-md border px-3.5 py-2.5 text-[12.5px] leading-5 ${
                      message.error
                        ? "border-amber-200 bg-amber-50 text-amber-900"
                        : "border-line bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                    }`}
                  >
                    {message.error ? (
                      <span className="flex items-start gap-1.5">
                        <AlertCircle
                          className="mt-0.5 size-3.5 shrink-0"
                          strokeWidth={1.9}
                        />
                        <span>{message.content}</span>
                      </span>
                    ) : (
                      <>
                        <UrgentBanner message={message} mode={activeMode} />
                        <div className="whitespace-pre-wrap">
                          {formatAssistantText(message.content)}
                        </div>

                        {message.doctors?.length ? (
                          <div className="mt-3 space-y-2">
                            <SectionLabel>Live doctor records</SectionLabel>
                            {message.doctors.map((doctor) => (
                              <DoctorCardView
                                key={doctor.id}
                                doctor={doctor}
                                onBook={handleBookSlot}
                              />
                            ))}
                          </div>
                        ) : null}

                        {message.appointment ? (
                          <div className="mt-3">
                            <AppointmentCardView appointment={message.appointment} />
                          </div>
                        ) : null}

                        {message.order ? (
                          <div className="mt-3">
                            <OrderCardView order={message.order} />
                          </div>
                        ) : null}

                        {message.escalation ? (
                          <div className="mt-3">
                            <EscalationCardView escalation={message.escalation} />
                          </div>
                        ) : null}

                        {message.sources?.length ? (
                          <details className="mt-3 border-t border-line/70 pt-2">
                            <summary className="cursor-pointer text-[9px] font-semibold uppercase tracking-[0.14em] text-subtle">
                              Grounded in {message.sources.length} source
                              {message.sources.length === 1 ? "" : "s"}
                            </summary>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {message.sources.map((source) => (
                                <span
                                  key={source.id}
                                  className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[8.5px] text-subtle"
                                >
                                  {source.title}
                                </span>
                              ))}
                            </div>
                          </details>
                        ) : null}

                        {message.tools?.length ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-subtle">
                              Actions
                            </span>
                            {message.tools.map((tool) => (
                              <span
                                key={tool}
                                className="rounded-full bg-brand/[0.06] px-2 py-0.5 text-[8.5px] font-medium text-brand"
                              >
                                {TOOL_LABELS[tool] ?? tool}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>
                </div>
              ),
            )}

            {messages.length === 1 && !isLoading && !restoring ? (
              <div className="pl-[34px]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-subtle">
                  Try asking
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {modeConfig.suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-full border border-line bg-white px-2.5 py-1.5 text-left text-[10.5px] text-subtle transition-colors hover:border-brand/25 hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {isLoading ? (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-brand/[0.07] text-brand ring-1 ring-inset ring-brand/10">
                  <ModeIcon className="size-3.5" strokeWidth={1.8} />
                </span>
                <div className="rounded-2xl rounded-tl-md border border-line bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
                  <span className="flex items-center gap-1" aria-hidden="true">
                    <span className="size-1.5 animate-bounce rounded-full bg-brand/50 [animation-delay:-0.3s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-brand/50 [animation-delay:-0.15s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-brand/50" />
                  </span>
                  <span className="sr-only">
                    Sage is retrieving records and checking tools
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
            className="shrink-0 border-t border-line bg-white p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={startEmergency}
                disabled={isLoading || restoring}
                className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[9px] font-semibold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <AlertTriangle className="size-3" />
                {activeMode === "doctor" ? "Emergency escalation" : "Escalate to owner"}
              </button>
              <a
                href="/dashboard"
                className="inline-flex items-center gap-1 text-[9px] font-medium text-subtle hover:text-brand"
              >
                <LayoutDashboard className="size-3" />
                Owner dashboard
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isLoading || restoring}
                type="text"
                maxLength={4000}
                placeholder={`Message ${modeConfig.label} mode…`}
                aria-label={`Message SupportSage AI in ${modeConfig.label} mode`}
                className="h-10 flex-1 rounded-lg border-line bg-canvas text-[12.5px] text-ink placeholder:text-subtle focus-visible:border-brand/40 focus-visible:ring-brand/15 disabled:opacity-60"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading || restoring}
                aria-label="Send message"
                className="size-10 shrink-0 rounded-lg bg-brand text-white disabled:opacity-40"
              >
                <Send className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-center text-[9px] tracking-wide text-gray-400">
              Powered by Groq · RAG grounded · Tools can act on real records
            </p>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="support-chat"
        aria-label={open ? "Close SupportSage chat" : "Open SupportSage chat"}
        className="fixed bottom-5 right-4 z-50 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_16px_40px_-12px_rgba(74,28,58,0.65)] ring-1 ring-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 sm:bottom-6 sm:right-6"
      >
        {open ? (
          <X className="size-5" strokeWidth={1.9} />
        ) : (
          <>
            <MessageCircle className="size-5" strokeWidth={1.9} />
            <span className="absolute right-1 top-1 size-2.5 rounded-full border-2 border-brand bg-emerald-400" />
          </>
        )}
      </button>
    </>
  );
}
