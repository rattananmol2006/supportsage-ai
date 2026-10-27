import { NextResponse } from "next/server";

import { sendTelegramNotification, getTelegramConfig } from "@/lib/telegram";

export async function POST() {
  const config = getTelegramConfig();
  if (!config.connected) {
    return NextResponse.json(
      {
        error:
          "Telegram is not connected. Add a bot token and chat ID, then save before testing.",
      },
      { status: 400 },
    );
  }

  const result = await sendTelegramNotification({
    text: [
      "✅ SupportSage AI test alert",
      "Your Telegram integration is connected.",
      "Appointments and urgent escalations will be delivered to this chat.",
    ].join("\n"),
    relatedType: "test",
  });

  if (result.status === "sent") {
    return NextResponse.json({
      status: result.status,
      message: "Test alert sent. Check the Telegram chat.",
    });
  }

  return NextResponse.json(
    {
      status: result.status,
      error:
        result.notification.error ??
        "Telegram did not accept the test alert. Check the token and chat ID.",
    },
    { status: 502 },
  );
}
