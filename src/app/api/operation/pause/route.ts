import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { setPaused } from "@/features/leads/repository";

export async function POST(request: Request) {
  const parsed = z.object({ paused: z.boolean() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await setPaused(getDatabase().db, parsed.data.paused);
  return NextResponse.json({ ok: true, paused: parsed.data.paused });
}
