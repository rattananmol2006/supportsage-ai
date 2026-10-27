import {
  BarChart3,
  ClipboardCheck,
  Cpu,
  Database,
  Layers,
  MessageSquareText,
  MessagesSquare,
  PhoneCall,
  ScrollText,
  Server,
  ShieldCheck,
  UserCheck,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavLink = {
  label: string;
  href: string;
};

export type Capability = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export type PipelineStep = {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type Metric = {
  value: string;
  label: string;
  detail: string;
  heroLabel?: string;
};

export type TechCategory = {
  category: string;
  items: string[];
  icon: LucideIcon;
};

export const navLinks: NavLink[] = [
  { label: "Features", href: "#features" },
  { label: "Pipeline", href: "#pipeline" },
  { label: "Metrics", href: "#metrics" },
  { label: "Technology", href: "#technology" },
];

export const capabilities: Capability[] = [
  {
    title: "Unified Chat & Voice",
    description:
      "Inbound telephony and web chat share one context engine, so customers never have to repeat themselves.",
    icon: MessagesSquare,
  },
  {
    title: "Direct Action APIs",
    description:
      "Books appointments, modifies orders, and captures CRM records without kicking the customer to another tool.",
    icon: Zap,
  },
  {
    title: "Contextual Escalation",
    description:
      "Routes to a live agent with the transcript, retrieved sources, and every AI answer already attached.",
    icon: UserCheck,
  },
  {
    title: "Privacy & RBAC",
    description:
      "Role-based controls and explicit consent gates keep sensitive actions behind the right permissions.",
    icon: ShieldCheck,
  },
  {
    title: "Complete Audit Trail",
    description:
      "Every interaction logs the query, retrieved context, action taken, and the final response for review.",
    icon: ScrollText,
  },
  {
    title: "Owner Analytics",
    description:
      "Real-time sentiment, resolution rates, and deflection tracked against the outcomes owners actually care about.",
    icon: BarChart3,
  },
];

export const pipelineSteps: PipelineStep[] = [
  {
    number: "01",
    title: "Customer Input",
    description:
      "Web chat, inbound voice, or email enters one queue with identity resolved.",
    icon: MessageSquareText,
  },
  {
    number: "02",
    title: "RAG Retrieval",
    description:
      "Policy, order, and CRM context is retrieved from permitted sources only.",
    icon: Database,
  },
  {
    number: "03",
    title: "Reason & Act",
    description:
      "The agent drafts a response or invokes an approved action API.",
    icon: Workflow,
  },
  {
    number: "04",
    title: "Confidence Gate",
    description:
      "Below threshold, it escalates with full context instead of guessing.",
    icon: ShieldCheck,
  },
  {
    number: "05",
    title: "Console & Audit",
    description:
      "Agents pick up with complete history. Every step is written to the trail.",
    icon: ClipboardCheck,
  },
];

export const metrics: Metric[] = [
  {
    value: "70%",
    label: "Queries auto-resolved",
    detail: "Deflected without agent involvement",
    heroLabel: "Auto-resolved",
  },
  {
    value: "60%",
    label: "Missed calls reduced",
    detail: "After-hours and overflow coverage",
    heroLabel: "Missed calls reduced",
  },
  {
    value: "50%",
    label: "Cost per interaction savings",
    detail: "Lower handling cost across chat and voice",
    heroLabel: "Cost saved",
  },
  {
    value: "<2s",
    label: "Response time",
    detail: "Median first response, p50",
  },
];

export const techStack: TechCategory[] = [
  {
    category: "Application",
    items: ["Next.js", "React", "Tailwind CSS"],
    icon: Layers,
  },
  {
    category: "Backend",
    items: ["FastAPI", "Node.js", "WebSockets"],
    icon: Server,
  },
  {
    category: "Intelligence",
    items: ["LangChain", "Pinecone", "PostgreSQL"],
    icon: Cpu,
  },
  {
    category: "Telephony",
    items: ["Twilio", "Deepgram", "ElevenLabs"],
    icon: PhoneCall,
  },
];

export const footerLinks: NavLink[] = [
  ...navLinks,
  { label: "Book a Demo", href: "#book" },
];
