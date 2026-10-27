import { Briefcase, Stethoscope, type LucideIcon } from "lucide-react";

import type { ChatMode } from "@/lib/types";

export type { ChatMode };

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
      "Search the live doctor directory, check real slots, book visits, and escalate urgent symptoms.",
    icon: Stethoscope,
    greeting: "Hi, I am Sage. How can I assist you?",
    suggestions: [
      "I've had typhoid fever for 3 days",
      "Find a cardiologist in Mumbai",
      "Book Dr. Meera Iyer",
      "Show Dr. Vikram Deshmukh's schedule",
    ],
  },
  {
    id: "business",
    label: "Business Owner",
    tagline: "Support operations copilot",
    description:
      "Look up orders, apply refund policy, and escalate high-risk cases with a Telegram alert.",
    icon: Briefcase,
    greeting: "Hi, I am Sage. How can I assist you?",
    suggestions: [
      "Check order #1042 for a duplicate charge",
      "Customer wants a refund for order #1093",
      "Escalate an angry customer to the owner",
      "Summarize this week's support metrics",
    ],
  },
];

export const DEFAULT_CHAT_MODE: ChatMode = "doctor";

export function getChatMode(id: ChatMode) {
  return chatModes.find((mode) => mode.id === id) ?? chatModes[0];
}
