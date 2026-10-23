import type { AppDatabase } from "@/db/client";
import type { Job } from "@/db/schema";
import { completeJob, failJob, findLeadById, isPaused, recordEvent, recordMessage } from "@/features/leads/repository";
import { messagePassesClaimGuard } from "@/features/leads/rules";
import type { BrowserClient } from "@/integrations/browser/client";
import type { BusinessConfig } from "@/config/business";
import type { AppEnv } from "@/config/env";
import { assertOutboundAllowed } from "@/features/safety/policy";
import type { InstagramApiClientContract } from "@/integrations/instagram/api-client";
import { draftReply } from "@/integrations/openai/conversation";

export async function processJob(db: AppDatabase, job: Job, browser: BrowserClient, apiClient: InstagramApiClientContract, business: BusinessConfig, env: AppEnv) {
  try {
    if (await isPaused(db)) throw new Error("System is paused");
    if (!job.leadId) throw new Error("Job has no lead");
    const lead = await findLeadById(db, job.leadId);
    if (!lead) throw new Error("Lead not found");
    if (lead.doNotContact) throw new Error("Lead is on do-not-contact list");
    if (job.type === "api_reply") {
      if (lead.channelOwner !== "api" || !lead.instagramUserId) throw new Error("API does not own this conversation");
      const payload = JSON.parse(job.payload) as { inbound: string };
      const reply = env.DRY_RUN && !env.OPENAI_API_KEY
        ? `Obrigado pela resposta! A ${business.companyName} trabalha com estratégia, conteúdo e anúncios. Posso entender qual é hoje o principal desafio de divulgação do seu negócio?`
        : await draftReply(db, env, business, { leadId: lead.id, profileContext: `${lead.displayName ?? lead.instagramHandle}; ${lead.segment}; ${lead.bio ?? ""}`, history: payload.inbound });
      if (!messagePassesClaimGuard(reply, business.unverifiedClaims)) throw new Error("AI reply blocked by claim guard");
      const result = await apiClient.sendReply(lead.instagramUserId, reply);
      await recordMessage(db, { leadId: lead.id, direction: "outbound", channel: "instagram_api", body: reply, status: result.status });
      await recordEvent(db, result.status === "sent" ? "api_message_sent" : "api_dry_run", lead.id, result);
      await completeJob(db, job.id);
      return result;
    }
    if (job.type !== "browser_first_contact") throw new Error(`Unsupported job type: ${job.type}`);
    if (lead.channelOwner !== "browser" || lead.channelState !== "browser_contact_pending") {
      throw new Error("Browser no longer owns this conversation");
    }
    const payload = JSON.parse(job.payload) as { message: string; variant?: string };
    if (!messagePassesClaimGuard(payload.message, business.unverifiedClaims)) throw new Error("Message blocked by claim guard");
    if (!env.DRY_RUN) await assertOutboundAllowed(db, env);

    const result = await browser.sendFirstMessage(lead.instagramHandle, payload.message);
    await recordMessage(db, {
      leadId: lead.id, direction: "outbound", channel: "browser", body: payload.message,
      status: result.status, variant: payload.variant,
    });
    await recordEvent(db, result.status === "sent" ? "browser_message_sent" : "browser_dry_run", lead.id, result);
    await completeJob(db, job.id);
    return result;
  } catch (error) {
    await failJob(db, job.id, error instanceof Error ? error.message : "Unknown worker error");
    throw error;
  }
}
