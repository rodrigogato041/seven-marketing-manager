import { and, asc, count, desc, eq, lte, sql, sum } from "drizzle-orm";
import type { AppDatabase } from "@/db/client";
import { aiCalls, events, jobs, leads, messages, settings, webhookEvents, type Job } from "@/db/schema";
import { assertPipelineTransition, normalizeInstagramHandle } from "./rules";

const now = () => new Date().toISOString();

export async function createLead(db: AppDatabase, input: {
  instagramHandle: string;
  instagramUserId?: string;
  displayName?: string;
  bio?: string;
  segment: string;
  geography?: string;
  score?: number;
}) {
  const timestamp = now();
  const handle = normalizeInstagramHandle(input.instagramHandle);
  await db.insert(leads).values({
    instagramHandle: handle,
    instagramUserId: input.instagramUserId,
    displayName: input.displayName,
    bio: input.bio,
    segment: input.segment,
    geography: input.geography,
    score: input.score ?? 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }).onConflictDoNothing({ target: leads.instagramHandle });

  const [lead] = await db.select().from(leads).where(eq(leads.instagramHandle, handle));
  if (!lead) throw new Error("Lead could not be created");
  return lead;
}

export async function listLeads(db: AppDatabase) {
  return db.select().from(leads).orderBy(desc(leads.score), desc(leads.createdAt));
}

export async function findLeadById(db: AppDatabase, id: number) {
  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  return lead;
}

export async function findLeadByInstagramUserId(db: AppDatabase, instagramUserId: string) {
  const [lead] = await db.select().from(leads).where(eq(leads.instagramUserId, instagramUserId));
  return lead;
}

export async function transitionPipeline(db: AppDatabase, id: number, next: string) {
  const lead = await findLeadById(db, id);
  if (!lead) throw new Error("Lead not found");
  assertPipelineTransition(lead.pipelineState, next);
  await db.update(leads).set({ pipelineState: next, updatedAt: now() }).where(eq(leads.id, id));
  await recordEvent(db, "pipeline_changed", id, { from: lead.pipelineState, to: next });
}

export async function markDoNotContact(db: AppDatabase, id: number, reason: string) {
  await db.update(leads).set({
    doNotContact: true,
    channelState: "do_not_contact",
    channelOwner: "none",
    nextActionAt: null,
    updatedAt: now(),
  }).where(eq(leads.id, id));
  await db.update(jobs).set({ status: "cancelled", updatedAt: now() })
    .where(and(eq(jobs.leadId, id), eq(jobs.status, "pending")));
  await recordEvent(db, "do_not_contact", id, { reason });
}

export async function handoffToApi(db: AppDatabase, id: number, externalMessageId: string, body: string) {
  const timestamp = now();
  const duplicate = db.transaction((tx) => {
    const inserted = tx.insert(webhookEvents).values({
      externalId: externalMessageId,
      payload: JSON.stringify({ id, body }),
      processedAt: timestamp,
    }).onConflictDoNothing({ target: webhookEvents.externalId }).returning({ id: webhookEvents.id }).all();
    if (inserted.length === 0) return true;
    tx.insert(messages).values({
      leadId: id,
      externalId: externalMessageId,
      direction: "inbound",
      channel: "instagram_api",
      body,
      status: "received",
      createdAt: timestamp,
    }).run();
    tx.update(leads).set({
      pipelineState: "replied",
      channelState: "api_eligible",
      channelOwner: "api",
      updatedAt: timestamp,
    }).where(and(eq(leads.id, id), eq(leads.doNotContact, false))).run();
    tx.insert(events).values({ leadId: id, type: "channel_handoff", payload: JSON.stringify({ to: "api" }), createdAt: timestamp }).run();
    return false;
  });
  return { duplicate };
}

export async function recordMessage(db: AppDatabase, input: {
  leadId: number; direction: string; channel: string; body: string; status: string; variant?: string;
}) {
  const [message] = await db.insert(messages).values({ ...input, createdAt: now() }).returning();
  return message;
}

export async function recordEvent(db: AppDatabase, type: string, leadId: number | null, payload: unknown) {
  await db.insert(events).values({ leadId, type, payload: JSON.stringify(payload), createdAt: now() });
}

export async function enqueueJob(db: AppDatabase, type: string, leadId: number | null, payload: unknown = {}, availableAt = now()) {
  const timestamp = now();
  const [job] = await db.insert(jobs).values({
    type, leadId, payload: JSON.stringify(payload), availableAt, createdAt: timestamp, updatedAt: timestamp,
  }).returning();
  return job;
}

export async function claimNextJob(db: AppDatabase): Promise<Job | undefined> {
  const timestamp = now();
  const [job] = await db.select().from(jobs)
    .where(and(eq(jobs.status, "pending"), lte(jobs.availableAt, timestamp)))
    .orderBy(asc(jobs.availableAt)).limit(1);
  if (!job) return undefined;
  const claimed = await db.update(jobs).set({ status: "running", lockedAt: timestamp, updatedAt: timestamp })
    .where(and(eq(jobs.id, job.id), eq(jobs.status, "pending"))).returning();
  return claimed[0];
}

export async function completeJob(db: AppDatabase, id: number) {
  await db.update(jobs).set({ status: "completed", updatedAt: now() }).where(eq(jobs.id, id));
}

export async function failJob(db: AppDatabase, id: number, error: string) {
  await db.update(jobs).set({
    status: "failed", attempts: sql`${jobs.attempts} + 1`, lastError: error.slice(0, 500), updatedAt: now(),
  }).where(eq(jobs.id, id));
}

export async function setPaused(db: AppDatabase, paused: boolean) {
  await db.insert(settings).values({ key: "paused", value: String(paused), updatedAt: now() })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(paused), updatedAt: now() } });
}

export async function isPaused(db: AppDatabase) {
  const [row] = await db.select().from(settings).where(eq(settings.key, "paused"));
  return row?.value === "true";
}

export async function currentMonthAiCost(db: AppDatabase) {
  const start = new Date();
  start.setUTCDate(1); start.setUTCHours(0, 0, 0, 0);
  const [row] = await db.select({ total: sum(aiCalls.estimatedCostUsd) }).from(aiCalls)
    .where(sql`${aiCalls.createdAt} >= ${start.toISOString()}`);
  return Number(row?.total ?? 0);
}

export async function getDashboardSummary(db: AppDatabase) {
  const [leadCount] = await db.select({ value: count() }).from(leads);
  const [replyCount] = await db.select({ value: count() }).from(leads).where(sql`${leads.pipelineState} IN ('replied','interested','whatsapp_handoff','registered','active_customer')`);
  const [dncCount] = await db.select({ value: count() }).from(leads).where(eq(leads.doNotContact, true));
  const [pendingJobs] = await db.select({ value: count() }).from(jobs).where(eq(jobs.status, "pending"));
  return {
    leads: leadCount.value,
    replies: replyCount.value,
    doNotContact: dncCount.value,
    pendingJobs: pendingJobs.value,
    aiCostUsd: await currentMonthAiCost(db),
    paused: await isPaused(db),
  };
}
