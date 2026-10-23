import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createDatabase, type AppDatabase } from "@/db/client";
import { jobs, leads, messages } from "@/db/schema";
import { createLead, enqueueJob, handoffToApi, markDoNotContact } from "./repository";

let database: ReturnType<typeof createDatabase>;
let db: AppDatabase;

beforeEach(() => { database = createDatabase(":memory:"); db = database.db; });
afterEach(() => database.sqlite.close());

describe("lead repository", () => {
  it("deduplicates leads by normalized handle", async () => {
    const first = await createLead(db, { instagramHandle: "@Empresa", segment: "Varejo" });
    const second = await createLead(db, { instagramHandle: "empresa", segment: "Varejo" });
    expect(second.id).toBe(first.id);
    expect(await db.select().from(leads)).toHaveLength(1);
  });

  it("makes opt-out permanent and cancels queued jobs", async () => {
    const lead = await createLead(db, { instagramHandle: "@empresa", segment: "Varejo" });
    await enqueueJob(db, "browser_first_contact", lead.id);
    await markDoNotContact(db, lead.id, "requested");
    const [updated] = await db.select().from(leads).where(eq(leads.id, lead.id));
    const [job] = await db.select().from(jobs).where(eq(jobs.leadId, lead.id));
    expect(updated.doNotContact).toBe(true);
    expect(updated.channelState).toBe("do_not_contact");
    expect(job.status).toBe("cancelled");
  });

  it("hands a replied conversation to the API exactly once", async () => {
    const lead = await createLead(db, { instagramHandle: "@empresa", instagramUserId: "meta-1", segment: "Varejo" });
    expect((await handoffToApi(db, lead.id, "mid-1", "Tenho interesse")).duplicate).toBe(false);
    expect((await handoffToApi(db, lead.id, "mid-1", "Tenho interesse")).duplicate).toBe(true);
    const [updated] = await db.select().from(leads).where(eq(leads.id, lead.id));
    expect(updated.channelOwner).toBe("api");
    expect(await db.select().from(messages)).toHaveLength(1);
  });
});
