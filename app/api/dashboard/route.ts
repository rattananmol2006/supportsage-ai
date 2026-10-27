import { connection, NextResponse } from "next/server";

import {
  databaseStats,
  getSettings,
  listAppointments,
  listConversations,
  listDoctors,
  listEscalations,
  listNotifications,
  listOrders,
  publicDoctor,
  publicSettings,
  totalMessageCount,
} from "@/lib/db";
import { getKnowledgeStats, knowledgeDocs } from "@/lib/knowledge";
import { buildCalendarDays } from "@/lib/scheduling";
import type { DashboardPayload } from "@/lib/types";

export async function GET() {
  await connection();

  const knowledge = getKnowledgeStats();
  const doctors = listDoctors();
  const appointments = listAppointments();
  const settings = publicSettings();
  const payload: DashboardPayload = {
    stats: {
      ...databaseStats(),
      messages: totalMessageCount(),
    },
    knowledge: {
      ...knowledge,
      docs: knowledgeDocs.map(({ id, title, type, mode }) => ({
        id,
        title,
        type,
        mode,
      })),
    },
    conversations: listConversations(),
    appointments,
    calendar: buildCalendarDays(
      doctors,
      appointments,
      getSettings().timezone,
      { days: 35 },
    ),
    escalations: listEscalations(),
    notifications: listNotifications().slice(0, 50),
    doctors: doctors.map(publicDoctor),
    orders: listOrders(),
    settings,
    integrations: {
      groq: Boolean(process.env.GROQ_API_KEY),
      telegram: settings.telegramConnected,
      googleCalendar: settings.googleConnected
        ? "oauth"
        : "event-links-and-ics",
      database: "local-json",
    },
  };

  const response = NextResponse.json(payload);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
