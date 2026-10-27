import { connection, NextResponse } from "next/server";

import {
  createTestCalendarEvent,
  isGoogleCalendarConnected,
} from "@/lib/google-calendar";

export async function POST() {
  await connection();

  if (!isGoogleCalendarConnected()) {
    return NextResponse.json(
      { error: "Connect Google Calendar before testing it." },
      { status: 400 },
    );
  }

  try {
    const event = await createTestCalendarEvent();
    return NextResponse.json({
      status: "created",
      message: "Test event created in Google Calendar.",
      event: { id: event.id, link: event.htmlLink },
    });
  } catch (error) {
    console.error("[google-calendar] test event failed", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Google Calendar did not accept the test event.",
      },
      { status: 502 },
    );
  }
}
