import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const GENERATE_LIMIT: IpRateLimitConfig = {
  namespace: "business-report-generate",
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
};

const REGENERATE_LIMIT: IpRateLimitConfig = {
  namespace: "business-report-regenerate",
  windowMs: 10 * 60 * 1000,
  maxAttempts: 2,
};

export async function isBusinessReportRateLimited(userId: string, regenerate: boolean): Promise<boolean> {
  const cfg = regenerate ? REGENERATE_LIMIT : GENERATE_LIMIT;
  return isIpRateLimited(cfg, `${userId}:${regenerate ? "regen" : "gen"}`);
}
