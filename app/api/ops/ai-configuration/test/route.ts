import { NextResponse } from "next/server";
import { generateText } from "ai";
import {
  buildGeminiOpsConfigurationPayload,
  resolveConfigurationErrorType,
} from "@/lib/ai/gemini-env-diagnostics";
import { classifyGeminiError } from "@/lib/ai/gemini-error-types";
import {
  getGeminiConfigurationStatus,
  isGeminiApiKeyFormatValid,
  isGeminiAuthError,
  isGeminiUnreachableError,
} from "@/lib/ai/gemini-api-keys";
import {
  GEMINI_AUTH_ERROR_HINT,
  GEMINI_NOT_CONFIGURED_MESSAGE,
  getGeminiReportModelForApiKey,
  listGeminiApiKeys,
  resolveGeminiReportModelId,
} from "@/lib/ai/gemini-client";
import { logGeminiClientCreated, logGeminiRequestFailed } from "@/lib/ai/gemini-observability.server";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";
export const maxDuration = 15;

const HEALTH_CHECK_TIMEOUT_MS = 10_000;

export async function POST() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const modelId = resolveGeminiReportModelId();
  const base = buildGeminiOpsConfigurationPayload(modelId);
  const keys = listGeminiApiKeys();
  const primary = keys[0] ?? null;
  const primarySource = getGeminiConfigurationStatus().primarySource;
  const keyLength = primarySource ? (base.resolver.directPresence[primarySource]?.length ?? 0) : 0;

  const configErrorType = resolveConfigurationErrorType({
    configured: Boolean(primary),
    keyLength,
    formatValid: isGeminiApiKeyFormatValid(primary),
  });

  if (!primary || configErrorType) {
    return NextResponse.json(
      {
        ...base,
        success: false,
        latencyMs: 0,
        errorType: configErrorType ?? "CONFIG_NOT_FOUND",
        errorMessage: GEMINI_NOT_CONFIGURED_MESSAGE,
        httpStatus: 503,
        reachable: false,
      },
      { status: 503 },
    );
  }

  const formatValid = isGeminiApiKeyFormatValid(primary);
  const t0 = performance.now();

  try {
    const model = getGeminiReportModelForApiKey(primary, modelId);
    logGeminiClientCreated({ primarySource, model: modelId });
    await generateText({
      model,
      prompt: "ok",
      abortSignal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - t0);
    return NextResponse.json({
      ...base,
      success: true,
      latencyMs,
      errorType: null,
      errorMessage: null,
      httpStatus: 200,
      formatValid,
      reachable: true,
      lastInitializationError: null,
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - t0);
    const errorType = isGeminiAuthError(error)
      ? "AUTH_INVALID_KEY"
      : isGeminiUnreachableError(error)
        ? "NETWORK_ERROR"
        : classifyGeminiError(error);
    const errorMessage =
      errorType === "AUTH_INVALID_KEY"
        ? GEMINI_AUTH_ERROR_HINT
        : errorType === "NETWORK_ERROR"
          ? "Chiave presente ma API Gemini non raggiungibile."
          : error instanceof Error
            ? error.message
            : "Test Gemini fallito";
    logGeminiRequestFailed({
      model: modelId,
      operation: "ops_health_check",
      durationMs: latencyMs,
      errorCode: errorType,
      errorMessage,
    });
    const httpStatus =
      errorType === "AUTH_INVALID_KEY" || errorType === "AUTH_FORBIDDEN" ? 502 : 503;
    return NextResponse.json(
      {
        ...base,
        success: false,
        latencyMs,
        errorType,
        errorMessage,
        httpStatus,
        formatValid,
        reachable: false,
        lastInitializationError: errorMessage,
      },
      { status: httpStatus },
    );
  }
}
