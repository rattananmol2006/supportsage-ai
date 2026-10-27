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

export const instant = false;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const google = first(params.google);
  const googleStatus =
    google === "connected" ? "connected" : google === "error" ? "error" : undefined;

  return (
    <DashboardClient
      googleStatus={googleStatus}
      googleReason={first(params.reason)}
    />
  );
}
