import type { Metadata } from "next";

import { DashboardClient } from "@/components/dashboard/dashboard-client";

export const metadata: Metadata = {
  title: "Owner Dashboard — SupportSage AI",
  description:
    "Live conversations, AI summaries, extracted facts, appointments, escalations, Telegram delivery, doctor records, orders, and RAG knowledge sources.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return <DashboardClient />;
}
