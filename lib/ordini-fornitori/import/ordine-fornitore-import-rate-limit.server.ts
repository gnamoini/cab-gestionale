import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const ORDINE_IMPORT_AI_RATE_LIMIT: IpRateLimitConfig = {
  namespace: "ordine-fornitore-import-ai",
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
};

export async function isOrdineFornitoreImportAiRateLimited(userId: string): Promise<boolean> {
  const key = userId.trim() || "unknown";
  return isIpRateLimited(ORDINE_IMPORT_AI_RATE_LIMIT, key);
}
