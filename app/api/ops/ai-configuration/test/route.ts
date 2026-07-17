import { NextResponse } from "next/server";
import { generateText } from "ai";
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
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";
export const maxDuration = 15;

const HEALTH_CHECK_TIMEOUT_MS = 10_000;

export async function POST() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const modelId = resolveGeminiReportModelId();
  const keys = listGeminiApiKeys();
  const primary = keys[0] ?? null;
  const primarySource = getGeminiConfigurationStatus().primarySource;

  if (!primary) {
    return NextResponse.json(
      {
        configured: false,
        reachable: false,
        provider: "google",
        primarySource: null,
        formatValid: false,
        message: GEMINI_NOT_CONFIGURED_MESSAGE,
      },
      { status: 503 },
    );
  }

  const formatValid = isGeminiApiKeyFormatValid(primary);
  const t0 = performance.now();

  try {
    const model = getGeminiReportModelForApiKey(primary, modelId);
    await generateText({
      model,
      prompt: "ok",
      abortSignal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    const latencyMs = Math.round(performance.now() - t0);
    return NextResponse.json({
      configured: true,
      reachable: true,
      provider: "google",
      primarySource,
      latencyMs,
      formatValid,
      modelId,
    });
  } catch (error) {
    const latencyMs = Math.round(performance.now() - t0);
    if (isGeminiAuthError(error)) {
      return NextResponse.json(
        {
          configured: true,
          reachable: false,
          provider: "google",
          primarySource,
          latencyMs,
          formatValid,
          modelId,
          message: GEMINI_AUTH_ERROR_HINT,
        },
        { status: 502 },
      );
    }
    if (isGeminiUnreachableError(error)) {
      return NextResponse.json(
        {
          configured: true,
          reachable: false,
          provider: "google",
          primarySource,
          latencyMs,
          formatValid,
          modelId,
          message: "Chiave presente ma API Gemini non raggiungibile.",
        },
        { status: 503 },
      );
    }
    const message = error instanceof Error ? error.message : "Test Gemini fallito";
    return NextResponse.json(
      {
        configured: true,
        reachable: false,
        provider: "google",
        primarySource,
        latencyMs,
        formatValid,
        modelId,
        message,
      },
      { status: 502 },
    );
  }
}
