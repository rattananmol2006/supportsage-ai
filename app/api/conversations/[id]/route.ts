import { connection, NextResponse } from "next/server";

import {
  deleteConversation,
  findConversation,
  listAppointments,
  listEscalations,
  listNotifications,
} from "@/lib/db";
import type { ConversationDetail } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  await connection();
  const { id } = await params;
  const conversation = findConversation(id);

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }

  const appointments = listAppointments().filter(
    (appointment) =>
      conversation.appointmentIds.includes(appointment.id) ||
      appointment.conversationId === conversation.id,
  );
  const escalations = listEscalations().filter(
    (escalation) =>
      conversation.escalationIds.includes(escalation.id) ||
      escalation.conversationId === conversation.id,
  );
  const relatedIds = new Set([
    ...appointments.map((appointment) => appointment.id),
    ...escalations.map((escalation) => escalation.id),
  ]);
  const notifications = listNotifications().filter((notification) => {
    if (!notification.relatedId) return false;
    return relatedIds.has(notification.relatedId);
  });

  const detail: ConversationDetail = {
    conversation,
    appointments,
    escalations,
    notifications,
  };

  const response = NextResponse.json(detail);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  const removed = deleteConversation(id);
  if (!removed) {
    return NextResponse.json(
      { error: "Conversation not found." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ok: true });
}
