import "dotenv/config";
import { getDatabase } from "./client";
import { createLead, enqueueJob } from "@/features/leads/repository";

const { db } = getDatabase();
const lead = await createLead(db, {
  instagramHandle: "@empresa_demo",
  displayName: "Empresa de demonstração",
  segment: "Comércio e varejo",
  geography: "Vale do Ribeira/SP",
  score: 72,
});
await enqueueJob(db, "browser_first_contact", lead.id, {
  variant: "demo-v1",
  message: "Olá! Vi o trabalho da empresa e achei interessante. Sou Rodrigo, da Seven Marketing. Posso fazer uma pergunta rápida sobre a divulgação do negócio?",
});
console.log(`Demo lead ready: ${lead.instagramHandle}`);
