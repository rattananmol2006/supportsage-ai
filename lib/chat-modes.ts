import { Briefcase, Stethoscope, type LucideIcon } from "lucide-react";

export type ChatMode = "doctor" | "business";

export type ChatModeConfig = {
  id: ChatMode;
  label: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  greeting: string;
  suggestions: string[];
};

export const chatModes: ChatModeConfig[] = [
  {
    id: "doctor",
    label: "Doctor",
    tagline: "Clinical support copilot",
    description:
      "Explain clinical information, summarize symptoms, and draft patient-friendly follow-ups.",
    icon: Stethoscope,
    greeting:
      "Hi, I'm Sage in Doctor mode. I can help explain clinical information, summarize symptoms, and draft patient-friendly follow-ups. I don't replace clinical judgment — urgent symptoms should go to a licensed clinician or emergency services.",
    suggestions: [
      "Explain lab results in plain language",
      "Draft post-visit instructions",
      "Summarize a patient's symptoms",
    ],
  },
  {
    id: "business",
    label: "Business Owner",
    tagline: "Support operations copilot",
    description:
      "Draft customer replies, resolve escalations, and turn support metrics into decisions.",
    icon: Briefcase,
    greeting:
      "Hi, I'm Sage in Business Owner mode. I can help draft customer replies, handle refunds and escalations, and turn support metrics into decisions. What are you working on?",
    suggestions: [
      "Draft a refund response",
      "Summarize support metrics",
      "When should we escalate?",
    ],
  },
];

export const DEFAULT_CHAT_MODE: ChatMode = "doctor";

export function getChatMode(id: ChatMode) {
  return chatModes.find((mode) => mode.id === id) ?? chatModes[0];
}
