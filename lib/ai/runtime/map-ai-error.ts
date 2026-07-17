import type { AiErrorCode } from "@/lib/ai/runtime/types";
import { aiErrorMessage } from "@/lib/ai/runtime/errors";

/** Maps runtime error codes to legacy API analyze codes. */
export function mapAiErrorToAnalyzeCode(code: AiErrorCode): "not_configured" | "auth_invalid" | "unreachable" | "failed" {
  if (code === "AI_CONFIG_MISSING") return "not_configured";
  if (code === "AI_KEY_INVALID") return "auth_invalid";
  if (code === "AI_PROVIDER_DOWN" || code === "AI_TIMEOUT") return "unreachable";
  return "failed";
}

export function mapAiErrorToLegacyErrorType(code: AiErrorCode): string {
  if (code === "AI_CONFIG_MISSING") return "CONFIG_NOT_FOUND";
  if (code === "AI_KEY_INVALID") return "CONFIG_INVALID_FORMAT";
  return code;
}

export function userMessageForAiError(code: AiErrorCode): string {
  return aiErrorMessage(code);
}
