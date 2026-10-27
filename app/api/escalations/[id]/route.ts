import { NextResponse } from "next/server";

import { listEscalations, updateEscalation } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  const existing = listEscalations().find((item) => item.id === id);
  if (!existing) {
    return NextResponse.json(
      { error: "Escalation not found." },
      { status: 404 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    status?: unknown;
  } | null;
  const status = body?.status;
  if (status !== "open" && status !== "acknowledged" && status !== "resolved") {
    return NextResponse.json(
      { error: "Status must be open, acknowledged, or resolved." },
      { status: 400 },
    );
  }

  const escalation = updateEscalation(id, { status });
  return NextResponse.json({ escalation });
}
