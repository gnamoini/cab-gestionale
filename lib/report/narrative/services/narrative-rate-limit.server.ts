import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const NARRATIVE_RATE_LIMIT: IpRateLimitConfig = {
  namespace: "report-narrative",
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
};

export type NarrativeRateLimitContext = {
  userId: string;
  companyId: string;
  operation: "report_narrative";
};

function rateLimitKey(ctx: NarrativeRateLimitContext): string {
  return `${ctx.userId.trim() || "unknown"}:${ctx.companyId.trim() || "unknown"}:${ctx.operation}`;
}

/** true = bloccato */
export async function isNarrativeRateLimited(ctx: NarrativeRateLimitContext): Promise<boolean> {
  return isIpRateLimited(NARRATIVE_RATE_LIMIT, rateLimitKey(ctx));
}
