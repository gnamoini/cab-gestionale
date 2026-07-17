import "server-only";

import type { GeminiErrorType } from "@/lib/ai/gemini-error-types";

type GeminiObsEvent =
  | "AI_CONFIGURATION_CHECK"
  | "AI_CLIENT_CREATED"
  | "AI_REQUEST"
  | "AI_RESPONSE"
  | "AI_FAILURE"
  | "AI_REQUEST_STARTED"
  | "AI_REQUEST_COMPLETED"
  | "AI_REQUEST_FAILED";

export function logGeminiObs(
  event: GeminiObsEvent,
  payload: Record<string, string | number | boolean | null | undefined>,
): void {
  console.info(
    JSON.stringify({
      event,
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
      vercelEnv: process.env.VERCEL_ENV ?? null,
      commitSha: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      runtime: "nodejs",
      ...payload,
    }),
  );
}

export function logGeminiConfigurationCheck(payload: {
  configured: boolean;
  primarySource: string | null;
  keyLength: number;
  formatValid: boolean;
  resolverMismatch: boolean;
}): void {
  if (payload.configured && !payload.resolverMismatch) return;
  logGeminiObs("AI_CONFIGURATION_CHECK", payload);
}

export function logGeminiClientCreated(payload: { primarySource: string | null; model: string }): void {
  logGeminiObs("AI_CLIENT_CREATED", payload);
}

export function logGeminiRequestStarted(payload: { model: string; operation: string }): void {
  logGeminiObs("AI_REQUEST", payload);
}

export function logGeminiRequestCompleted(payload: {
  model: string;
  operation: string;
  durationMs: number;
}): void {
  logGeminiObs("AI_RESPONSE", payload);
}

export function logGeminiRequestFailed(payload: {
  model: string;
  operation: string;
  durationMs: number;
  errorCode: GeminiErrorType;
  errorMessage: string;
}): void {
  logGeminiObs("AI_FAILURE", payload);
}
