import { readRuntimeSecret } from "@/lib/ai/runtime/env-reader";

export const GOOGLE_HEALTH_CHECK_MODEL_DEFAULT = "gemini-3.1-flash-lite";
export const GOOGLE_HEALTH_CHECK_TIMEOUT_MS = 30_000;

export function resolveGoogleHealthCheckModelId(): string {
  return readRuntimeSecret("AI_HEALTH_CHECK_MODEL") || GOOGLE_HEALTH_CHECK_MODEL_DEFAULT;
}
