import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const ASK_LIMIT: IpRateLimitConfig = {
  namespace: "ask-report",
  windowMs: 60 * 1000,
  maxAttempts: 10,
};

export async function isAskReportRateLimited(userId: string): Promise<boolean> {
  return isIpRateLimited(ASK_LIMIT, userId);
}
