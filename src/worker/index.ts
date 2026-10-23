import "dotenv/config";
import { getDatabase } from "@/db/client";
import { loadEnv } from "@/config/env";
import { loadBusinessConfig } from "@/config/business";
import { claimNextJob } from "@/features/leads/repository";
import { InstagramCdpClient } from "@/integrations/browser/client";
import { processJob } from "./processor";
import { InstagramApiClient } from "@/integrations/instagram/api-client";

const env = loadEnv();
const business = loadBusinessConfig();
const { db } = getDatabase();
const browser = new InstagramCdpClient(env.CHROME_CDP_URL, env.DRY_RUN);
const apiClient = new InstagramApiClient(env.INSTAGRAM_API_BASE_URL, env.INSTAGRAM_PAGE_ACCESS_TOKEN, env.INSTAGRAM_BUSINESS_ACCOUNT_ID, env.DRY_RUN);

console.log(`Worker started (${env.DRY_RUN ? "dry-run" : "live"}).`);

async function tick() {
  const job = await claimNextJob(db);
  if (!job) return;
  await processJob(db, job, browser, apiClient, business, env).catch((error) => {
    console.error("Job failed:", error instanceof Error ? error.message : "Unknown error");
  });
}

setInterval(() => void tick(), env.WORKER_POLL_MS);
void tick();
