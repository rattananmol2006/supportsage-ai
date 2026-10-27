import { connection, NextResponse } from "next/server";

import {
  databaseStats,
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
import type { DashboardPayload } from "@/lib/types";

export async function GET() {
  await connection();

  const knowledge = getKnowledgeStats();
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
    appointments: listAppointments(),
    escalations: listEscalations(),
    notifications: listNotifications().slice(0, 50),
    doctors: listDoctors().map(publicDoctor),
    orders: listOrders(),
    settings: publicSettings(),
    integrations: {
      groq: Boolean(process.env.GROQ_API_KEY),
      telegram: publicSettings().telegramConnected,
      googleCalendar: "event-links-and-ics",
      database: "local-json",
    },
  };

  const response = NextResponse.json(payload);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
