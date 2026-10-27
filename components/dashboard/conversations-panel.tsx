"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";

import {
  EmptyState,
  ModePill,
  Pill,
  appointmentStatusTone,
  escalationStatusTone,
  formatDateTime,
  formatRelative,
  formatShortDate,
  initials,
  mapHref,
  notificationTone,
  phoneHref,
  priorityTone,
} from "@/components/dashboard/ui";
import type {
  Appointment,
  ChatMode,
  ConversationDetail,
  ConversationSummary,
  DoctorResult,
  EmergencyContact,
  Escalation,
  KeyInfo,
  Order,
  StoredMessage,
} from "@/lib/types";

const KEY_FIELDS: Array<{ key: keyof KeyInfo; label: string }> = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "location", label: "Location" },
  { key: "symptoms", label: "Symptoms" },
  { key: "duration", label: "Duration" },
  { key: "specialty", label: "Specialty" },
  { key: "doctor", label: "Doctor" },
  { key: "orderId", label: "Order" },
  { key: "intent", label: "Intent" },
];

function prettyIntent(intent?: string) {
  if (!intent) return "";
  return intent.replace(/_/g, " ");
}

function dayGroup(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Older";
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const time = date.getTime();
  if (time >= startOfToday) return "Today";
  if (time >= startOfToday - 86_400_000) return "Yesterday";
  if (time >= startOfToday - 6 * 86_400_000) return "Previous 7 days";
  return "Older";
}

function groupConversations(conversations: ConversationSummary[]) {
  const order = ["Today", "Yesterday", "Previous 7 days", "Older"];
  const groups = new Map<string, ConversationSummary[]>();
  for (const conversation of conversations) {
    const label = dayGroup(conversation.updatedAt);
    const items = groups.get(label) ?? [];
    items.push(conversation);
    groups.set(label, items);
  }
  return order
    .filter((label) => groups.has(label))
    .map((label) => ({ label, items: groups.get(label) ?? [] }));
}

function notificationLabel(status?: "sent" | "queued" | "failed") {
  if (status === "sent") return "Telegram sent";
  if (status === "failed") return "Telegram failed";
  if (status === "queued") return "Telegram queued";
  return "";
}

function DoctorRecord({ doctor }: { doctor: DoctorResult }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex flex-wrap items-center gap-1.5 text-[11.5px] font-semibold text-ink">
            {doctor.name}
            {doctor.verified ? (
              <Pill tone="green">Verified</Pill>
            ) : (
              <Pill tone="amber">Demo record</Pill>
            )}
          </p>
          <p className="mt-0.5 text-[10.5px] text-subtle">
            {doctor.specialty} · {doctor.qualifications}
          </p>
        </div>
        {doctor.urgentCare ? <Pill tone="red">Urgent care</Pill> : null}
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
            className="inline-flex items-center gap-1 hover:text-brand hover:underline"
          >
            <Mail className="size-3" />
            {doctor.email}
          </a>
        </p>
        <p className="flex items-center gap-1.5">
          <Clock className="size-3" />
          {doctor.hours} · {doctor.fee}
        </p>
      </div>

      {doctor.nextSlots?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {doctor.nextSlots.slice(0, 3).map((slot) => (
            <span
              key={`${slot.date}-${slot.time}`}
              className="rounded-md border border-brand/15 bg-brand/[0.04] px-1.5 py-0.5 text-[9px] font-medium text-brand"
            >
              {formatShortDate(slot.date)} · {slot.time}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrderRecord({ order }: { order: Order }) {
  return (
    <div className="rounded-lg border border-line bg-canvas/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <FileText className="size-3.5 text-brand" />
            Order #{order.id} verified
          </p>
          <p className="mt-0.5 text-[10.5px] text-subtle">
            {order.customer} · {order.currency} {order.amount}
          </p>
        </div>
        <Pill tone={order.duplicateCharge ? "red" : "green"}>
          {order.status}
        </Pill>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-subtle">{order.items}</p>
      <p className="mt-0.5 text-[10px] leading-4 text-subtle">{order.notes}</p>
    </div>
  );
}

function AppointmentRecord({ appointment }: { appointment: Appointment }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-900">
            <CheckCircle2 className="size-3.5" />
            Appointment {appointment.reference}
          </p>
          <p className="mt-0.5 text-[10.5px] text-emerald-900/80">
            {appointment.doctorName} · {formatShortDate(appointment.date)} at{" "}
            {appointment.time}
          </p>
        </div>
        <Pill tone={appointmentStatusTone(appointment.status)}>
          {appointment.status}
        </Pill>
      </div>
      <p className="mt-1.5 text-[10px] leading-4 text-emerald-900/75">
        {appointment.location}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <a
          href={appointment.calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2 py-1 text-[9.5px] font-medium text-white hover:bg-emerald-800"
        >
          <ExternalLink className="size-3" />
          Google Calendar
        </a>
        <a
          href={appointment.icsUrl}
          className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2 py-1 text-[9.5px] font-medium text-emerald-800 hover:bg-emerald-50"
        >
          <Download className="size-3" />
          .ics
        </a>
      </div>
    </div>
  );
}

function EscalationRecord({ escalation }: { escalation: Escalation }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        escalation.priority === "high"
          ? "border-red-200 bg-red-50/60"
          : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
          <ShieldAlert className="size-3.5" />
          {escalation.reference}
        </p>
        <div className="flex flex-wrap gap-1">
          <Pill tone={priorityTone(escalation.priority)}>
            {escalation.priority}
          </Pill>
          <Pill tone={escalationStatusTone(escalation.status)}>
            {escalation.status}
          </Pill>
        </div>
      </div>
      <p className="mt-1 text-[10.5px] font-medium text-ink">
        {escalation.subject}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-[10px] leading-4 text-subtle">
        {escalation.details}
      </p>
      {escalation.doctorName ? (
        <p className="mt-1 text-[9.5px] text-subtle">
          Routed to {escalation.doctorName}
        </p>
      ) : null}
    </div>
  );
}

function EmergencyContactRow({
  contacts,
}: {
  contacts: EmergencyContact[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {contacts.map((contact) => (
        <a
          key={contact.label}
          href={contact.href}
          className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[9.5px] font-medium text-red-800 hover:bg-red-50"
        >
          <Phone className="size-3" />
          {contact.label}: {contact.value}
        </a>
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: StoredMessage }) {
  const isUser = message.role === "user";
  const urgent = message.urgent;
  const emergency = message.urgencyLevel === "emergency";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
      <span
        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-semibold ${
          isUser
            ? "border border-line bg-white text-subtle"
            : "bg-brand text-white"
        }`}
      >
        {isUser ? <UserRound className="size-3.5" /> : <Sparkles className="size-3.5" />}
      </span>

      <div className={`min-w-0 max-w-[92%] ${isUser ? "items-end" : ""}`}>
        <div
          className={`flex flex-wrap items-center gap-1.5 text-[9px] text-subtle ${
            isUser ? "justify-end" : ""
          }`}
        >
          <span className="font-semibold uppercase tracking-[0.12em]">
            {isUser ? "Visitor" : "Sage"}
          </span>
          <span>{formatDateTime(message.createdAt)}</span>
          {urgent ? (
            <Pill tone={emergency ? "red" : "amber"}>
              {emergency ? "Emergency" : "Urgent"}
            </Pill>
          ) : null}
          {message.notificationStatus ? (
            <Pill tone={notificationTone(message.notificationStatus)}>
              {notificationLabel(message.notificationStatus)}
            </Pill>
          ) : null}
        </div>

        <div
          className={`mt-1 rounded-xl border px-3.5 py-2.5 text-[11.5px] leading-[1.65] ${
            isUser
              ? "rounded-tr-sm border-brand/15 bg-brand/[0.06] text-ink"
              : "rounded-tl-sm border-line bg-white text-ink"
          }`}
        >
          {urgent && !isUser ? (
            <div
              className={`mb-2 rounded-lg border p-2 ${
                emergency
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p
                className={`flex items-center gap-1.5 text-[10px] font-semibold ${
                  emergency ? "text-red-900" : "text-amber-900"
                }`}
              >
                <AlertTriangle className="size-3.5" />
                {emergency
                  ? "Emergency pathway triggered"
                  : "Urgent pathway triggered"}
              </p>
              {message.emergencyContacts?.length ? (
                <div className="mt-1.5">
                  <EmergencyContactRow contacts={message.emergencyContacts} />
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="whitespace-pre-wrap">{message.content}</p>

          {message.doctors?.length ? (
            <div className="mt-2.5 space-y-1.5">
              <p className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                Live directory result
              </p>
              {message.doctors.map((doctor) => (
                <DoctorRecord key={doctor.id} doctor={doctor} />
              ))}
            </div>
          ) : null}

          {message.appointment ? (
            <div className="mt-2.5">
              <AppointmentRecord appointment={message.appointment} />
            </div>
          ) : null}

          {message.order ? (
            <div className="mt-2.5">
              <OrderRecord order={message.order} />
            </div>
          ) : null}

          {message.escalation ? (
            <div className="mt-2.5">
              <EscalationRecord escalation={message.escalation} />
            </div>
          ) : null}

          {message.sources?.length ? (
            <details className="mt-2.5 border-t border-line/80 pt-2">
              <summary className="cursor-pointer text-[8.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                Grounded in {message.sources.length} source
                {message.sources.length === 1 ? "" : "s"}
              </summary>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {message.sources.map((source) => (
                  <span
                    key={source.id}
                    className="inline-flex items-center gap-1 rounded-full border border-line bg-canvas px-1.5 py-0.5 text-[8.5px] text-subtle"
                  >
                    <FileText className="size-2.5" />
                    {source.title}
                  </span>
                ))}
              </div>
            </details>
          ) : null}

          {message.tools?.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-1">
              <Wrench className="size-2.5 text-subtle" />
              {message.tools.map((tool) => (
                <span
                  key={tool}
                  className="rounded-full bg-brand/[0.06] px-1.5 py-0.5 text-[8px] font-medium text-brand"
                >
                  {tool.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-xl border border-line bg-white"
        />
      ))}
    </div>
  );
}

export function ConversationsPanel({
  conversations,
  selectedId,
  detail,
  loadingDetail,
  onSelect,
  onDelete,
}: {
  conversations: ConversationSummary[];
  selectedId?: string;
  detail: ConversationDetail | null;
  loadingDetail: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<"all" | ChatMode>("all");
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return conversations.filter((conversation) => {
      if (modeFilter !== "all" && conversation.mode !== modeFilter) return false;
      if (urgentOnly && !conversation.urgent) return false;
      if (!query) return true;
      const haystack =
        `${conversation.title} ${conversation.summary} ${conversation.lastMessage} ${Object.values(
          conversation.keyInfo,
        )
          .filter(Boolean)
          .join(" ")}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [conversations, modeFilter, search, urgentOnly]);

  const groups = groupConversations(filtered);
  const conversation = detail?.conversation;
  const selectedSummary = conversations.find((item) => item.id === selectedId);

  const handleDelete = async () => {
    if (!selectedId || deleting) return;
    const label = selectedSummary?.title ?? "this conversation";
    if (
      !window.confirm(
        `Delete "${label}"? The transcript and its linked dashboard record will be removed.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      await onDelete(selectedId);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-3 lg:grid-cols-[330px_minmax(0,1fr)]">
      <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)] lg:h-[calc(100dvh-16rem)] lg:min-h-[540px]">
        <div className="shrink-0 border-b border-line/80 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search conversations…"
              aria-label="Search conversations"
              className="h-9 w-full rounded-lg border border-line bg-canvas pl-8 pr-3 text-[11.5px] text-ink outline-none placeholder:text-subtle/80 focus:border-brand/35 focus:ring-2 focus:ring-brand/10"
            />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1">
            {(
              [
                { id: "all", label: "All" },
                { id: "doctor", label: "Doctor" },
                { id: "business", label: "Business" },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setModeFilter(option.id)}
                aria-pressed={modeFilter === option.id}
                className={`rounded-md px-2 py-1 text-[9.5px] font-medium transition-colors ${
                  modeFilter === option.id
                    ? "bg-brand text-white"
                    : "text-subtle hover:bg-canvas hover:text-ink"
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setUrgentOnly((current) => !current)}
              aria-pressed={urgentOnly}
              className={`ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9.5px] font-medium transition-colors ${
                urgentOnly
                  ? "bg-red-50 text-red-700"
                  : "text-subtle hover:bg-canvas hover:text-ink"
              }`}
            >
              <AlertTriangle className="size-3" />
              Urgent
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <MessageSquareText className="mx-auto size-5 text-subtle/60" />
              <p className="mt-2 text-[11px] font-medium text-ink">
                No conversations match
              </p>
              <p className="mt-1 text-[10px] leading-4 text-subtle">
                Start a chat from the site and it will appear here with a
                summary and extracted facts.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-2 pb-1 pt-1 text-[8.5px] font-semibold uppercase tracking-[0.14em] text-subtle">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = item.id === selectedId;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onSelect(item.id)}
                        aria-current={active ? "true" : undefined}
                        className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                          active
                            ? "border-brand/15 bg-brand/[0.06]"
                            : "border-transparent hover:border-line hover:bg-canvas"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="line-clamp-1 text-[11.5px] font-semibold text-ink">
                            {item.title}
                          </p>
                          {item.urgent ? (
                            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                          ) : null}
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-subtle">
                          {item.summary || item.lastMessage || "No messages yet."}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <ModePill mode={item.mode} />
                          <span className="text-[8.5px] text-subtle">
                            {item.messageCount} msg
                          </span>
                          <span className="ml-auto text-[8.5px] text-subtle">
                            {formatRelative(item.updatedAt)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_1px_2px_rgba(16,24,40,0.03)] lg:h-[calc(100dvh-16rem)] lg:min-h-[540px]">
        {!selectedId ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              icon={MessageSquareText}
              title="Select a conversation"
              description="Every chat is persisted with its summary, extracted key facts, retrieval sources, tools used, appointments, and escalations."
            />
          </div>
        ) : loadingDetail ? (
          <>
            <div className="border-b border-line/80 px-4 py-3.5">
              <div className="h-4 w-52 animate-pulse rounded bg-gray-100" />
              <div className="mt-2 h-3 w-32 animate-pulse rounded bg-gray-100" />
            </div>
            <DetailSkeleton />
          </>
        ) : !conversation ? (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              icon={MessageSquareText}
              title="Conversation unavailable"
              description="It may have been removed. Pick another conversation from the list."
            />
          </div>
        ) : (
          <>
            <header className="shrink-0 border-b border-line/80 px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ModePill mode={conversation.mode} />
                    {conversation.urgent ? (
                      <Pill tone="red" icon={AlertTriangle}>
                        Urgent
                      </Pill>
                    ) : null}
                    <span className="text-[9px] text-subtle">
                      Updated {formatRelative(conversation.updatedAt)}
                    </span>
                  </div>
                  <h2 className="mt-1.5 text-[15px] font-semibold leading-5 text-ink">
                    {conversation.title}
                  </h2>
                  <p className="mt-0.5 text-[10px] text-subtle">
                    {conversation.messages.length} messages · created{" "}
                    {formatDateTime(conversation.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-medium text-subtle transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                >
                  <Trash2 className="size-3" />
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto bg-canvas/50">
              <div className="space-y-3 p-4 sm:p-5">
                <div className="rounded-xl border border-brand/15 bg-brand/[0.045] p-3.5">
                  <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-brand">
                    <Sparkles className="size-3" />
                    AI conversation summary
                  </p>
                  <p className="mt-1.5 text-[11.5px] leading-[1.7] text-ink">
                    {conversation.summary}
                  </p>
                </div>

                {Object.keys(conversation.keyInfo).length > 0 ? (
                  <div className="rounded-xl border border-line bg-white p-3.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-subtle">
                      Extracted key facts
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {KEY_FIELDS.map((field) => {
                        const value = conversation.keyInfo[field.key];
                        if (!value) return null;
                        return (
                          <span
                            key={field.key}
                            className="inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-canvas px-2 py-1 text-[10px] text-ink"
                          >
                            <span className="font-semibold text-subtle">
                              {field.label}:
                            </span>
                            <span className="truncate">
                              {field.key === "intent"
                                ? prettyIntent(String(value))
                                : field.key === "orderId"
                                  ? `#${value}`
                                  : String(value)}
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {detail.appointments.length > 0 ||
                detail.escalations.length > 0 ? (
                  <div className="rounded-xl border border-line bg-white p-3.5">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-subtle">
                      Linked records
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {detail.appointments.map((appointment) => (
                        <span
                          key={appointment.id}
                          className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9.5px] font-medium text-emerald-800"
                        >
                          <CalendarDays className="size-3" />
                          {appointment.reference} · {appointment.status}
                        </span>
                      ))}
                      {detail.escalations.map((escalation) => (
                        <span
                          key={escalation.id}
                          className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[9.5px] font-medium text-amber-800"
                        >
                          <ShieldAlert className="size-3" />
                          {escalation.reference} · {escalation.status}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="space-y-4 pt-1">
                  {conversation.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export function conversationDoctorSummary(doctor: DoctorResult) {
  return `${doctor.name} · ${doctor.specialty}`;
}

export function conversationInitials(name?: string) {
  return initials(name ?? "Visitor");
}
