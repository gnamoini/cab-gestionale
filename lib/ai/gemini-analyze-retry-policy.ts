import { classifyAiError } from "@/lib/ai/runtime/errors";
import type { AiErrorCode } from "@/lib/ai/runtime/types";
import { isCaptureAnalyzeError } from "@/lib/document-capture/analyze-errors";
import { isGeminiQuotaErrorMessage } from "@/lib/ai/gemini-retry-after";

const TRANSIENT_AI_CODES = new Set<AiErrorCode>([
  "AI_RATE_LIMIT",
  "AI_QUOTA_EXCEEDED",
  "AI_PROVIDER_DOWN",
]);

/** Retry analyze solo su errori transient — mai dopo timeout completo o validazione schema. */
export function isTransientAnalyzeRetryError(error: unknown): boolean {
  if (isCaptureAnalyzeError(error)) {
    if (
      error.code === "AI_TIMEOUT" ||
      error.code === "SCHEMA_VALIDATION" ||
      error.code === "PHYSICAL_PARSE" ||
      error.code === "PREREQUISITES" ||
      error.code === "ANALYZE_TIMEOUT"
    ) {
      return false;
    }
    return TRANSIENT_AI_CODES.has(error.code as AiErrorCode);
  }

  const code = classifyAiError(error);
  if (code === "AI_TIMEOUT" || code === "AI_SCHEMA_VALIDATION") return false;
  if (code === "AI_KEY_INVALID" || code === "AI_CONFIG_MISSING" || code === "AI_MODEL_UNAVAILABLE") {
    return false;
  }
  if (TRANSIENT_AI_CODES.has(code)) return true;

  const message = error instanceof Error ? error.message : String(error);
  if (isGeminiQuotaErrorMessage(message)) return true;
  if (/ECONNRESET|ENOTFOUND|ETIMEDOUT|503|502|504/i.test(message)) return true;
  return false;
}
