import { NextResponse } from "next/server";
import { getDatabase } from "@/db/client";
import { getDashboardSummary } from "@/features/leads/repository";
import { loadEnv } from "@/config/env";

export async function GET() {
  const env = loadEnv();
  return NextResponse.json({ ok: true, dryRun: env.DRY_RUN, summary: await getDashboardSummary(getDatabase().db) });
}
