import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/db/client";
import { enqueueJob, findLeadByInstagramUserId, handoffToApi, markDoNotContact, recordEvent } from "@/features/leads/repository";
import { loadEnv } from "@/config/env";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const env = loadEnv();
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (!env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN || token !== env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(challenge ?? "", { status: 200 });
}

export async function POST(request: Request) {
  const env = loadEnv();
  const raw = await request.text();
  if (!env.INSTAGRAM_APP_SECRET) return NextResponse.json({ error: "Webhook secret is not configured" }, { status: 503 });
  const signature = request.headers.get("x-hub-signature-256") ?? "";
  const expected = `sha256=${crypto.createHmac("sha256", env.INSTAGRAM_APP_SECRET).update(raw).digest("hex")}`;
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });

  const payload = JSON.parse(raw) as { entry?: Array<{ messaging?: Array<{ sender?: { id?: string }; message?: { mid?: string; text?: string } }> }> };
  const { db } = getDatabase();
  for (const entry of payload.entry ?? []) for (const item of entry.messaging ?? []) {
    const senderId = item.sender?.id;
    const externalId = item.message?.mid;
    const body = item.message?.text?.trim();
    if (!senderId || !externalId || !body) continue;
    const lead = await findLeadByInstagramUserId(db, senderId);
    if (!lead) { await recordEvent(db, "unmatched_webhook", null, { senderId, externalId }); continue; }
    if (/\b(parar|pare|remover|não quero|nao quero|sair)\b/i.test(body)) await markDoNotContact(db, lead.id, "instagram_opt_out");
    else {
      const result = await handoffToApi(db, lead.id, externalId, body);
      if (!result.duplicate) await enqueueJob(db, "api_reply", lead.id, { inbound: body });
    }
  }
  return NextResponse.json({ received: true });
}
