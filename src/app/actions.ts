"use server";

import { revalidatePath } from "next/cache";
import { getDatabase } from "@/db/client";
import { createLead, enqueueJob, setPaused } from "@/features/leads/repository";

export async function addLead(formData: FormData) {
  const { db } = getDatabase();
  await createLead(db, {
    instagramHandle: String(formData.get("instagramHandle") ?? ""),
    displayName: String(formData.get("displayName") ?? "") || undefined,
    segment: String(formData.get("segment") ?? "Outros"),
    geography: String(formData.get("geography") ?? "") || undefined,
    score: Number(formData.get("score") ?? 0),
  });
  revalidatePath("/");
}

export async function scheduleDryRun(formData: FormData) {
  await enqueueJob(getDatabase().db, "browser_first_contact", Number(formData.get("leadId")), {
    variant: "manual-v1", message: String(formData.get("message") ?? ""),
  });
  revalidatePath("/");
}

export async function togglePause(formData: FormData) {
  await setPaused(getDatabase().db, String(formData.get("paused")) === "true");
  revalidatePath("/");
}
