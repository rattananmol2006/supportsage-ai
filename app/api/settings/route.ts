import { connection, NextResponse } from "next/server";

import { publicSettings, updateSettings } from "@/lib/db";
import type { Settings } from "@/lib/types";

function text(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : undefined;
}

export async function GET() {
  await connection();
  const response = NextResponse.json({ settings: publicSettings() });
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function PATCH(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid settings." }, { status: 400 });
  }

  const patch: Partial<Settings> = {};
  const clinicName = text(body.clinicName);
  const clinicPhone = text(body.clinicPhone, 40);
  const timezone = text(body.timezone, 80);

  if (clinicName !== undefined) {
    if (!clinicName) {
      return NextResponse.json(
        { error: "Clinic name cannot be empty." },
        { status: 400 },
      );
    }
    patch.clinicName = clinicName;
  }

  if (clinicPhone !== undefined) {
    if (clinicPhone.replace(/\D/g, "").length < 8) {
      return NextResponse.json(
        { error: "Enter a valid clinic phone number." },
        { status: 400 },
      );
    }
    patch.clinicPhone = clinicPhone;
  }

  if (timezone !== undefined) {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
      patch.timezone = timezone;
    } catch {
      return NextResponse.json(
        { error: "Enter a valid IANA timezone, such as Asia/Kolkata." },
        { status: 400 },
      );
    }
  }

  if ("telegramBotToken" in body) {
    patch.telegramBotToken = text(body.telegramBotToken, 200) || undefined;
  }
  if ("telegramChatId" in body) {
    patch.telegramChatId = text(body.telegramChatId, 120) || undefined;
  }

  updateSettings(patch);
  const saved = publicSettings();
  const response = NextResponse.json({
    settings: saved,
    message:
      "Settings saved. Tokens are only stored on the server and are never returned to the browser.",
    configured: saved.telegramConnected,
  });
  response.headers.set("Cache-Control", "no-store");
  return response;
}
