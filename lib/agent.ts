import { randomUUID } from "node:crypto";

import { buildGoogleCalendarUrl } from "@/lib/calendar";
import {
  createAppointment,
  createEscalation,
  findDoctor,
  findOpenEscalation,
  getOrder,
  getSettings,
  listAppointments,
  listDoctors,
  listNotifications,
  publicDoctor,
  updateAppointment,
} from "@/lib/db";
import {
  createEventForAppointment,
  isGoogleCalendarConnected,
} from "@/lib/google-calendar";
import { mergeKeyInfo } from "@/lib/insights";
import { buildRagContext, type RetrievedChunk } from "@/lib/rag";
import { DEFAULT_REMINDER_MINUTES, reminderLabel } from "@/lib/reminders";
import {
  addDays,
  computeReminderAt,
  findNextOpenSlot,
  getDoctorSchedule as scheduleForDoctor,
  isBookableSlot,
  nextAvailableSlots,
  todayInTimeZone,
} from "@/lib/scheduling";
import { sendTelegramNotification } from "@/lib/telegram";
import type {
  Appointment,
  ChatMode,
  Conversation,
  Doctor,
  DoctorResult,
  Escalation,
  EscalationType,
  KeyInfo,
  Order,
} from "@/lib/types";
import { triageLabel, type TriageAssessment } from "@/lib/triage";

type ToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

type GroqToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: GroqToolCall[];
  tool_call_id?: string;
  name?: string;
};

type GroqChoiceMessage = {
  role?: string;
  content?: string | null;
  tool_calls?: GroqToolCall[];
  reasoning?: string;
};

export class AgentRequestError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AgentRequestError";
    this.status = status;
  }
}

export type AgentInput = {
  mode: ChatMode;
  conversation: Conversation;
  message: string;
  triage: TriageAssessment;
  ragChunks: RetrievedChunk[];
};

export type AgentResult = {
  reply: string;
  tools: string[];
  doctors: DoctorResult[];
  appointment?: Appointment;
  escalation?: Escalation;
  order?: Order;
  notificationStatus?: "sent" | "queued" | "failed";
  keyInfoPatch: KeyInfo;
};

type ToolState = {
  mode: ChatMode;
  conversationId: string;
  message: string;
  triage: TriageAssessment;
  keyInfo: KeyInfo;
  doctorsById: Map<string, DoctorResult>;
  appointment?: Appointment;
  escalation?: Escalation;
  order?: Order;
  notificationStatus?: "sent" | "queued" | "failed";
  tools: string[];
};

const CITY_ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bombay: "mumbai",
  delhi: "new delhi",
  madras: "chennai",
  calcutta: "kolkata",
  gurgaon: "new delhi",
  gurugram: "new delhi",
  noida: "new delhi",
  chd: "chandigarh",
};

const SPECIALTY_HINTS: Array<{ pattern: RegExp; terms: string[] }> = [
  {
    pattern: /typhoid|fever|infection|infectious|stomach|abdominal|diarr|vomit/i,
    terms: [
      "internal medicine",
      "infectious",
      "urgent care",
      "general medicine",
      "same-day",
    ],
  },
  {
    pattern: /heart|cardio|chest pain|blood pressure/i,
    terms: ["cardiology"],
  },
  {
    pattern: /child|children|baby|infant|pediatric|paediatric/i,
    terms: ["pediatrics"],
  },
  {
    pattern: /skin|rash|acne|eczema|allergy|hives/i,
    terms: ["dermatology"],
  },
  {
    pattern: /bone|fracture|joint|knee|sprain|ortho|back pain/i,
    terms: ["orthopaedics", "orthopedics"],
  },
  {
    pattern: /diabetes|diabetic|sugar|glucose|thyroid|endocrine/i,
    terms: ["endocrinology", "diabetes"],
  },
  {
    pattern: /pregnan|obstetric|gynae|gyne|women/i,
    terms: ["obstetrics", "gynaecology", "gynecology"],
  },
  {
    pattern: /eye|eyesight|vision|cataract|ophthal/i,
    terms: ["ophthalmology", "eye"],
  },
  {
    pattern: /ear|nose|throat|sinus|hearing|ent/i,
    terms: ["ent", "otolaryngology"],
  },
  {
    pattern: /surgery|surgeon|lump|hernia|gallbladder/i,
    terms: ["general surgery", "surgeon"],
  },
  {
    pattern: /general physician|family doctor|gp|checkup|check-up/i,
    terms: ["general practice", "general medicine"],
  },
];

const TOOL_DEFINITIONS: Record<ChatMode, ToolDefinition[]> = {
  doctor: [
    {
      type: "function",
      function: {
        name: "search_doctors",
        description:
          "Search the live clinic directory for doctors by name, specialty, city, or problem. Returns full contact details and the next available slots. Always use this before sharing any doctor detail.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description:
                "Free-text search such as 'typhoid', 'heart specialist', or a doctor name.",
            },
            specialty: {
              type: "string",
              description: "Specialty or clinical problem, if known.",
            },
            city: {
              type: "string",
              description: "Patient city or area, if known.",
            },
            urgentOnly: {
              type: "boolean",
              description: "Set true when same-day or urgent care is needed.",
            },
          },
        },
      },
    },
    {
      type: "function",
      function: {
        name: "get_doctor_schedule",
        description:
          "Get the next available appointment slots for one doctor in the directory.",
        parameters: {
          type: "object",
          properties: {
            doctorId: {
              type: "string",
              description: "Doctor id returned by search_doctors.",
            },
            days: {
              type: "integer",
              description: "How many working days to return, 3 to 7.",
            },
          },
          required: ["doctorId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "book_appointment",
        description:
          "Book the appointment as soon as the patient has supplied their name, phone, doctor, date, time, and reason. Use this immediately when they accept a listed slot or give a specific date and time. Do not re-search or re-escalate instead of booking. Always checks live availability. If the requested slot is full, it automatically books the next open slot on or after that date and sets a reminder.",
        parameters: {
          type: "object",
          properties: {
            doctorId: {
              type: "string",
              description: "Doctor id from search_doctors.",
            },
            patientName: { type: "string" },
            phone: { type: "string" },
            email: { type: "string" },
            date: {
              type: "string",
              description: "Appointment date in YYYY-MM-DD format.",
            },
            time: {
              type: "string",
              description: "Appointment time in 24-hour HH:MM format.",
            },
            reason: {
              type: "string",
              description: "Short reason for the visit.",
            },
            reminderMinutesBefore: {
              type: "integer",
              description:
                "Optional reminder lead time in minutes: 15, 30, 60, 120, 1440 (1 day), 2880, or 10080 (1 week). Defaults to 60.",
            },
          },
          required: [
            "doctorId",
            "patientName",
            "phone",
            "date",
            "time",
            "reason",
          ],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "escalate_case",
        description:
          "Create a tracked clinical escalation and notify the clinic or doctor through Telegram. Use for emergency red flags, suspected typhoid, same-day urgent requests, or any case that needs human review.",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["emergency", "urgent", "refund", "support", "general"],
            },
            subject: { type: "string" },
            details: {
              type: "string",
              description:
                "Clinical or support details, including symptoms, duration, location, and requested action.",
            },
            doctorId: {
              type: "string",
              description: "Optional doctor to route the alert to.",
            },
          },
          required: ["type", "subject", "details"],
        },
      },
    },
  ],
  business: [
    {
      type: "function",
      function: {
        name: "lookup_order",
        description:
          "Look up a real order record before discussing a charge, refund, plan, or account issue. Never invent order data.",
        parameters: {
          type: "object",
          properties: {
            orderId: {
              type: "string",
              description: "Order number, with or without a leading #.",
            },
          },
          required: ["orderId"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "escalate_case",
        description:
          "Create a tracked support escalation and send the owner a Telegram alert. Use for duplicate charges, refunds, security incidents, frustrated customers, or anything needing a human decision.",
        parameters: {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: ["emergency", "urgent", "refund", "support", "general"],
            },
            subject: { type: "string" },
            details: {
              type: "string",
              description:
                "Customer, order, issue, requested outcome, and actions already taken.",
            },
          },
          required: ["type", "subject", "details"],
        },
      },
    },
  ],
};

function stringArg(args: Record<string, unknown>, key: string) {
  const value = args[key];
  return typeof value === "string" ? value.trim() : "";
}

function booleanArg(args: Record<string, unknown>, key: string) {
  return args[key] === true;
}

function normalizeCity(value: string) {
  const lower = value.trim().toLowerCase();
  return CITY_ALIASES[lower] ?? lower;
}

function normalizeTime(value: string): string | null {
  const match = value
    .trim()
    .toLowerCase()
    .match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const meridiem = match[3];

  if (minute < 0 || minute > 59) return null;
  if (meridiem === "pm" && hour < 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  if (hour < 0 || hour > 23) return null;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeDate(value: string, timezone: string): string | null {
  const lower = value.trim().toLowerCase();
  const today = todayInTimeZone(timezone);

  if (lower === "today") return today;
  if (lower === "tomorrow") return addDays(today, 1);

  if (/^\d{4}-\d{2}-\d{2}$/.test(lower)) return lower;

  const slash = lower.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    return `${slash[3]}-${slash[2].padStart(2, "0")}-${slash[1].padStart(2, "0")}`;
  }

  return null;
}

function reference(prefix: "APT" | "ESC") {
  return `${prefix}-${randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function doctorCard(doctor: Doctor, slotCount = 4): DoctorResult {
  return {
    ...publicDoctor(doctor),
    nextSlots: nextAvailableSlots(
      doctor,
      listAppointments(),
      getSettings().timezone,
      slotCount,
    ),
  };
}

function resolveDoctor(args: Record<string, unknown>): Doctor | undefined {
  const id = stringArg(args, "doctorId");
  if (id) {
    const byId = findDoctor(id);
    if (byId) return byId;
  }

  const name = stringArg(args, "doctorName");
  if (!name) return undefined;

  const normalized = name
    .toLowerCase()
    .replace(/^dr\.?\s*/i, "")
    .trim();
  return listDoctors().find((doctor) => {
    const doctorName = doctor.name.toLowerCase().replace(/^dr\.?\s*/i, "");
    const lastName = doctorName.split(/\s+/).at(-1) ?? "";
    return doctorName.includes(normalized) || normalized.includes(doctorName) || (lastName.length > 3 && normalized.includes(lastName));
  });
}

function doctorNamedInMessage(doctor: Doctor, message: string) {
  const name = doctor.name.replace(/^Dr\.?\s*/i, "").trim();
  const lastName = name.split(/\s+/).at(-1) ?? "";
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [new RegExp(`\\b${escape(name)}\\b`, "i")];
  if (lastName.length > 3) {
    patterns.push(new RegExp(`\\bDr\\.?\\s+${escape(lastName)}\\b`, "i"));
  }
  return patterns.some((pattern) => pattern.test(message));
}

function scoreDoctor(
  doctor: Doctor,
  query: string,
  city: string,
  urgentOnly: boolean,
) {
  let score = 0;
  const lowerQuery = query.toLowerCase();
  const haystack =
    `${doctor.name} ${doctor.specialty} ${doctor.qualifications} ${doctor.clinic} ${doctor.city} ${doctor.address} ${doctor.languages}`.toLowerCase();

  if (city && normalizeCity(doctor.city).includes(normalizeCity(city))) {
    score += 12;
  }

  if (lowerQuery) {
    if (doctor.name.toLowerCase().includes(lowerQuery)) score += 14;
    if (doctor.specialty.toLowerCase().includes(lowerQuery)) score += 10;
    if (haystack.includes(lowerQuery)) score += 6;

    const tokens = lowerQuery
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2);
    for (const token of tokens) {
      if (haystack.includes(token)) score += 1.5;
    }

    for (const hint of SPECIALTY_HINTS) {
      if (hint.pattern.test(lowerQuery)) {
        for (const term of hint.terms) {
          if (haystack.includes(term)) score += 7;
        }
      }
    }
  }

  if (urgentOnly && doctor.urgentCare) score += 5;
  if (doctor.teleconsult) score += 0.5;
  return score;
}

function searchDoctors(
  args: Record<string, unknown>,
  state: ToolState,
): Record<string, unknown> {
  const query = [stringArg(args, "query"), stringArg(args, "specialty")]
    .filter(Boolean)
    .join(" ");
  const city = stringArg(args, "city");
  const urgentOnly = booleanArg(args, "urgentOnly");
  const allDoctors = listDoctors();

  let cityFallback = false;
  let candidates = allDoctors;
  if (city) {
    const cityMatches = allDoctors.filter(
      (doctor) =>
        normalizeCity(doctor.city).includes(normalizeCity(city)) ||
        doctor.address.toLowerCase().includes(city.toLowerCase()),
    );
    if (cityMatches.length > 0) {
      candidates = cityMatches;
    } else {
      cityFallback = true;
    }
  }

  let urgentFallback = false;
  if (urgentOnly) {
    const urgentMatches = candidates.filter((doctor) => doctor.urgentCare);
    if (urgentMatches.length > 0) {
      candidates = urgentMatches;
    } else if (!cityFallback) {
      urgentFallback = true;
    } else {
      const allUrgent = allDoctors.filter((doctor) => doctor.urgentCare);
      if (allUrgent.length > 0) candidates = allUrgent;
      urgentFallback = true;
    }
  }

  const scored = candidates
    .map((doctor) => ({
      doctor,
      score: scoreDoctor(doctor, query, city, urgentOnly),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.doctor.urgentCare !== b.doctor.urgentCare) {
        return a.doctor.urgentCare ? -1 : 1;
      }
      return a.doctor.name.localeCompare(b.doctor.name);
    });

  const hasPositive = scored.some((item) => item.score > 0);
  const filtered = hasPositive
    ? scored.filter((item) => item.score > 0)
    : scored;
  const wantsAll = /\b(all|every|list|directory)\b/i.test(query);
  const limit = wantsAll ? 9 : 4;

  const results = filtered.slice(0, limit).map(({ doctor }) => {
    const result = doctorCard(doctor, 3);
    state.doctorsById.set(doctor.id, result);
    return result;
  });

  const notes: string[] = [];
  if (cityFallback) {
    notes.push(
      `The live directory currently covers Chandigarh only, and no doctor is listed in ${city}. Tell the patient that clearly instead of presenting a Chandigarh doctor as local.`,
    );
  }
  if (urgentFallback) {
    notes.push(
      "No urgent-care doctor matches every filter; showing general and internal-medicine options.",
    );
  }

  return {
    ok: true,
    count: results.length,
    doctors: results,
    note: notes.length > 0 ? notes.join(" ") : undefined,
    availableCities: [...new Set(allDoctors.map((doctor) => doctor.city))],
    dataNote:
      "Doctors with sourceUrl are transcribed from the ESIC authorised medical attendants list for Chandigarh (2023-24). That list does not publish consultation hours or fees, so say the clinic must be called to confirm those. Online booking windows are demo schedules; live availability is checked again at booking time.",
  };
}

function getSchedule(
  args: Record<string, unknown>,
  state: ToolState,
): Record<string, unknown> {
  const doctor = resolveDoctor(args);
  if (!doctor) {
    return {
      ok: false,
      error:
        "Doctor not found in the live directory. Search the directory first, then request a schedule.",
    };
  }

  const appointments = listAppointments();
  const timezone = getSettings().timezone;
  const requestedDays = Number(args.days);
  const days = Number.isFinite(requestedDays)
    ? Math.min(7, Math.max(3, requestedDays))
    : 5;
  const schedule = scheduleForDoctor(
    doctor,
    appointments,
    timezone,
    days,
  );
  const card = doctorCard(doctor);
  state.doctorsById.set(doctor.id, card);

  return {
    ok: true,
    doctor: card,
    days: schedule,
    timezone,
  };
}

async function bookAppointment(
  args: Record<string, unknown>,
  state: ToolState,
): Promise<Record<string, unknown>> {
  const doctor = resolveDoctor(args);
  if (!doctor) {
    return {
      ok: false,
      error:
        "Doctor not found. Use search_doctors first and then book with the returned doctor id.",
    };
  }

  const patientName =
    stringArg(args, "patientName") || state.keyInfo.name || "";
  const phone = stringArg(args, "phone") || state.keyInfo.phone || "";
  const email = stringArg(args, "email") || state.keyInfo.email || "";
  const reason =
    stringArg(args, "reason") ||
    state.keyInfo.symptoms ||
    "General consultation";
  const rawDate = stringArg(args, "date");
  const rawTime = stringArg(args, "time");
  const timezone = getSettings().timezone;

  const missing: string[] = [];
  if (!patientName) missing.push("patient full name");
  if (!phone) missing.push("phone number");
  if (!rawDate) missing.push("appointment date");
  if (!rawTime) missing.push("appointment time");
  if (missing.length > 0) {
    return {
      ok: false,
      needsDetails: missing,
      message: `Ask the patient for the missing details: ${missing.join(", ")}.`,
    };
  }

  const requestedDate = normalizeDate(rawDate, timezone);
  const requestedTime = normalizeTime(rawTime);
  const appointments = listAppointments();
  const today = todayInTimeZone(timezone);

  if (!requestedDate) {
    return {
      ok: false,
      error: "Date must be YYYY-MM-DD, today, or tomorrow.",
      availableSlots: nextAvailableSlots(doctor, appointments, timezone, 8),
    };
  }

  if (requestedDate < today) {
    return {
      ok: false,
      error:
        "That date has already passed. Offer one of the live upcoming slots instead.",
      availableSlots: nextAvailableSlots(doctor, appointments, timezone, 8),
    };
  }

  if (!requestedTime) {
    return {
      ok: false,
      error: "Time must be in 24-hour HH:MM format.",
      availableSlots: nextAvailableSlots(doctor, appointments, timezone, 8),
    };
  }

  const reminderValue = Number(args.reminderMinutesBefore);
  const reminderMinutesBefore =
    Number.isFinite(reminderValue) &&
    reminderValue >= 5 &&
    reminderValue <= 10080
      ? Math.round(reminderValue)
      : DEFAULT_REMINDER_MINUTES;

  let date = requestedDate;
  let time = requestedTime;
  let autoRebooked = false;

  if (!isBookableSlot(doctor, requestedDate, requestedTime, appointments, timezone)) {
    const nextSlot = findNextOpenSlot(
      doctor,
      appointments,
      timezone,
      requestedDate,
      requestedTime,
    );

    if (!nextSlot) {
      return {
        ok: false,
        error:
          "The requested day is full and there is no open slot in the next 45 days. Ask the patient to call the clinic.",
        availableSlots: nextAvailableSlots(doctor, appointments, timezone, 8),
      };
    }

    date = nextSlot.date;
    time = nextSlot.time;
    autoRebooked = true;
  }

  const reminderAt = computeReminderAt(
    date,
    time,
    timezone,
    reminderMinutesBefore,
  );
  const appointmentReference = reference("APT");
  const calendarUrl = buildGoogleCalendarUrl({
    reference: appointmentReference,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    clinic: doctor.clinic,
    location: doctor.address,
    patientName,
    date,
    time,
    durationMinutes: doctor.slotMinutes,
    reason,
    timezone,
    reminderMinutesBefore,
  });

  let appointment = createAppointment({
    reference: appointmentReference,
    conversationId: state.conversationId,
    doctorId: doctor.id,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    clinic: doctor.clinic,
    location: doctor.address,
    patientName,
    phone,
    email: email || undefined,
    date,
    time,
    durationMinutes: doctor.slotMinutes,
    reason,
    timezone,
    status: "confirmed",
    calendarUrl,
    // The database assigns the canonical appointment id. Build the download
    // link from that id so the .ics route always resolves to this booking.
    icsUrl: "",
    reminderMinutesBefore,
    reminderAt,
    requestedDate: autoRebooked ? requestedDate : undefined,
    requestedTime: autoRebooked ? requestedTime : undefined,
    autoRebooked: autoRebooked || undefined,
    notificationStatus: "queued",
  });

  appointment = updateAppointment(appointment.id, {
    icsUrl: `/api/appointments/${appointment.id}/ics`,
  }) ?? appointment;

  if (isGoogleCalendarConnected()) {
    try {
      const event = await createEventForAppointment(appointment);
      appointment =
        updateAppointment(appointment.id, {
          googleEventId: event.id,
          googleEventLink: event.htmlLink,
          googleSyncedAt: new Date().toISOString(),
          googleSyncError: undefined,
        }) ?? appointment;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Google Calendar sync failed.";
      console.error("[google-calendar] appointment sync failed", error);
      appointment =
        updateAppointment(appointment.id, { googleSyncError: message }) ??
        appointment;
    }
  }

  const message = [
    `🩺 New appointment ${appointment.reference}`,
    `Doctor: ${doctor.name} (${doctor.specialty})`,
    `Clinic: ${doctor.clinic}`,
    `Patient: ${patientName}`,
    `Phone: ${phone}`,
    email ? `Email: ${email}` : "",
    `Date: ${date} at ${time} (${timezone})`,
    ...(autoRebooked
      ? [
          `Requested: ${requestedDate} at ${requestedTime} — unavailable, booked next open slot`,
        ]
      : []),
    `Reminder: ${reminderLabel(reminderMinutesBefore)} (${reminderAt})`,
    `Reason: ${reason}`,
    `Location: ${doctor.address}`,
    "Booked through SupportSage AI",
  ]
    .filter(Boolean)
    .join("\n");

  const notification = await sendTelegramNotification({
    text: message,
    chatId: doctor.telegramChatId,
    relatedType: "appointment",
    relatedId: appointment.id,
  });

  appointment = updateAppointment(appointment.id, {
    notificationStatus: notification.status,
  }) ?? appointment;

  const card = doctorCard(doctor);
  state.doctorsById.set(doctor.id, card);
  state.appointment = appointment;
  state.notificationStatus = notification.status;
  state.keyInfo = mergeKeyInfo(state.keyInfo, {
    name: patientName,
    phone,
    email: email || undefined,
    doctor: doctor.name,
    specialty: doctor.specialty,
    location: doctor.city,
    intent: "appointment_booking",
  });

  const googleNote = appointment.googleEventLink
    ? "The appointment is also on the clinic's Google Calendar."
    : "";

  return {
    ok: true,
    appointment,
    doctor: card,
    autoRebooked,
    requested: autoRebooked
      ? { date: requestedDate, time: requestedTime }
      : undefined,
    booked: { date, time },
    reminder: {
      minutesBefore: reminderMinutesBefore,
      label: reminderLabel(reminderMinutesBefore),
      at: reminderAt,
    },
    notificationStatus: notification.status,
    calendar: {
      google: appointment.calendarUrl,
      ics: appointment.icsUrl,
      event: appointment.googleEventLink,
      synced: Boolean(appointment.googleEventLink),
      error: appointment.googleSyncError,
    },
    instruction: `${
      autoRebooked
        ? `The requested slot on ${requestedDate} at ${requestedTime} was full. Booked the next open slot on ${date} at ${time}. Tell the patient clearly that the requested day/slot was unavailable, give the new date and time, and confirm the reminder for ${reminderLabel(reminderMinutesBefore)} before. `
        : `Confirm the booking, give the reference and exact date/time, and mention the reminder for ${reminderLabel(reminderMinutesBefore)} before. `
    }${
      notification.status === "sent"
        ? "The clinic has been notified."
        : "The Telegram alert is queued because the bot is not configured; do not claim it was sent."
    }${googleNote ? ` ${googleNote}` : ""}`,
  };
}

function priorityForType(type: EscalationType) {
  if (type === "emergency" || type === "urgent") return "high" as const;
  if (type === "refund" || type === "support") return "medium" as const;
  return "low" as const;
}

function pickUrgentDoctor(state: ToolState): Doctor | undefined {
  const doctors = listDoctors();
  const city = state.keyInfo.location;
  const inCity = city
    ? doctors.filter((doctor) => normalizeCity(doctor.city).includes(normalizeCity(city)))
    : [];

  return (
    inCity.find((doctor) => doctor.urgentCare) ??
    doctors.find((doctor) => doctor.urgentCare) ??
    inCity.find((doctor) => /general medicine|internal medicine/i.test(doctor.specialty)) ??
    doctors.find((doctor) => /internal medicine|general medicine/i.test(doctor.specialty)) ??
    doctors[0]
  );
}

function factLines(state: ToolState) {
  const { keyInfo } = state;
  return [
    keyInfo.name ? `Name: ${keyInfo.name}` : "",
    keyInfo.phone ? `Phone: ${keyInfo.phone}` : "",
    keyInfo.email ? `Email: ${keyInfo.email}` : "",
    keyInfo.location ? `Location: ${keyInfo.location}` : "",
    keyInfo.symptoms ? `Symptoms: ${keyInfo.symptoms}` : "",
    keyInfo.duration ? `Duration: ${keyInfo.duration}` : "",
    keyInfo.orderId ? `Order: #${keyInfo.orderId}` : "",
  ].filter(Boolean);
}

async function escalateCase(
  args: Record<string, unknown>,
  state: ToolState,
): Promise<Record<string, unknown>> {
  if (!state.tools.includes("escalate_case")) {
    state.tools.push("escalate_case");
  }

  const validTypes: EscalationType[] = [
    "emergency",
    "urgent",
    "refund",
    "support",
    "general",
  ];
  const requestedType = stringArg(args, "type") as EscalationType;
  const type = validTypes.includes(requestedType) ? requestedType : "general";
  const requestedDoctor =
    state.mode === "doctor" ? resolveDoctor(args) : undefined;
  const surfacedDoctors =
    state.mode === "doctor"
      ? [...state.doctorsById.keys()]
          .map((id) => findDoctor(id))
          .filter((doctor): doctor is Doctor => Boolean(doctor))
      : [];
  const requestedIsGrounded = Boolean(
    requestedDoctor &&
      (surfacedDoctors.some((doctor) => doctor.id === requestedDoctor.id) ||
        doctorNamedInMessage(requestedDoctor, state.message)),
  );
  const doctor =
    state.mode === "doctor"
      ? (requestedIsGrounded ? requestedDoctor : undefined) ??
        surfacedDoctors[0] ??
        requestedDoctor ??
        pickUrgentDoctor(state)
      : undefined;
  const subject =
    stringArg(args, "subject") ||
    (state.mode === "doctor"
      ? "Clinical request requiring follow-up"
      : "Customer support request requiring follow-up");
  const baseDetails = stringArg(args, "details") || state.message;
  const details = [
    baseDetails,
    ...factLines(state),
    state.triage.level
      ? `Triage: ${triageLabel(state.triage.level)} (${state.triage.reasons.join(", ")})`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const existing = findOpenEscalation(state.conversationId, [type]);
  if (existing) {
    const previousNotification = listNotifications().find(
      (notification) => notification.relatedId === existing.id,
    );
    state.escalation = existing;
    state.notificationStatus = previousNotification?.status ?? "queued";
    return {
      ok: true,
      existing: true,
      escalation: existing,
      notificationStatus: state.notificationStatus,
      message: "An open case already exists for this conversation.",
    };
  }

  const escalation = createEscalation({
    reference: reference("ESC"),
    conversationId: state.conversationId,
    mode: state.mode,
    type,
    subject,
    details,
    priority: priorityForType(type),
    status: "open",
    doctorId: doctor?.id,
    doctorName: doctor?.name,
  });

  const priority = escalation.priority.toUpperCase();
  const icon =
    escalation.type === "emergency"
      ? "🚨"
      : escalation.type === "urgent"
        ? "⚠️"
        : "📋";
  const message = [
    `${icon} ${priority} ${escalation.type.toUpperCase()} ESCALATION ${escalation.reference}`,
    `Mode: ${state.mode === "doctor" ? "Doctor" : "Business Owner"}`,
    `Subject: ${subject}`,
    `Details: ${details}`,
    doctor ? `Route to: ${doctor.name} (${doctor.specialty})` : "",
    doctor ? `Doctor phone: ${doctor.phone}` : "",
    `Open the owner dashboard for the full transcript and audit trail.`,
  ]
    .filter(Boolean)
    .join("\n");

  const notification = await sendTelegramNotification({
    text: message,
    chatId: doctor?.telegramChatId,
    relatedType: "escalation",
    relatedId: escalation.id,
  });

  state.escalation = escalation;
  state.notificationStatus = notification.status;
  if (doctor) {
    state.doctorsById.set(doctor.id, doctorCard(doctor));
  }

  return {
    ok: true,
    escalation,
    notificationStatus: notification.status,
    routedTo: doctor
      ? `${doctor.name} · ${doctor.phone}`
      : "Clinic owner dashboard",
    instruction:
      notification.status === "sent"
        ? "Tell the user the case was opened and the clinic/owner was alerted. Share the reference."
        : "Tell the user the case was opened and the alert is queued. Share the reference and urgent phone contacts.",
  };
}

function lookupOrder(
  args: Record<string, unknown>,
  state: ToolState,
): Record<string, unknown> {
  const orderId = stringArg(args, "orderId");
  if (!orderId) {
    return { ok: false, error: "Ask for the order number first." };
  }

  const order = getOrder(orderId);
  if (!order) {
    return {
      ok: false,
      error: `No order found for ${orderId}. Ask for the order number or purchase email. Do not guess.`,
      knownDemoOrders: ["1042", "1077", "1093", "1105"],
    };
  }

  state.order = order;
  state.keyInfo = mergeKeyInfo(state.keyInfo, {
    orderId: order.id,
    email: order.email,
    name: order.customer,
    intent: order.status.toLowerCase().includes("refund")
      ? "refund_request"
      : "order_lookup",
  });

  return { ok: true, order };
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  state: ToolState,
): Promise<Record<string, unknown>> {
  if (!state.tools.includes(name)) state.tools.push(name);

  try {
    if (name === "search_doctors" && state.mode === "doctor") {
      return searchDoctors(args, state);
    }
    if (name === "get_doctor_schedule" && state.mode === "doctor") {
      return getSchedule(args, state);
    }
    if (name === "book_appointment" && state.mode === "doctor") {
      return await bookAppointment(args, state);
    }
    if (name === "lookup_order" && state.mode === "business") {
      return lookupOrder(args, state);
    }
    if (name === "escalate_case") {
      return await escalateCase(args, state);
    }
    return { ok: false, error: `Tool ${name} is not available in this mode.` };
  } catch (error) {
    console.error(`[agent] tool ${name} failed`, error);
    return {
      ok: false,
      error:
        "The action could not be completed. Explain the issue and offer a human follow-up.",
    };
  }
}

function directorySnapshot() {
  return listDoctors()
    .map(
      (doctor) =>
        `- ${doctor.id} | ${doctor.name} | ${doctor.specialty} | ${doctor.city}${doctor.urgentCare ? " | urgent" : ""}`,
    )
    .join("\n");
}

function buildSystemPrompt(input: AgentInput): string {
  const settings = getSettings();
  const today = todayInTimeZone(settings.timezone);
  const facts = input.conversation.keyInfo;
  const openCase = findOpenEscalation(input.conversation.id, [
    "emergency",
    "urgent",
    "refund",
    "support",
    "general",
  ]);
  const modeRules =
    input.mode === "doctor"
      ? `DOCTOR-MODE RULES
- You support patients and clinic staff. The live directory is the only source of doctor contact details.
- The directory is transcribed from the ESIC authorised medical attendants list for Chandigarh (2023–24). The list contains names, qualifications, clinic addresses, phones, and specialties. It does not publish consultation hours or fees. For those, say "call the clinic to confirm" — never invent them. Online booking windows are demo schedules, not official clinic timings.
- Any suspected typhoid, fever of 3+ days, persistent vomiting, dehydration, severe abdominal pain, confusion, bleeding, breathlessness, or chest pain is urgent. Call escalate_case and search for urgent/internal-medicine doctors. Do NOT give a self-care-only answer.
- For typhoid, say clearly that same-day clinical assessment is needed, do not recommend self-started antibiotics, and give a doctor's phone, address, and live slots. Do not quote a fee unless a tool explicitly returned one.
- Ask for the patient's city or sector when they want the nearest doctor. If the situation is urgent, still provide urgent-care options immediately. The current directory is Chandigarh-based; if the patient is outside Chandigarh, say so instead of pretending a local doctor is nearby.
- Treat every new symptom or specialty as a fresh search. Call search_doctors again and choose by specialty, area, and the patient's problem. Never default to the same doctor just because they appeared earlier in the conversation, and never recommend one doctor for every disease.
- When the patient accepts a slot or supplies a doctor, date, time, name, and phone, call book_appointment in this turn. Never reply with slot times as if the booking were done, and never re-escalate instead of booking.
- If the requested day or slot is full, book_appointment automatically moves to the next open slot and returns autoRebooked=true. Tell the patient plainly that the requested slot was unavailable, give the new date and time, and confirm the reminder. Do not hide the change.
- Every booking has a reminder. Mention the reminder lead time (for example, "1 hour before") in the confirmation. If the patient asks for a different reminder, pass reminderMinutesBefore to book_appointment.
- Only confirm an appointment after book_appointment returns ok=true. Share the reference, exact date/time, and reminder. Use the exact durationMinutes returned by the tool; never guess or round the slot length.
- If an open case already exists for this conversation, do not open a duplicate. Add new details to the existing case and reuse its reference.
- Never invent availability, contact details, fees, or a doctor's schedule.`
      : `BUSINESS-OWNER-MODE RULES
- You support the business owner and support team. Use lookup_order before discussing any order, charge, refund, or plan.
- For duplicate charges, refund requests, security incidents, data loss, chargebacks, or an angry customer, call escalate_case and give the case reference.
- State the verified order facts only. Never promise a refund outcome; mark manager approval when required.
- Tell the owner whether the Telegram alert was sent, queued, or failed. Never say the owner was alerted, notified, or messaged when the alert is queued or failed.
- Return a practical next action and a response time.`;

  const urgency =
    input.triage.level === null
      ? "Routine"
      : `${triageLabel(input.triage.level).toUpperCase()} — ${input.triage.reasons.join(", ")}`;

  return `You are Sage, the SupportSage AI RAG agent. You are not a generic chatbot. You answer from the retrieved knowledge below and you use real tools for directory, scheduling, order, escalation, Telegram, and calendar actions.

Current mode: ${input.mode === "doctor" ? "Doctor" : "Business Owner"}
Current date: ${today}
Timezone: ${settings.timezone}
${input.mode === "doctor" ? "Clinic" : "Support line"}: ${settings.clinicName} · phone ${settings.clinicPhone}
Triage assessment: ${urgency}
Conversation facts: ${JSON.stringify(facts)}
Open case for this conversation: ${openCase ? `${openCase.reference} (${openCase.type}, ${openCase.status})` : "none"}
Tool status: never expose internal tool names or raw JSON. Speak naturally.

${
  input.mode === "doctor"
    ? `LIVE DOCTOR DIRECTORY (ids only; always call search_doctors for full details):
${directorySnapshot()}`
    : "Doctor directory: not available in Business mode. Use lookup_order and escalate_case only."
}

RETRIEVED KNOWLEDGE (authoritative for this turn):
${buildRagContext(input.ragChunks)}

${modeRules}

GLOBAL RULES
- Ground every policy, fee, clinical, and process statement in the retrieved knowledge or a tool result. If the answer is not there, say what you can verify and ask one focused question.
- Use tools instead of guessing. Search before naming a doctor. Check the schedule before offering a slot. Look up an order before discussing it.
- For a medical emergency, tell the person to call 112 (India) or 911 (US) or go to the nearest emergency department immediately. Then give the nearest urgent-care contact and offer to escalate. An emergency escalation must be created before you finish the reply.
- For any new urgent case, call escalate_case in this turn. Do not wait for more details before escalating. If this conversation already has an open case, reuse that reference and describe it as the existing case; do not claim to have opened a new one.
- If a tool reports notificationStatus "queued", say the alert is queued because Telegram is not configured. Do not say it was sent or that the clinic/owner was alerted.
- When a doctor record includes sourceUrl, the name, qualification, address, phone, and specialty come from the ESIC AMA list. Hours and fees are not in that list; say to call the clinic. Do not present the demo booking window as an official clinic timetable.
- Every appointment result includes a reminder. Mention the reminder lead time and never say a reminder was set unless the booking result includes one.
- Be specific: use names, phone numbers, addresses, dates, times, reminders, and references returned by tools.
- Keep the reply under about 240 words. Plain text only: short paragraphs and hyphen bullets. No markdown headings, bold, tables, or emoji except a single warning marker if needed.
- End with one clear next action. Do not ask for information the conversation already contains.`;
}

function resetDurationMs(value: string | null): number {
  if (!value) return 0;
  const match = value.match(/(?:(\d+)m)?([\d.]+)s/);
  if (!match) return 0;
  return (Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)) * 1000;
}

async function requestGroq(
  messages: GroqMessage[],
  tools: ToolDefinition[],
  toolChoice: "auto" | "none",
  retries = 2,
): Promise<GroqChoiceMessage> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new AgentRequestError(
      "Chat is not configured. Add GROQ_API_KEY on the server.",
      500,
    );
  }

  const body = JSON.stringify({
    model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
    messages,
    tools: toolChoice === "none" ? undefined : tools,
    tool_choice: toolChoice === "none" ? undefined : "auto",
    temperature: 0.2,
    // The free Groq tier enforces a tight tokens-per-minute budget. Keep the
    // completion reservation small enough for a tool call plus the final reply.
    max_completion_tokens: 900,
  });

  let response: Response | null = null;
  let rateLimitDetail = "";
  const attempts = retries + 1;

  // A burst of tool rounds can briefly hit the free-tier TPM limit. Wait for the
  // rolling window to clear and retry before surfacing a 429 to the visitor.
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(40_000),
          cache: "no-store",
        },
      );
    } catch (error) {
      console.error("[agent] Groq request failed", error);
      throw new AgentRequestError(
        "The assistant is temporarily unavailable. Please try again.",
        502,
      );
    }

    if (response.status !== 429 || attempt === attempts) break;

    rateLimitDetail = await response.text().catch(() => "");
    const retryAfterHeader = Number(response.headers.get("retry-after") ?? 0);
    const resetHeader = resetDurationMs(
      response.headers.get("x-ratelimit-reset-tokens"),
    );
    const bodyMatch = rateLimitDetail.match(/try again in ([\d.]+)\s*s/i);
    const suggested = Math.max(
      Number.isFinite(retryAfterHeader) ? retryAfterHeader : 0,
      resetHeader / 1000,
      Number(bodyMatch?.[1] ?? 0),
    );
    const waitMs = Math.min(
      35_000,
      Math.max(4_000, Math.ceil(suggested * 1000) + 1_500),
    );
    console.warn(
      `[agent] Groq rate limited; retrying in ${waitMs}ms (attempt ${attempt}/${attempts})`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  if (!response) {
    throw new AgentRequestError(
      "The assistant is temporarily unavailable. Please try again.",
      502,
    );
  }

  if (!response.ok) {
    const detail =
      rateLimitDetail || (await response.text().catch(() => ""));
    console.error(
      `[agent] Groq returned ${response.status}: ${detail.slice(0, 400)}`,
    );

    if (response.status === 429) {
      throw new AgentRequestError(
        "The assistant is handling a lot of requests right now. Please wait a moment and try again.",
        429,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new AgentRequestError(
        "The chat provider rejected the server key. Check GROQ_API_KEY.",
        502,
      );
    }

    throw new AgentRequestError(
      "The assistant could not complete that request. Please try again.",
      502,
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: GroqChoiceMessage }>;
    error?: { message?: string };
  };
  const message = data.choices?.[0]?.message;
  if (!message) {
    throw new AgentRequestError(
      "The assistant returned an empty response. Please try again.",
      502,
    );
  }
  return message;
}

function parseToolArgs(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fall through to an empty argument object; the tool will ask for details.
  }
  return {};
}

function pushToolMessage(
  messages: GroqMessage[],
  call: GroqToolCall,
  result: Record<string, unknown>,
) {
  messages.push({
    role: "tool",
    tool_call_id: call.id,
    name: call.function.name,
    content: JSON.stringify(result).slice(0, 16_000),
  });
}

function fallbackReply(state: ToolState): string {
  if (state.appointment) {
    const appointment = state.appointment;
    const reminder = `A reminder is set for ${reminderLabel(
      appointment.reminderMinutesBefore,
    )} before.`;
    const moved = appointment.autoRebooked
      ? `Your requested slot on ${appointment.requestedDate} at ${appointment.requestedTime} was full, so I booked the next available slot on ${appointment.date} at ${appointment.time}.`
      : `Your appointment is confirmed with ${appointment.doctorName} on ${appointment.date} at ${appointment.time}.`;
    return `${moved} The reference is ${appointment.reference}. ${reminder} The clinic is at ${appointment.location}.`;
  }
  if (state.escalation) {
    return `I have opened ${state.escalation.priority}-priority case ${state.escalation.reference}. The clinic team can review the full conversation and your contact details.`;
  }
  if (state.order) {
    return `I found order #${state.order.id} for ${state.order.customer}: ${state.order.status}, ${state.order.currency} ${state.order.amount}, for ${state.order.items}.`;
  }
  const doctor = [...state.doctorsById.values()][0];
  if (doctor) {
    return `I found ${doctor.name} (${doctor.specialty}) at ${doctor.clinic}, ${doctor.address}. Phone ${doctor.phone}. Next available slots: ${doctor.nextSlots
      .map((slot) => `${slot.date} ${slot.time}`)
      .join(", ")}.`;
  }
  return "I could not complete that request. Please rephrase it or tell me the city and the type of help you need.";
}

function notificationSentence(
  status: "sent" | "queued" | "failed" | undefined,
  channel: "clinic" | "owner",
  reference: string,
) {
  if (status === "sent") {
    return `I also sent the details to the ${channel} through Telegram and opened case ${reference}.`;
  }
  if (status === "queued") {
    return `I opened case ${reference} and queued a Telegram alert; add the bot token in the owner dashboard to deliver it.`;
  }
  if (status === "failed") {
    return `I opened case ${reference}, but the Telegram alert failed. Please call the clinic directly.`;
  }
  return `I opened case ${reference} for follow-up.`;
}

function plainText(value: string) {
  return value
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1")
    .replace(/__([\s\S]+?)__/g, "$1")
    .replace(/`([^`\n]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeForMatch(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function postProcess(
  reply: string,
  state: ToolState,
  input: AgentInput,
): Promise<string> {
  let output = plainText(reply);
  const additions: string[] = [];

  const businessAutoEscalation =
    state.mode === "business" &&
    (state.triage.level !== null ||
      (state.keyInfo.intent === "refund_request" && Boolean(state.keyInfo.orderId)));

  if (
    (state.triage.level !== null || businessAutoEscalation) &&
    !state.escalation
  ) {
    const type: EscalationType =
      state.mode === "doctor"
        ? state.triage.level === "emergency"
          ? "emergency"
          : "urgent"
        : state.keyInfo.intent === "refund_request"
          ? "refund"
          : "support";
    const existing = findOpenEscalation(input.conversation.id, [type]);
    if (existing) {
      state.escalation = existing;
      const previous = listNotifications().find(
        (notification) => notification.relatedId === existing.id,
      );
      state.notificationStatus = previous?.status ?? "queued";
    } else {
      await escalateCase(
        {
          type,
          subject:
            state.mode === "doctor"
              ? `Urgent clinical request: ${state.keyInfo.symptoms ?? "symptoms reported"}`
              : `Owner follow-up: ${state.keyInfo.intent ?? "customer issue"}`,
          details: input.message,
        },
        state,
      );
    }
  }

  if (state.escalation) {
    const ref = state.escalation.reference;
    const mentionsReference = normalizeForMatch(output).includes(
      normalizeForMatch(ref),
    );
    if (!mentionsReference) {
      additions.push(
        notificationSentence(
          state.notificationStatus,
          state.mode === "doctor" ? "clinic" : "owner",
          ref,
        ),
      );
    }
  }

  if (state.appointment) {
    const appointment = state.appointment;
    const ref = appointment.reference;
    if (!normalizeForMatch(output).includes(normalizeForMatch(ref))) {
      additions.push(
        `Appointment ${ref} is confirmed with ${appointment.doctorName} on ${appointment.date} at ${appointment.time}.`,
      );
    }

    if (
      appointment.autoRebooked &&
      !/\b(full|unavailable|next available|next open)\b/i.test(output)
    ) {
      additions.push(
        `Your requested slot on ${appointment.requestedDate} at ${appointment.requestedTime} was full, so I booked the next open slot on ${appointment.date} at ${appointment.time}.`,
      );
    }

    if (!/\bremind/i.test(output)) {
      additions.push(
        `A reminder is set for ${reminderLabel(appointment.reminderMinutesBefore)} before the appointment.`,
      );
    }
  }

  if (state.order) {
    if (!output.includes(`#${state.order.id}`) && !output.includes(state.order.id)) {
      additions.push(
        `Verified order #${state.order.id}: ${state.order.status}, ${state.order.currency} ${state.order.amount}, for ${state.order.items}.`,
      );
    }
  }

  if (state.triage.level === "emergency") {
    if (!/\b(112|911|emergency department|ER)\b/i.test(output)) {
      additions.push(
        "If this is a medical emergency, call 112 (India) or 911 (US) now, or go to the nearest emergency department. Do not wait for a chat reply.",
      );
    }
  }

  if (state.mode === "doctor" && state.triage.level !== null) {
    const cards = [...state.doctorsById.values()];
    if (cards.length === 0) {
      const doctor = pickUrgentDoctor(state);
      if (doctor) {
        const card = doctorCard(doctor);
        state.doctorsById.set(doctor.id, card);
        cards.push(card);
      }
    }

    const primary = cards[0];
    if (
      primary &&
      !normalizeForMatch(output).includes(normalizeForMatch(primary.name))
    ) {
      const slots = primary.nextSlots
        .slice(0, 2)
        .map((slot) => `${slot.date} at ${slot.time}`)
        .join(" or ");
      const feeText = /^fee\b/i.test(primary.fee)
        ? primary.fee
        : `Fee ${primary.fee}`;
      additions.push(
        `Urgent option: ${primary.name} (${primary.specialty}), ${primary.clinic}, ${primary.address}. Phone ${primary.phone}. ${feeText}. Next slots: ${slots || "call the clinic for same-day availability"}.`,
      );
    }
  }

  if (additions.length > 0) {
    output = `${output}\n\n${additions.join("\n\n")}`;
  }

  return output;
}

export async function runAgent(input: AgentInput): Promise<AgentResult> {
  const triageUrgent = input.triage.level !== null;
  const state: ToolState = {
    mode: input.mode,
    conversationId: input.conversation.id,
    message: input.message,
    triage: input.triage,
    keyInfo: input.conversation.keyInfo,
    doctorsById: new Map(),
    tools: [],
  };

  const tools = TOOL_DEFINITIONS[input.mode];

  // Keep the prompt inside the free-tier TPM budget. Recent turns and the
  // extracted key facts carry the important context; older chat is on the
  // dashboard transcript.
  const historyBudget = 4_200;
  const history: GroqMessage[] = [];
  let usedHistory = 0;
  for (const message of [...input.conversation.messages].reverse()) {
    if (history.length >= 6) break;
    const content = message.content.slice(0, 1_200);
    if (usedHistory + content.length > historyBudget) break;
    history.push({ role: message.role, content });
    usedHistory += content.length;
  }
  history.reverse();

  const messages: GroqMessage[] = [
    { role: "system", content: buildSystemPrompt(input) },
    ...history,
  ];

  let reply = "";

  for (let round = 0; round < 4; round += 1) {
    let message: GroqChoiceMessage;
    try {
      // Once a real action has run, a rate-limited final call should not turn a
      // successful booking or escalation into an error. Fall back to the
      // deterministic action summary instead of waiting again.
      message = await requestGroq(
        messages,
        tools,
        "auto",
        state.tools.length > 0 ? 0 : 2,
      );
    } catch (error) {
      if (state.tools.length > 0 && error instanceof AgentRequestError) {
        console.warn(
          "[agent] final reply unavailable; using action summary fallback",
        );
        reply = fallbackReply(state);
        break;
      }
      throw error;
    }
    const toolCalls = message.tool_calls ?? [];

    if (toolCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: message.content ?? "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        const args = parseToolArgs(call.function.arguments);
        const result = await executeTool(call.function.name, args, state);
        pushToolMessage(messages, call, result);
      }
      continue;
    }

    if (message.content?.trim()) {
      reply = message.content.trim();
      break;
    }

    messages.push({
      role: "user",
      content:
        "Answer now using the retrieved knowledge and any tool results above. Do not return an empty response.",
    });
  }

  if (!reply) {
    try {
      const finalMessage = await requestGroq(
        messages,
        tools,
        "none",
        state.tools.length > 0 ? 0 : 2,
      );
      reply = finalMessage.content?.trim() ?? "";
    } catch (error) {
      if (state.tools.length > 0 && error instanceof AgentRequestError) {
        console.warn(
          "[agent] closing reply unavailable; using action summary fallback",
        );
      } else {
        throw error;
      }
    }
  }

  if (!reply) {
    reply = fallbackReply(state);
  }

  reply = await postProcess(reply, state, input);

  const keyInfoPatch: KeyInfo = {
    urgency: triageUrgent ? input.triage.level : state.keyInfo.urgency ?? null,
  };

  if (state.appointment) {
    keyInfoPatch.name = state.appointment.patientName;
    keyInfoPatch.phone = state.appointment.phone;
    keyInfoPatch.email = state.appointment.email;
    keyInfoPatch.doctor = state.appointment.doctorName;
    keyInfoPatch.specialty = state.appointment.doctorSpecialty;
    keyInfoPatch.location = state.appointment.location;
    keyInfoPatch.intent = "appointment_booking";
  }
  if (state.order) {
    keyInfoPatch.orderId = state.order.id;
    keyInfoPatch.name = state.order.customer;
    keyInfoPatch.email = state.order.email;
    keyInfoPatch.intent = state.order.status.toLowerCase().includes("refund")
      ? "refund_request"
      : "order_lookup";
  }
  if (state.escalation?.doctorName) {
    keyInfoPatch.doctor = state.escalation.doctorName;
  }
  if (state.escalation) {
    keyInfoPatch.intent =
      state.mode === "doctor"
        ? input.triage.level === "emergency"
          ? "emergency"
          : "urgent_triage"
        : state.order
          ? "refund_request"
          : "escalation";
  }

  return {
    reply,
    tools: state.tools,
    doctors: [...state.doctorsById.values()],
    appointment: state.appointment,
    escalation: state.escalation,
    order: state.order,
    notificationStatus: state.notificationStatus,
    keyInfoPatch: mergeKeyInfo(state.keyInfo, keyInfoPatch),
  };
}
