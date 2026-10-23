export const customerPipeline = [
  "discovered", "qualified", "contacted", "replied", "interested",
  "whatsapp_handoff", "registered", "active_customer", "closed",
] as const;

export const channelStates = [
  "browser_contact_pending", "browser_contact_sent", "waiting_inbound_reply", "api_eligible",
  "api_active", "api_window_closed", "human_review_required", "do_not_contact", "blocked", "completed",
] as const;

export type PipelineState = typeof customerPipeline[number];
export type ChannelState = typeof channelStates[number];

const allowedPipelineTransitions: Record<PipelineState, readonly PipelineState[]> = {
  discovered: ["qualified", "closed"],
  qualified: ["contacted", "closed"],
  contacted: ["replied", "closed"],
  replied: ["interested", "closed"],
  interested: ["whatsapp_handoff", "closed"],
  whatsapp_handoff: ["registered", "closed"],
  registered: ["active_customer", "closed"],
  active_customer: ["closed"],
  closed: [],
};

export function assertPipelineTransition(from: string, to: string): asserts to is PipelineState {
  if (!customerPipeline.includes(from as PipelineState) || !customerPipeline.includes(to as PipelineState)) {
    throw new Error(`Unknown pipeline state: ${from} -> ${to}`);
  }
  if (!allowedPipelineTransitions[from as PipelineState].includes(to as PipelineState)) {
    throw new Error(`Invalid pipeline transition: ${from} -> ${to}`);
  }
}

export function normalizeInstagramHandle(handle: string) {
  const normalized = handle.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/[/?#].*$/, "");
  const withAt = normalized.startsWith("@") ? normalized : `@${normalized}`;
  if (!/^@[A-Za-z0-9._]{1,30}$/.test(withAt)) throw new Error("Invalid Instagram handle");
  return withAt.toLowerCase();
}

export function messagePassesClaimGuard(message: string, blockedClaims: string[]) {
  const normalized = message.toLocaleLowerCase("pt-BR");
  const forbidden = ["garantimos", "garantia de resultado", "a maior agência", "a melhor agência", "retorno garantido"];
  if (forbidden.some((term) => normalized.includes(term))) return false;
  return !blockedClaims.some((claim) => normalized.includes(claim.toLocaleLowerCase("pt-BR")));
}
