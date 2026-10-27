import type {
  Appointment,
  ChatMode,
  Conversation,
  Doctor,
  Escalation,
  KeyInfo,
  Order,
} from "@/lib/types";
import { assessUrgency, type TriageLevel } from "@/lib/triage";

const SYMPTOM_TERMS = [
  "typhoid",
  "fever",
  "high fever",
  "chills",
  "headache",
  "severe headache",
  "stomach pain",
  "abdominal pain",
  "cramps",
  "vomiting",
  "nausea",
  "diarrhea",
  "diarrhoea",
  "constipation",
  "rash",
  "weakness",
  "fatigue",
  "cough",
  "sore throat",
  "breathlessness",
  "chest pain",
  "dizziness",
  "bleeding",
  "loss of appetite",
  "dehydration",
  "swelling",
  "back pain",
  "joint pain",
  "blood sugar",
  "blood pressure",
];

const SPECIALTY_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: "Cardiology", pattern: /\b(cardio|heart|chest pain)\w*/i },
  { label: "Pediatrics", pattern: /\b(pediatric|paediatric|child|children|baby|infant)\w*/i },
  { label: "Dermatology", pattern: /\b(dermatolog|skin|rash|acne|eczema)\w*/i },
  { label: "Orthopaedics", pattern: /\b(orthopaed|orthoped|fracture|bone|joint|knee|sprain)\w*/i },
  { label: "Endocrinology & Diabetes", pattern: /\b(endocrin|diabetes|diabetic|thyroid|sugar|glucose)\w*/i },
  { label: "Obstetrics & Gynaecology", pattern: /\b(pregnan|obstetric|gynaec|gynec|women'?s health)\w*/i },
  { label: "Internal Medicine & Infectious Disease", pattern: /\b(internal medicine|infectious|infection|typhoid|fever)\w*/i },
  { label: "Urgent Care & General Medicine", pattern: /\b(urgent care|same[- ]day|general medicine|general physician)\w*/i },
];

const EXTRA_CITIES = [
  "Bengaluru",
  "Bangalore",
  "Mumbai",
  "Hyderabad",
  "New Delhi",
  "Delhi",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
  "Chandigarh",
  "Kochi",
  "Goa",
];

const INTENT_LABELS: Record<string, string> = {
  emergency: "emergency triage",
  urgent_triage: "urgent clinical triage",
  appointment_booking: "appointment booking",
  schedule_lookup: "doctor schedule lookup",
  doctor_search: "doctor search",
  lab_explanation: "lab-result explanation",
  clinical_question: "clinical question",
  refund_request: "refund request",
  order_lookup: "order lookup",
  security_incident: "security incident",
  metrics_review: "support metrics review",
  escalation: "customer escalation",
  support_question: "customer-support question",
  general: "general conversation",
};

function cleanName(value: string) {
  const trimmed = value
    .trim()
    .replace(/[.,!?;:]+$/, "")
    .split(/\s+/)
    .filter(
      (part) =>
        ![
          "and",
          "but",
          "i",
          "im",
          "i'm",
          "is",
          "am",
          "the",
          "my",
          "name",
          "patient",
        ].includes(part.toLowerCase()),
    )
    .slice(0, 3)
    .join(" ");
  return trimmed.length >= 2 ? trimmed : "";
}

function normalizePhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  const count = digits.replace(/\D/g, "").length;
  return count >= 10 && count <= 15 ? digits : "";
}

function wordToNumber(value: string) {
  const map: Record<string, string> = {
    one: "1",
    two: "2",
    three: "3",
    four: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8",
    nine: "9",
    ten: "10",
  };
  return map[value.toLowerCase()] ?? value;
}

export function detectIntent(text: string, mode: ChatMode): string {
  const lower = text.toLowerCase();
  const urgency = assessUrgency(text, mode);

  if (mode === "business") {
    if (urgency.level === "emergency") return "security_incident";
    if (/\b(refund|duplicate|chargeback|money back)\b/.test(lower)) {
      return "refund_request";
    }
    if (/\b(order|purchase|subscription|invoice|account)\b/.test(lower)) {
      return "order_lookup";
    }
    if (/\b(metric|analytics|deflection|resolution rate|cost per|report)\b/.test(lower)) {
      return "metrics_review";
    }
    if (/\b(escalat|angry|manager|human|complaint)\b/.test(lower)) {
      return "escalation";
    }
    return "support_question";
  }

  if (urgency.level === "emergency") return "emergency";
  if (urgency.level === "urgent") return "urgent_triage";
  if (/\b(book|booking|appointment|reschedule|cancel)\b/.test(lower)) {
    return "appointment_booking";
  }
  if (/\b(schedule|availability|available slot|next slot|timing)\b/.test(lower)) {
    return "schedule_lookup";
  }
  if (/\b(lab|blood test|report|results|reference range)\b/.test(lower)) {
    return "lab_explanation";
  }
  if (
    /\b(doctor|specialist|nearest|nearby|clinic|contact|phone|address|cardiolog|pediatric|dermatolog|orthopaed)\b/.test(
      lower,
    )
  ) {
    return "doctor_search";
  }
  if (/\b(pain|fever|symptom|sick|ill|hurt|ache|rash|vomit|diarr)\b/.test(lower)) {
    return "clinical_question";
  }
  return "general";
}

export function intentLabel(intent?: string) {
  if (!intent) return "General conversation";
  return INTENT_LABELS[intent] ?? intent.replace(/_/g, " ");
}

export function extractKeyInfo(
  text: string,
  doctors: Doctor[],
  mode: ChatMode,
): KeyInfo {
  const keyInfo: KeyInfo = {};
  const lower = text.toLowerCase();

  const nameMatch =
    text.match(
      /\bmy name is\s+([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,2})/i,
    ) ??
    text.match(
      /\bname\s*[:\-]\s*([A-Za-z][A-Za-z'.-]*(?:\s+[A-Za-z][A-Za-z'.-]*){0,2})/i,
    );
  if (nameMatch) {
    const name = cleanName(nameMatch[1]);
    if (name) keyInfo.name = name;
  }

  const phoneMatches = text.match(/\+?\d[\d\s().-]{8,}\d/g) ?? [];
  for (const candidate of phoneMatches) {
    const phone = normalizePhone(candidate);
    if (phone) {
      keyInfo.phone = phone;
      break;
    }
  }

  const emailMatch = text.match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  );
  if (emailMatch) keyInfo.email = emailMatch[0];

  const cities = new Set([
    ...EXTRA_CITIES,
    ...doctors.map((doctor) => doctor.city),
  ]);
  let bestCity: { city: string; index: number } | null = null;
  for (const city of cities) {
    const index = lower.indexOf(city.toLowerCase());
    if (index === -1) continue;
    if (!bestCity || index < bestCity.index) bestCity = { city, index };
  }
  if (bestCity) keyInfo.location = bestCity.city;

  const symptoms = SYMPTOM_TERMS.filter((term) =>
    new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
      text,
    ),
  );
  if (symptoms.length > 0) keyInfo.symptoms = [...new Set(symptoms)].join(", ");

  const durationMatch = text.match(
    /\b(?:for|since|last|past)\s+(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|week|weeks|month|months|hour|hours)\b/i,
  );
  const bareDuration = text.match(
    /\b(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|week|weeks)\b/i,
  );
  const duration = durationMatch ?? bareDuration;
  if (duration) {
    keyInfo.duration = `${wordToNumber(duration[1])} ${duration[2].toLowerCase()}`;
  }

  if (mode === "doctor") {
    const specialty = SPECIALTY_RULES.find((rule) => rule.pattern.test(text));
    if (specialty) keyInfo.specialty = specialty.label;

    let matchedDoctor = "";
    for (const doctor of doctors) {
      const fullName = doctor.name.replace(/^Dr\.?\s*/i, "");
      if (
        lower.includes(doctor.name.toLowerCase()) ||
        lower.includes(fullName.toLowerCase())
      ) {
        matchedDoctor = doctor.name;
        break;
      }
      const lastName = fullName.split(/\s+/).at(-1) ?? "";
      if (
        lastName.length > 3 &&
        new RegExp(
          `\\bDr\\.?\\s+${lastName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        ).test(text)
      ) {
        matchedDoctor = doctor.name;
        break;
      }
    }
    if (matchedDoctor) keyInfo.doctor = matchedDoctor;
  }

  const orderMatch =
    text.match(/\border\s*#?\s*(\d{3,})\b/i) ?? text.match(/#(\d{3,})\b/);
  if (orderMatch) keyInfo.orderId = orderMatch[1];

  const urgency = assessUrgency(text, mode);
  if (urgency.level) keyInfo.urgency = urgency.level;
  keyInfo.intent = detectIntent(text, mode);

  return keyInfo;
}

export function mergeKeyInfo(base: KeyInfo, patch: KeyInfo): KeyInfo {
  const merged: KeyInfo = { ...base };
  if (patch.name) merged.name = patch.name;
  if (patch.phone) merged.phone = patch.phone;
  if (patch.email) merged.email = patch.email;
  if (patch.location) merged.location = patch.location;
  if (patch.duration) merged.duration = patch.duration;
  if (patch.specialty) merged.specialty = patch.specialty;
  if (patch.doctor) merged.doctor = patch.doctor;
  if (patch.orderId) merged.orderId = patch.orderId;
  if (patch.intent) merged.intent = patch.intent;

  if (patch.symptoms) {
    const existing = new Set(
      (merged.symptoms ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    );
    for (const symptom of patch.symptoms.split(",").map((item) => item.trim())) {
      if (symptom) existing.add(symptom);
    }
    if (existing.size > 0) merged.symptoms = [...existing].join(", ");
  }

  if (base.urgency === "emergency" || patch.urgency === "emergency") {
    merged.urgency = "emergency";
  } else if (base.urgency === "urgent" || patch.urgency === "urgent") {
    merged.urgency = "urgent";
  }

  return merged;
}

export function titleFrom(message: string, level: TriageLevel): string {
  let title = message
    .replace(/^\s*(hi|hello|hey|good (morning|afternoon|evening))[\s,!.-]*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!title) title = "New conversation";
  title = title.charAt(0).toUpperCase() + title.slice(1);

  if (title.length > 58) {
    const clipped = title.slice(0, 58);
    title = `${clipped.slice(0, clipped.lastIndexOf(" ") || 58)}…`;
  }

  if (level === "emergency") return `Emergency · ${title}`;
  if (level === "urgent") return `Urgent · ${title}`;
  return title;
}

type SummaryExtras = {
  appointment?: Appointment;
  escalation?: Escalation;
  notificationStatus?: "sent" | "queued" | "failed";
  order?: Order;
};

export function buildConversationSummary(
  conversation: Conversation,
  extras: SummaryExtras = {},
): string {
  const { keyInfo } = conversation;
  const parts: string[] = [];
  const intent = intentLabel(keyInfo.intent);
  parts.push(
    `${conversation.mode === "doctor" ? "Doctor-mode" : "Business-mode"} ${intent}.`,
  );

  const facts: string[] = [];
  if (keyInfo.name) facts.push(`contact ${keyInfo.name}`);
  if (keyInfo.symptoms) facts.push(`symptoms: ${keyInfo.symptoms}`);
  if (keyInfo.duration) facts.push(`duration: ${keyInfo.duration}`);
  if (keyInfo.location) facts.push(`location: ${keyInfo.location}`);
  if (keyInfo.orderId) facts.push(`order #${keyInfo.orderId}`);
  if (keyInfo.phone) facts.push(`phone ${keyInfo.phone}`);
  if (facts.length > 0) {
    parts.push(`Captured ${facts.join("; ")}.`);
  }

  const doctor =
    [...conversation.messages]
      .reverse()
      .flatMap((message) => message.doctors ?? [])[0] ??
    (keyInfo.doctor
      ? conversation.messages
          .flatMap((message) => message.doctors ?? [])
          .find((item) => item.name === keyInfo.doctor)
      : undefined);
  if (conversation.mode === "doctor" && doctor) {
    parts.push(
      `Matched ${doctor.name} (${doctor.specialty}, ${doctor.city}) with contact and live slots.`,
    );
  } else if (conversation.mode === "doctor" && keyInfo.doctor) {
    parts.push(`Doctor referenced: ${keyInfo.doctor}.`);
  }

  if (extras.order) {
    parts.push(
      `Verified order #${extras.order.id} for ${extras.order.customer}: ${extras.order.status}, ${extras.order.currency} ${extras.order.amount}.`,
    );
  }

  if (extras.appointment) {
    parts.push(
      `Booked ${extras.appointment.reference} with ${extras.appointment.doctorName} on ${extras.appointment.date} at ${extras.appointment.time}.`,
    );
  }

  if (extras.escalation) {
    parts.push(
      `Opened ${extras.escalation.priority}-priority ${extras.escalation.type} escalation ${extras.escalation.reference}${
        extras.escalation.doctorName
          ? ` for ${extras.escalation.doctorName}`
          : ""
      }.`,
    );
  }

  if (conversation.sources.length > 0) {
    const titles = conversation.sources
      .slice(0, 2)
      .map((source) => source.title)
      .join("; ");
    parts.push(
      `Grounded in ${conversation.sources.length} retrieved source${
        conversation.sources.length === 1 ? "" : "s"
      }: ${titles}.`,
    );
  }

  if (extras.notificationStatus) {
    if (extras.notificationStatus === "sent") {
      parts.push("Telegram alert sent.");
    } else if (extras.notificationStatus === "queued") {
      parts.push("Telegram alert queued because the bot is not configured.");
    } else {
      parts.push("Telegram alert failed and needs owner follow-up.");
    }
  }

  if (keyInfo.urgency === "emergency") {
    parts.push("Emergency triage is active; the transcript should be reviewed immediately.");
  } else if (keyInfo.urgency === "urgent") {
    parts.push("Urgent follow-up is recommended.");
  }

  return parts.join(" ");
}
