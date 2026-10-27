import type { ChatMode } from "@/lib/types";

export type TriageLevel = "emergency" | "urgent" | null;

export type TriageAssessment = {
  level: TriageLevel;
  reasons: string[];
};

type Signal = {
  label: string;
  pattern: RegExp;
};

const clinicalEmergencySignals: Signal[] = [
  { label: "chest pain or pressure", pattern: /\bchest (pain|pressure|tightness)\b/i },
  {
    label: "difficulty breathing",
    pattern:
      /\b(can'?t breathe|cannot breathe|difficulty breathing|shortness of breath|breathless|gasping)\b/i,
  },
  {
    label: "loss of consciousness",
    pattern: /\b(unconscious|passed out|fainted|fainting|unresponsive)\b/i,
  },
  { label: "seizure", pattern: /\b(seizure|convulsion|fitting)\b/i },
  {
    label: "stroke signs",
    pattern:
      /\b(stroke|face droop|facial droop|slurred speech|sudden weakness|one side weak)\b/i,
  },
  {
    label: "severe bleeding",
    pattern:
      /\b(severe bleeding|heavy bleeding|bleeding heavily|blood loss|bleeding won'?t stop)\b/i,
  },
  {
    label: "severe abdominal pain",
    pattern: /\b(severe|unbearable|worst) (abdominal|stomach) pain\b/i,
  },
  {
    label: "confusion",
    pattern: /\b(confused|confusion|disoriented|not making sense)\b/i,
  },
  {
    label: "self-harm risk",
    pattern:
      /\b(suicid|self[- ]?harm|kill myself|end my life|overdose|took too many pills)\b/i,
  },
  {
    label: "pregnancy emergency",
    pattern:
      /\b(pregnan\w*).{0,40}\b(bleeding|severe pain|no movement|decreased movement)\b/i,
  },
  {
    label: "infant under three months with fever",
    pattern:
      /\b(newborn|infant|baby).{0,30}\b(fever|temperature)\b|\b(under|less than) 3 months\b.{0,30}\bfever\b/i,
  },
  {
    label: "anaphylaxis",
    pattern:
      /\b(throat swelling|tongue swelling|lip swelling|anaphylaxis|allergic reaction).{0,50}\b(breath|wheez|swell)\b/i,
  },
];

const clinicalUrgentSignals: Signal[] = [
  { label: "suspected typhoid", pattern: /\b(typhoid|enteric fever)\b/i },
  {
    label: "fever for three or more days",
    pattern:
      /\bfever\b.{0,40}\b([3-9]|[1-9][0-9])\s*(days?|d)\b|\b([3-9]|[1-9][0-9])\s*(days?|d)\b.{0,30}\bfever\b/i,
  },
  {
    label: "high fever",
    pattern: /\b(high fever|fever (above|over) 39|10[2-9](\.\d)?\s*°?\s*f)\b/i,
  },
  {
    label: "persistent vomiting or dehydration",
    pattern:
      /\b(persistent vomiting|vomiting (all|everything)|can'?t keep (fluids|water|anything) down|dehydrat\w*)\b/i,
  },
  {
    label: "bloody or black stools",
    pattern: /\b(bloody stool|blood in stool|black stool|tarry stool)\b/i,
  },
  {
    label: "possible dengue or malaria",
    pattern: /\b(dengue|malaria)\b/i,
  },
  {
    label: "dizziness or severe headache",
    pattern: /\b(severe headache|very dizzy|dizzy|lightheaded)\b/i,
  },
  {
    label: "infection concern",
    pattern:
      /\b(i have|i've had|i am having|suffering from|facing)\b.{0,30}\b(infection|infected)\b|\b(antibiotic|antibiotics)\b.{0,30}\b(need|take|start|prescribed)\b/i,
  },
];

const businessEmergencySignals: Signal[] = [
  {
    label: "security breach or data loss",
    pattern:
      /\b(data loss|lost (all )?(our )?data|data breach|breach|ransomware|hacked|unauthori[sz]ed access|leaked credentials|customer data exposed)\b/i,
  },
  {
    label: "fraud or legal escalation",
    pattern: /\b(fraud|stolen card|law ?suit|legal action|regulator|chargeback)\b/i,
  },
];

const businessUrgentSignals: Signal[] = [
  {
    label: "duplicate charge",
    pattern: /\b(duplicate|double) (charge|charged|payment|capture)\b/i,
  },
  {
    label: "refund request tied to an order",
    pattern:
      /\b(refund|money back)\b.{0,50}\b(order|#?\d{3,}|charged|duplicate|purchase)\b|\b(order|#?\d{3,})\b.{0,50}\b(refund|money back)\b/i,
  },
  {
    label: "angry or escalating customer",
    pattern:
      /\b(angry|furious|frustrated|unacceptable|manager|supervisor|human|escalat\w*|complaint)\b/i,
  },
  {
    label: "account access issue",
    pattern: /\b(locked out|can'?t log in|cannot log in|password reset|account access)\b/i,
  },
];

function collect(text: string, signals: Signal[]) {
  return signals
    .filter((signal) => signal.pattern.test(text))
    .map((signal) => signal.label);
}

export function assessUrgency(message: string, mode: ChatMode): TriageAssessment {
  if (mode === "business") {
    const emergency = collect(message, businessEmergencySignals);
    if (emergency.length > 0) {
      return { level: "emergency", reasons: emergency };
    }

    const urgent = collect(message, businessUrgentSignals);
    if (urgent.length > 0) {
      return { level: "urgent", reasons: urgent };
    }

    return { level: null, reasons: [] };
  }

  const emergency = collect(message, clinicalEmergencySignals);
  if (emergency.length > 0) {
    return { level: "emergency", reasons: emergency };
  }

  const urgent = collect(message, clinicalUrgentSignals);
  if (urgent.length > 0) {
    return { level: "urgent", reasons: urgent };
  }

  return { level: null, reasons: [] };
}

export function triageLabel(level: TriageLevel) {
  if (level === "emergency") return "Emergency";
  if (level === "urgent") return "Urgent";
  return "Routine";
}
