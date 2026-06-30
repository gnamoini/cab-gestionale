import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const LISTINO_IMPORT_AI_RATE_LIMIT: IpRateLimitConfig = {
  namespace: "listino-import-ai",
  windowMs: 10 * 60 * 1000,
  maxAttempts: 8,
};

export async function isListinoImportAiRateLimited(userId: string): Promise<boolean> {
  const key = userId.trim() || "unknown";
  return isIpRateLimited(LISTINO_IMPORT_AI_RATE_LIMIT, key);
}
