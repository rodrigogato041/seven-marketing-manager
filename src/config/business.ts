import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const businessSchema = z.object({
  ownerName: z.string().min(1),
  ownerRole: z.string().min(1),
  companyName: z.string().min(1),
  companyWebsite: z.string().url().nullable(),
  instagramHandle: z.string().regex(/^@[A-Za-z0-9._]+$/),
  whatsappLink: z.string().url(),
  affiliateGroupLink: z.string().url().nullable(),
  affiliateFunnelEnabled: z.boolean(),
  oneLinePitch: z.string().min(1),
  howItWorks: z.array(z.string().min(1)).length(3),
  revenueModel: z.string().min(1),
  marketJargon: z.record(z.string(), z.string()),
  verifiedClaims: z.array(z.object({ claim: z.string().min(1), evidence: z.string().min(1) })),
  unverifiedClaims: z.array(z.string().min(1)),
  icpSegments: z.array(z.string().min(1)).min(1),
  icpKeywords: z.array(z.string().min(1)).min(1),
  affiliateTopics: z.array(z.string()),
  geography: z.string().min(1),
}).superRefine((value, context) => {
  if (value.affiliateFunnelEnabled && !value.affiliateGroupLink) {
    context.addIssue({ code: "custom", message: "affiliateGroupLink is required when affiliate funnel is enabled" });
  }
});

export function loadBusinessConfig(filename = "business.json") {
  if (path.basename(filename) !== filename) throw new Error("Business config must be a file inside the config directory");
  const absolute = path.join(process.cwd(), "config", filename);
  return businessSchema.parse(JSON.parse(fs.readFileSync(absolute, "utf8")));
}

export type BusinessConfig = ReturnType<typeof loadBusinessConfig>;
