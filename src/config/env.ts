import { z } from "zod";

const integer = (fallback: number) => z.coerce.number().int().positive().default(fallback);

const envSchema = z.object({
  DATABASE_URL: z.string().default("data/seven.db"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.4"),
  OPENAI_MODEL_FAST: z.string().default("gpt-5.4-mini"),
  OPENAI_MONTHLY_BUDGET_USD: z.coerce.number().positive().default(25),
  CHROME_CDP_URL: z.string().url().default("http://127.0.0.1:9222"),
  MAX_DMS_PER_DAY: integer(5),
  MIN_SECONDS_BETWEEN_DMS: integer(180),
  MAX_SECONDS_BETWEEN_DMS: integer(360),
  OPERATING_HOURS: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/).default("09:00-18:00"),
  OPERATING_TIMEZONE: z.string().default("America/Sao_Paulo"),
  DRY_RUN: z.enum(["true", "false"]).default("true").transform((value) => value === "true"),
  WORKER_POLL_MS: integer(5000),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  INSTAGRAM_PAGE_ACCESS_TOKEN: z.string().optional(),
  INSTAGRAM_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  INSTAGRAM_BUSINESS_ACCOUNT_ID: z.string().optional(),
  INSTAGRAM_API_BASE_URL: z.string().url().default("https://graph.facebook.com/v24.0"),
});

export function loadEnv(source: NodeJS.ProcessEnv = process.env) {
  const env = envSchema.parse(source);
  if (env.MAX_SECONDS_BETWEEN_DMS < env.MIN_SECONDS_BETWEEN_DMS) {
    throw new Error("MAX_SECONDS_BETWEEN_DMS must be greater than or equal to MIN_SECONDS_BETWEEN_DMS");
  }
  return env;
}

export type AppEnv = ReturnType<typeof loadEnv>;
