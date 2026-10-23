import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/db/client";
import { createLead, listLeads } from "@/features/leads/repository";

const inputSchema = z.object({
  instagramHandle: z.string().min(1), instagramUserId: z.string().optional(), displayName: z.string().optional(),
  bio: z.string().optional(), segment: z.string().min(1), geography: z.string().optional(), score: z.number().int().min(0).max(100).optional(),
});

export async function GET() { return NextResponse.json(await listLeads(getDatabase().db)); }

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json(await createLead(getDatabase().db, parsed.data), { status: 201 });
}
