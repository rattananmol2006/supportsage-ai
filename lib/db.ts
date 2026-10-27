import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createSeedDatabase } from "@/lib/seed";
import type {
  Appointment,
  ChatMode,
  Conversation,
  ConversationSummary,
  Database,
  Doctor,
  Escalation,
  EscalationType,
  Notification,
  PublicDoctor,
  PublicSettings,
  Settings,
  StoredMessage,
} from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "supportsage.json");

let cached: Database | null = null;

function normalize(parsed: Partial<Database>): Database {
  const seed = createSeedDatabase();
  const doctors = (parsed.doctors?.length ? parsed.doctors : seed.doctors).map(
    (doctor) => ({
      ...doctor,
      secondaryPhone: doctor.secondaryPhone || undefined,
      verified: doctor.verified ?? false,
      workingDays: doctor.workingDays?.length
        ? doctor.workingDays
        : [1, 2, 3, 4, 5],
      slotMinutes: doctor.slotMinutes || 30,
    }),
  );

  return {
    conversations: parsed.conversations ?? seed.conversations,
    doctors,
    appointments: parsed.appointments ?? seed.appointments,
    escalations: parsed.escalations ?? seed.escalations,
    notifications: parsed.notifications ?? seed.notifications,
    orders: parsed.orders ?? seed.orders,
    settings: { ...seed.settings, ...(parsed.settings ?? {}) },
  };
}

function maskChatId(chatId?: string) {
  if (!chatId) return "";
  if (chatId.length <= 6) return chatId;
  return `${chatId.slice(0, 3)}•••${chatId.slice(-3)}`;
}

function readDb(): Database {
  if (cached) return cached;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf8");
      cached = normalize(JSON.parse(raw) as Partial<Database>);
    } else {
      cached = createSeedDatabase();
      writeDb(cached);
    }
  } catch (error) {
    console.error("[db] failed to read database, starting from seed", error);
    cached = createSeedDatabase();
  }

  return cached;
}

function writeDb(db: Database) {
  cached = db;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    const tempFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(db, null, 2), "utf8");
    fs.renameSync(tempFile, DATA_FILE);
  } catch (error) {
    console.error("[db] failed to persist database", error);
  }
}

function mutate<T>(fn: (db: Database) => T): T {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function publicDoctor(doctor: Doctor): PublicDoctor {
  const { telegramChatId, ...rest } = doctor;
  return {
    ...rest,
    telegramConfigured: Boolean(telegramChatId),
    telegramChatIdMasked: telegramChatId
      ? maskChatId(telegramChatId)
      : undefined,
  };
}

export function listDoctors(): Doctor[] {
  return [...readDb().doctors].sort((a, b) => a.name.localeCompare(b.name));
}

export function findDoctor(id: string): Doctor | undefined {
  return readDb().doctors.find((doctor) => doctor.id === id);
}

export function addDoctor(
  input: Omit<Doctor, "id" | "createdAt">,
): Doctor {
  return mutate((db) => {
    const base = input.name
      .toLowerCase()
      .replace(/^dr\.?\s*/, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const existingIds = new Set(db.doctors.map((doctor) => doctor.id));
    let id = `dr-${base || randomUUID().slice(0, 8)}`;
    let suffix = 2;

    while (existingIds.has(id)) {
      id = `dr-${base}-${suffix}`;
      suffix += 1;
    }

    const doctor: Doctor = {
      ...input,
      id,
      createdAt: new Date().toISOString(),
    };

    db.doctors.push(doctor);
    return doctor;
  });
}

export function removeDoctor(id: string): boolean {
  return mutate((db) => {
    const index = db.doctors.findIndex((doctor) => doctor.id === id);
    if (index === -1) return false;
    db.doctors.splice(index, 1);
    return true;
  });
}

export function createConversation(mode: ChatMode, title: string): Conversation {
  return mutate((db) => {
    const now = new Date().toISOString();
    const conversation: Conversation = {
      id: `conv-${randomUUID()}`,
      mode,
      title,
      summary: "New conversation",
      keyInfo: {},
      messages: [],
      sources: [],
      tools: [],
      urgent: false,
      appointmentIds: [],
      escalationIds: [],
      createdAt: now,
      updatedAt: now,
    };

    db.conversations.unshift(conversation);
    return conversation;
  });
}

export function findConversation(id: string): Conversation | undefined {
  return readDb().conversations.find((conversation) => conversation.id === id);
}

export function conversationSummary(
  conversation: Conversation,
): ConversationSummary {
  const { messages, ...rest } = conversation;
  return {
    ...rest,
    messageCount: messages.length,
    lastMessage: messages.at(-1)?.content.slice(0, 160) ?? "",
  };
}

export function listConversations(mode?: ChatMode): ConversationSummary[] {
  return readDb()
    .conversations.filter((conversation) => !mode || conversation.mode === mode)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(conversationSummary);
}

export function appendMessage(
  conversationId: string,
  message: StoredMessage,
): void {
  mutate((db) => {
    const conversation = db.conversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;

    conversation.messages.push(message);
    conversation.updatedAt = message.createdAt;

    for (const source of message.sources ?? []) {
      if (!conversation.sources.some((item) => item.id === source.id)) {
        conversation.sources.push(source);
      }
    }

    for (const tool of message.tools ?? []) {
      if (!conversation.tools.includes(tool)) {
        conversation.tools.push(tool);
      }
    }

    if (message.urgent) conversation.urgent = true;
    if (message.appointment) {
      conversation.appointmentIds.push(message.appointment.id);
    }
  });
}

export function updateConversation(
  conversationId: string,
  patch: Partial<
    Pick<
      Conversation,
      "title" | "summary" | "keyInfo" | "urgent" | "escalationIds"
    >
  >,
): void {
  mutate((db) => {
    const conversation = db.conversations.find(
      (item) => item.id === conversationId,
    );
    if (!conversation) return;

    Object.assign(conversation, patch);
    conversation.updatedAt = new Date().toISOString();
  });
}

export function deleteConversation(id: string): boolean {
  return mutate((db) => {
    const index = db.conversations.findIndex(
      (conversation) => conversation.id === id,
    );
    if (index === -1) return false;
    db.conversations.splice(index, 1);
    return true;
  });
}

export function getOrder(orderId: string) {
  const normalized = orderId.replace(/^#/, "").trim();
  return readDb().orders.find((order) => order.id === normalized);
}

export function listOrders() {
  return [...readDb().orders].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function createAppointment(
  input: Omit<Appointment, "id" | "createdAt">,
): Appointment {
  return mutate((db) => {
    const appointment: Appointment = {
      ...input,
      id: `apt-${randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    db.appointments.push(appointment);
    return appointment;
  });
}

export function listAppointments(): Appointment[] {
  return [...readDb().appointments].sort((a, b) =>
    `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
  );
}

export function findAppointment(id: string): Appointment | undefined {
  return readDb().appointments.find((appointment) => appointment.id === id);
}

export function updateAppointment(
  id: string,
  patch: Partial<Appointment>,
): Appointment | undefined {
  return mutate((db) => {
    const appointment = db.appointments.find((item) => item.id === id);
    if (!appointment) return undefined;
    Object.assign(appointment, patch);
    return appointment;
  });
}

export function createEscalation(
  input: Omit<Escalation, "id" | "createdAt">,
): Escalation {
  return mutate((db) => {
    const escalation: Escalation = {
      ...input,
      id: `esc-${randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    db.escalations.unshift(escalation);
    return escalation;
  });
}

export function listEscalations(): Escalation[] {
  return [...readDb().escalations].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function updateEscalation(
  id: string,
  patch: Partial<Escalation>,
): Escalation | undefined {
  return mutate((db) => {
    const escalation = db.escalations.find((item) => item.id === id);
    if (!escalation) return undefined;
    Object.assign(escalation, patch);
    return escalation;
  });
}

export function findOpenEscalation(
  conversationId: string,
  types: EscalationType[],
): Escalation | undefined {
  return readDb().escalations.find(
    (escalation) =>
      escalation.conversationId === conversationId &&
      escalation.status === "open" &&
      types.includes(escalation.type),
  );
}

export function recordNotification(
  input: Omit<Notification, "id" | "createdAt">,
): Notification {
  return mutate((db) => {
    const notification: Notification = {
      ...input,
      id: `notif-${randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    db.notifications.unshift(notification);
    return notification;
  });
}

export function listNotifications(): Notification[] {
  return [...readDb().notifications].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export function getSettings(): Settings {
  return { ...readDb().settings };
}

export function publicSettings(): PublicSettings {
  const settings = getSettings();
  const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = settings.telegramChatId || process.env.TELEGRAM_CHAT_ID;

  return {
    clinicName: settings.clinicName,
    clinicPhone: settings.clinicPhone,
    timezone: settings.timezone,
    telegramConnected: Boolean(token && chatId),
    telegramChatIdMasked: maskChatId(chatId),
    telegramSource: settings.telegramBotToken
      ? "dashboard"
      : token
        ? "environment"
        : "none",
  };
}

export function updateSettings(patch: Partial<Settings>): Settings {
  return mutate((db) => {
    db.settings = { ...db.settings, ...patch };
    return { ...db.settings };
  });
}

export function databaseStats() {
  const db = readDb();
  const upcoming = db.appointments.filter(
    (appointment) => appointment.status === "confirmed",
  );

  return {
    conversations: db.conversations.length,
    urgentConversations: db.conversations.filter(
      (conversation) => conversation.urgent,
    ).length,
    appointments: upcoming.length,
    escalations: db.escalations.filter(
      (escalation) => escalation.status === "open",
    ).length,
    notifications: db.notifications.filter(
      (notification) => notification.status === "sent",
    ).length,
    doctors: db.doctors.length,
    orders: db.orders.length,
  };
}

export function totalMessageCount(): number {
  return readDb().conversations.reduce(
    (total, conversation) => total + conversation.messages.length,
    0,
  );
}
