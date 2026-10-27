import { NextResponse } from "next/server";

import { findDoctor, removeDoctor } from "@/lib/db";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!findDoctor(id)) {
    return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  }

  const removed = removeDoctor(id);
  if (!removed) {
    return NextResponse.json({ error: "Doctor not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
