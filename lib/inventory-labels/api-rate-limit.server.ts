import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const BULK_RATE_LIMIT: IpRateLimitConfig = {
  namespace: "inventory-labels-bulk",
  windowMs: 60_000,
  maxAttempts: 3,
};

export async function isInventoryLabelsBulkRateLimited(userId: string): Promise<boolean> {
  return isIpRateLimited(BULK_RATE_LIMIT, `user:${userId}`);
}
