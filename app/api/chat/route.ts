import { NextResponse } from "next/server";

import type { ChatMode } from "@/lib/chat-modes";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_MESSAGES = 16;
const MAX_CONTENT_LENGTH = 4000;

const systemPrompts: Record<ChatMode, string> = {
  doctor:
    "You are Sage, SupportSage AI's clinical support copilot in Doctor mode. Help clinicians, clinic staff, and patients with clear, practical healthcare support: explain clinical information in plain language, summarize symptoms, draft patient-friendly follow-up instructions, and help navigate care workflows. Do not provide a definitive diagnosis, prescribe medication, or claim to replace a licensed clinician. Recommend clinician review for clinical decisions. If the user describes an emergency such as chest pain, difficulty breathing, stroke signs, severe bleeding, or suicidal ideation, tell them to contact local emergency services immediately. Never invent patient data; ask for missing context. Use plain text only: short paragraphs and hyphen bullets. No markdown headings, bold markers, or tables. Keep responses concise, under about 220 words unless the user asks for more.",
  business:
    "You are Sage, SupportSage AI's customer support operations copilot in Business Owner mode. Help owners and support leads draft customer replies, handle refunds and escalations, summarize support metrics, design support policies, improve response quality, and decide when to involve a human. Be practical, commercially aware, concise, and structured. SupportSage AI's product principles are unified chat and voice, direct action APIs, contextual escalation, privacy and RBAC, a complete audit trail, and owner analytics; reflect them accurately when relevant. Never fabricate order numbers, customer details, or metrics; ask for missing facts and flag approval steps for refunds or policy exceptions. Avoid bracketed placeholder tokens in drafts; use a generic sign-off such as \"SupportSage Support\" when a name is unavailable. Use plain text only: short paragraphs and hyphen bullets. No markdown headings, bold markers, or tables. Keep responses concise, under about 220 words unless the user asks for more.",
};

function parseMessages(value: unknown): ChatMessage[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const messages: ChatMessage[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;

    const { role, content } = item as Record<string, unknown>;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;

    const trimmed = content.trim();
    if (!trimmed || trimmed.length > MAX_CONTENT_LENGTH) return null;

    messages.push({ role, content: trimmed });
  }

  if (!messages.some((message) => message.role === "user")) return null;

  return messages.slice(-MAX_MESSAGES);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    mode?: unknown;
    messages?: unknown;
  } | null;

  const mode = body?.mode;
  if (mode !== "doctor" && mode !== "business") {
    return NextResponse.json(
      { error: "Choose Doctor or Business Owner mode." },
      { status: 400 },
    );
  }

  const messages = parseMessages(body?.messages);
  if (!messages) {
    return NextResponse.json(
      { error: "Send a valid message to start chatting." },
      { status: 400 },
    );
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[chat] GROQ_API_KEY is not configured");
    return NextResponse.json(
      { error: "Chat is not configured yet. Add GROQ_API_KEY and try again." },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
          messages: [
            { role: "system", content: systemPrompts[mode] },
            ...messages,
          ],
          temperature: 0.6,
          max_completion_tokens: 900,
        }),
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error(
        `[chat] Groq request failed (${response.status}): ${detail.slice(0, 300)}`,
      );

      if (response.status === 429) {
        return NextResponse.json(
          {
            error:
              "The assistant is handling a lot of requests right now. Please wait a moment and try again.",
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          error:
            "The assistant couldn't respond just now. Please try again in a moment.",
        },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error("[chat] Groq returned an empty response");
      return NextResponse.json(
        {
          error: "The assistant returned an empty response. Please try again.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[chat] Groq request error", error);
    return NextResponse.json(
      {
        error:
          "The assistant is temporarily unavailable. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
