import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import { AgentRequestError, runAgent } from "@/lib/agent";
import {
  appendMessage,
  createConversation,
  findConversation,
  getSettings,
  listDoctors,
  updateConversation,
} from "@/lib/db";
import {
  buildConversationSummary,
  extractKeyInfo,
  mergeKeyInfo,
  titleFrom,
} from "@/lib/insights";
import { retrieveKnowledge, toSourceRefs } from "@/lib/rag";
import { assessUrgency } from "@/lib/triage";
import type {
  ChatMode,
  ChatResponse,
  EmergencyContact,
  SourceRef,
  StoredMessage,
} from "@/lib/types";

const MAX_MESSAGE_LENGTH = 4000;

type ChatBody = {
  mode?: unknown;
  message?: unknown;
  conversationId?: unknown;
};

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function uniqueSources(sources: SourceRef[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

function emergencyContactsFor(mode: ChatMode): EmergencyContact[] {
  if (mode === "business") return [];
  const settings = getSettings();
  return [
    {
      label: "Emergency services",
      value: "112 (India) · 911 (US)",
      href: "tel:112",
    },
    {
      label: settings.clinicName,
      value: settings.clinicPhone,
      href: `tel:${settings.clinicPhone.replace(/[^\d+]/g, "")}`,
    },
  ];
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ChatBody | null;
  const mode = body?.mode;
  const rawMessage = body?.message;

  if (mode !== "doctor" && mode !== "business") {
    return json({ error: "Choose Doctor or Business Owner mode." }, { status: 400 });
  }

  if (typeof rawMessage !== "string") {
    return json({ error: "Send a message to start chatting." }, { status: 400 });
  }

  const message = rawMessage.trim();
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return json(
      {
        error: `Messages must be between 1 and ${MAX_MESSAGE_LENGTH} characters.`,
      },
      { status: 400 },
    );
  }

  const requestedConversationId =
    typeof body?.conversationId === "string"
      ? body.conversationId.trim()
      : undefined;

  let conversation = requestedConversationId
    ? findConversation(requestedConversationId)
    : undefined;

  if (conversation && conversation.mode !== mode) {
    return json(
      { error: "That conversation belongs to a different mode." },
      { status: 400 },
    );
  }

  if (!conversation) {
    conversation = createConversation(
      mode,
      titleFrom(message, assessUrgency(message, mode).level),
    );
  }

  const conversationId = conversation.id;
  const doctors = listDoctors();
  const triage = assessUrgency(message, mode);
  const extracted = extractKeyInfo(message, doctors, mode);
  const now = new Date().toISOString();

  appendMessage(conversationId, {
    id: `msg-${randomUUID()}`,
    role: "user",
    content: message,
    createdAt: now,
    urgent: triage.level !== null,
    urgencyLevel: triage.level,
  });

  const current = findConversation(conversationId);
  if (!current) {
    return json({ error: "Could not load the conversation." }, { status: 500 });
  }

  const preKeyInfo = mergeKeyInfo(current.keyInfo, extracted);
  updateConversation(conversationId, {
    keyInfo: preKeyInfo,
    urgent: current.urgent || triage.level !== null,
  });

  const prepared = findConversation(conversationId);
  if (!prepared) {
    return json({ error: "Could not load the conversation." }, { status: 500 });
  }

  const userMessages = prepared.messages.filter(
    (item) => item.role === "user",
  );
  const retrievalQuery = userMessages
    .slice(-2)
    .map((item) => item.content)
    .join("\n");

  const ragChunks = retrieveKnowledge(retrievalQuery, mode, {
    urgent: triage.level !== null,
    limit: 5,
  });
  const ragSources = toSourceRefs(ragChunks);

  try {
    const result = await runAgent({
      mode,
      conversation: prepared,
      message,
      triage,
      ragChunks,
    });

    const doctorSources: SourceRef[] = result.doctors.map((doctor) => ({
      id: `doctor-${doctor.id}`,
      title: `${doctor.name} — ${doctor.specialty}`,
      type: "doctor",
    }));
    const orderSource: SourceRef[] = result.order
      ? [
          {
            id: `order-${result.order.id}`,
            title: `Order #${result.order.id} — ${result.order.customer}`,
            type: "order",
          },
        ]
      : [];
    const sources = uniqueSources([
      ...ragSources,
      ...doctorSources,
      ...orderSource,
    ]);
    const contacts = emergencyContactsFor(mode);

    const assistantMessage: StoredMessage = {
      id: `msg-${randomUUID()}`,
      role: "assistant",
      content: result.reply,
      createdAt: new Date().toISOString(),
      sources,
      tools: result.tools,
      doctors: result.doctors.length > 0 ? result.doctors : undefined,
      appointment: result.appointment,
      escalation: result.escalation,
      order: result.order,
      emergencyContacts: contacts.length > 0 ? contacts : undefined,
      notificationStatus: result.notificationStatus,
      urgent: triage.level !== null,
      urgencyLevel: triage.level,
    };

    appendMessage(conversationId, assistantMessage);

    const finalKeyInfo = mergeKeyInfo(preKeyInfo, result.keyInfoPatch);
    const title =
      userMessages.length === 1
        ? titleFrom(message, triage.level)
        : prepared.title;

    const withAssistant = findConversation(conversationId);
    if (!withAssistant) {
      return json({ error: "Could not save the conversation." }, { status: 500 });
    }

    const summary = buildConversationSummary(withAssistant, {
      appointment: result.appointment,
      escalation: result.escalation,
      notificationStatus: result.notificationStatus,
      order: result.order,
    });

    updateConversation(conversationId, {
      title,
      summary,
      keyInfo: finalKeyInfo,
      urgent: withAssistant.urgent || triage.level !== null,
    });

    const response: ChatResponse = {
      conversationId,
      title,
      summary,
      keyInfo: finalKeyInfo,
      reply: result.reply,
      sources,
      tools: result.tools,
      doctors: result.doctors,
      appointment: result.appointment,
      escalation: result.escalation,
      order: result.order,
      emergencyContacts: contacts,
      urgent: triage.level !== null,
      urgencyLevel: triage.level,
      notificationStatus: result.notificationStatus,
    };

    return json(response);
  } catch (error) {
    console.error("[chat] agent failed", error);
    const failure =
      error instanceof AgentRequestError
        ? error.message
        : "The assistant couldn't complete that request. Please try again in a moment.";
    const status = error instanceof AgentRequestError ? error.status : 502;

    appendMessage(conversationId, {
      id: `msg-${randomUUID()}`,
      role: "assistant",
      content: failure,
      createdAt: new Date().toISOString(),
      urgent: triage.level !== null,
      urgencyLevel: triage.level,
    });

    updateConversation(conversationId, {
      summary: `The assistant could not complete this turn. ${failure}`,
      keyInfo: preKeyInfo,
      urgent: prepared.urgent || triage.level !== null,
    });

    return json({ error: failure, conversationId }, { status });
  }
}
