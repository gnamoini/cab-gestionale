import "server-only";

import { isIpRateLimited, type IpRateLimitConfig } from "@/lib/security/ip-rate-limit";

const REPORT_ANALYSIS_RATE_LIMIT: IpRateLimitConfig = {
  namespace: "report-analysis",
  windowMs: 10 * 60 * 1000,
  maxAttempts: 5,
};

/** true = bloccato. Chiave per utente autenticato. */
export async function isReportAnalysisRateLimited(userId: string): Promise<boolean> {
  const key = userId.trim() || "unknown";
  return isIpRateLimited(REPORT_ANALYSIS_RATE_LIMIT, key);
}
