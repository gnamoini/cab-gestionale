import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const SPARE_PARTS_SEARCH_RATE_LIMIT: IpRateLimitConfig = {
  namespace: "spare-parts-search",
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
};

export async function isSparePartsSearchRateLimited(userId: string): Promise<boolean> {
  const key = userId.trim() || "unknown";
  return isIpRateLimited(SPARE_PARTS_SEARCH_RATE_LIMIT, key);
}
