import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDatabase } from "@/db/client";
import { jobs, leads, messages } from "@/db/schema";
import { createLead, enqueueJob } from "@/features/leads/repository";
import type { BrowserClient } from "@/integrations/browser/client";
import type { BusinessConfig } from "@/config/business";
import type { AppEnv } from "@/config/env";
import { processJob } from "./processor";
import type { InstagramApiClientContract } from "@/integrations/instagram/api-client";

let database: ReturnType<typeof createDatabase>;
beforeEach(() => { database = createDatabase(":memory:"); });
afterEach(() => database.sqlite.close());

const business = { companyName: "Seven Marketing", unverifiedClaims: ["somos a maior agência"] } as BusinessConfig;
const env = { DRY_RUN: true } as AppEnv;
const apiClient: InstagramApiClientContract = { sendReply: async () => ({ status: "dry_run" }) };

describe("worker", () => {
  it("executes a browser dry-run and records evidence", async () => {
    const lead = await createLead(database.db, { instagramHandle: "@empresa", segment: "Varejo" });
    const job = await enqueueJob(database.db, "browser_first_contact", lead.id, { message: "Olá, posso fazer uma pergunta?" });
    const browser: BrowserClient = { sendFirstMessage: async () => ({ status: "dry_run", evidence: "blocked" }) };
    await processJob(database.db, job, browser, apiClient, business, env);
    const [savedJob] = await database.db.select().from(jobs).where(eq(jobs.id, job.id));
    const [savedMessage] = await database.db.select().from(messages).where(eq(messages.leadId, lead.id));
    expect(savedJob.status).toBe("completed");
    expect(savedMessage.status).toBe("dry_run");
  });

  it("blocks a message containing an unsupported claim", async () => {
    const lead = await createLead(database.db, { instagramHandle: "@empresa", segment: "Varejo" });
    const job = await enqueueJob(database.db, "browser_first_contact", lead.id, { message: "Somos a maior agência da região" });
    const browser: BrowserClient = { sendFirstMessage: async () => ({ status: "sent" }) };
    await expect(processJob(database.db, job, browser, apiClient, business, env)).rejects.toThrow("claim guard");
  });

  it("continues an eligible reply through the official API in dry-run", async () => {
    const lead = await createLead(database.db, { instagramHandle: "@empresa", instagramUserId: "meta-1", segment: "Varejo" });
    await database.db.update(leads).set({ channelOwner: "api", channelState: "api_eligible" }).where(eq(leads.id, lead.id));
    const job = await enqueueJob(database.db, "api_reply", lead.id, { inbound: "Quero saber mais" });
    let recipient = "";
    const api: InstagramApiClientContract = { sendReply: async (id) => { recipient = id; return { status: "dry_run" }; } };
    const browser: BrowserClient = { sendFirstMessage: async () => ({ status: "dry_run" }) };
    await processJob(database.db, job, browser, api, business, env);
    expect(recipient).toBe("meta-1");
    const apiMessages = await database.db.select().from(messages).where(eq(messages.channel, "instagram_api"));
    expect(apiMessages).toHaveLength(1);
  });
});
