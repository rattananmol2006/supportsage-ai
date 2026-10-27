export type ChatMode = "doctor" | "business";

export type ChatRole = "user" | "assistant";

export type KnowledgeType =
  | "knowledge"
  | "doctor"
  | "order"
  | "policy"
  | "emergency";

export type SourceRef = {
  id: string;
  title: string;
  type: KnowledgeType;
};

export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  clinic: string;
  address: string;
  city: string;
  phone: string;
  secondaryPhone?: string;
  email?: string;
  hours: string;
  fee: string;
  languages: string;
  teleconsult: boolean;
  urgentCare: boolean;
  verified: boolean;
  workingDays: number[];
  slotStart: string;
  slotEnd: string;
  slotMinutes: number;
  sourceTitle?: string;
  sourceUrl?: string;
  telegramChatId?: string;
  createdAt: string;
};

export type PublicDoctor = Omit<Doctor, "telegramChatId"> & {
  telegramConfigured: boolean;
  telegramChatIdMasked?: string;
};

export type ScheduleSlot = {
  date: string;
  time: string;
};

export type ScheduleDay = ScheduleSlot & {
  label: string;
  slots: string[];
};

export type DoctorResult = PublicDoctor & {
  nextSlots: ScheduleSlot[];
};

export type EmergencyContact = {
  label: string;
  value: string;
  href: string;
};

export type AppointmentStatus = "confirmed" | "completed" | "cancelled";

export type Appointment = {
  id: string;
  reference: string;
  conversationId?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  clinic: string;
  location: string;
  patientName: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  durationMinutes: number;
  reason: string;
  timezone: string;
  status: AppointmentStatus;
  calendarUrl: string;
  icsUrl: string;
  reminderMinutesBefore: number;
  reminderAt: string;
  requestedDate?: string;
  requestedTime?: string;
  autoRebooked?: boolean;
  googleEventId?: string;
  googleEventLink?: string;
  googleSyncedAt?: string;
  googleSyncError?: string;
  notificationStatus: "sent" | "queued" | "failed";
  createdAt: string;
};

export type CalendarDoctorAvailability = {
  doctorId: string;
  doctorName: string;
  specialty: string;
  openSlots: number;
  bookedSlots: number;
};

export type CalendarDay = {
  date: string;
  label: string;
  isToday: boolean;
  isPast: boolean;
  openSlots: number;
  bookedSlots: number;
  doctors: CalendarDoctorAvailability[];
};

export type StoredMessage = {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  sources?: SourceRef[];
  tools?: string[];
  doctors?: DoctorResult[];
  appointment?: Appointment;
  escalation?: Escalation;
  order?: Order;
  emergencyContacts?: EmergencyContact[];
  notificationStatus?: "sent" | "queued" | "failed";
  urgent?: boolean;
  urgencyLevel?: "emergency" | "urgent" | null;
};

export type KeyInfo = {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
  symptoms?: string;
  duration?: string;
  specialty?: string;
  doctor?: string;
  orderId?: string;
  intent?: string;
  urgency?: "emergency" | "urgent" | null;
};

export type Conversation = {
  id: string;
  mode: ChatMode;
  title: string;
  summary: string;
  keyInfo: KeyInfo;
  messages: StoredMessage[];
  sources: SourceRef[];
  tools: string[];
  urgent: boolean;
  appointmentIds: string[];
  escalationIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type ConversationSummary = Omit<Conversation, "messages"> & {
  messageCount: number;
  lastMessage: string;
};

export type EscalationType =
  | "emergency"
  | "urgent"
  | "refund"
  | "support"
  | "general";

export type Escalation = {
  id: string;
  reference: string;
  conversationId?: string;
  mode: ChatMode;
  type: EscalationType;
  subject: string;
  details: string;
  priority: "high" | "medium" | "low";
  status: "open" | "acknowledged" | "resolved";
  doctorId?: string;
  doctorName?: string;
  createdAt: string;
};

export type Notification = {
  id: string;
  channel: "telegram";
  recipient: string;
  message: string;
  status: "sent" | "queued" | "failed";
  error?: string;
  relatedType?: "appointment" | "escalation" | "test";
  relatedId?: string;
  createdAt: string;
};

export type Order = {
  id: string;
  customer: string;
  email: string;
  amount: number;
  currency: string;
  status: string;
  items: string;
  duplicateCharge: boolean;
  notes: string;
  createdAt: string;
};

export type Settings = {
  clinicName: string;
  clinicPhone: string;
  timezone: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  googleCalendarId?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  googleTokenExpiresAt?: string;
  googleScope?: string;
  googleConnectedEmail?: string;
  googleConnectedAt?: string;
};

export type PublicSettings = {
  clinicName: string;
  clinicPhone: string;
  timezone: string;
  telegramConnected: boolean;
  telegramChatIdMasked: string;
  telegramSource: "dashboard" | "environment" | "none";
  googleClientId: string;
  googleClientConfigured: boolean;
  googleClientSource: "dashboard" | "environment" | "none";
  googleConnected: boolean;
  googleEmail?: string;
  googleRedirectUri: string;
  googleCalendarId: string;
  googleConnectedAt?: string;
};

export type Database = {
  seedVersion?: number;
  conversations: Conversation[];
  doctors: Doctor[];
  appointments: Appointment[];
  escalations: Escalation[];
  notifications: Notification[];
  orders: Order[];
  settings: Settings;
};

export type ChatResponse = {
  conversationId: string;
  title: string;
  summary: string;
  keyInfo: KeyInfo;
  reply: string;
  sources: SourceRef[];
  tools: string[];
  doctors: DoctorResult[];
  appointment?: Appointment;
  escalation?: Escalation;
  order?: Order;
  emergencyContacts: EmergencyContact[];
  urgent: boolean;
  urgencyLevel: "emergency" | "urgent" | null;
  notificationStatus?: "sent" | "queued" | "failed";
};

export type ConversationDetail = {
  conversation: Conversation;
  appointments: Appointment[];
  escalations: Escalation[];
  notifications: Notification[];
};

export type KnowledgeDocSummary = {
  id: string;
  title: string;
  type: KnowledgeType;
  mode: ChatMode | "shared";
};

export type DashboardPayload = {
  stats: {
    conversations: number;
    urgentConversations: number;
    appointments: number;
    escalations: number;
    notifications: number;
    doctors: number;
    orders: number;
    messages: number;
  };
  knowledge: {
    documents: number;
    doctorKnowledge: number;
    businessKnowledge: number;
    docs: KnowledgeDocSummary[];
  };
  conversations: ConversationSummary[];
  appointments: Appointment[];
  calendar: CalendarDay[];
  escalations: Escalation[];
  notifications: Notification[];
  doctors: PublicDoctor[];
  orders: Order[];
  settings: PublicSettings;
  integrations: {
    groq: boolean;
    telegram: boolean;
    googleCalendar: "oauth" | "event-links-and-ics";
    database: "local-json";
  };
};
