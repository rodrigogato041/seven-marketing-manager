import OpenAI from "openai";
import type { AppDatabase } from "@/db/client";
import { aiCalls } from "@/db/schema";
import type { AppEnv } from "@/config/env";
import type { BusinessConfig } from "@/config/business";
import { currentMonthAiCost, setPaused } from "@/features/leads/repository";

export async function assertAiBudget(db: AppDatabase, env: AppEnv) {
  const spent = await currentMonthAiCost(db);
  if (spent >= env.OPENAI_MONTHLY_BUDGET_USD) {
    await setPaused(db, true);
    throw new Error("OpenAI monthly budget reached; operation paused");
  }
}

export async function draftReply(db: AppDatabase, env: AppEnv, business: BusinessConfig, input: {
  leadId: number; profileContext: string; history: string;
}) {
  if (!env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");
  await assertAiBudget(db, env);
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: env.OPENAI_MODEL,
    input: [
      { role: "system", content: `Você conversa em nome da ${business.companyName}. Use somente estas afirmações verificadas: ${business.verifiedClaims.map((item) => item.claim).join(" | ")}. Nunca prometa resultado. Se houver dúvida, peça revisão humana.` },
      { role: "user", content: `Perfil: ${input.profileContext}\nHistórico: ${input.history}\nEscreva uma resposta curta, natural e verdadeira em português brasileiro.` },
    ],
  });
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const estimatedCostUsd = (inputTokens * 0.0000025) + (outputTokens * 0.00001);
  await db.insert(aiCalls).values({ leadId: input.leadId, model: env.OPENAI_MODEL, inputTokens, outputTokens, estimatedCostUsd, createdAt: new Date().toISOString() });
  return response.output_text;
}
