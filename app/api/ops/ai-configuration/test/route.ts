import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai/runtime/service";
import { buildGeminiOpsConfigurationPayload } from "@/lib/ai/gemini-env-diagnostics";
import { resolveGeminiReportModelId } from "@/lib/ai/gemini-client";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const modelId = resolveGeminiReportModelId();
  const base = buildGeminiOpsConfigurationPayload(modelId);
  const status = await aiService.getConfigurationStatus();

  if (!status.configured) {
    return NextResponse.json(
      {
        ...base,
        success: false,
        latencyMs: 0,
        errorType: "AI_CONFIG_MISSING",
        errorMessage: "Servizio AI non configurato.",
        httpStatus: 503,
        reachable: false,
      },
      { status: 503 },
    );
  }

  const result = await aiService.runHealthCheck();

  if (!result.ok) {
    const httpStatus = result.code === "AI_KEY_INVALID" ? 502 : 503;
    return NextResponse.json(
      {
        ...base,
        success: false,
        latencyMs: result.meta?.durationMs ?? 0,
        errorType: result.code,
        errorMessage: result.message,
        httpStatus,
        reachable: false,
        degradedMode: status.degradedMode,
      },
      { status: httpStatus },
    );
  }

  return NextResponse.json({
    ...base,
    success: true,
    latencyMs: result.data.latencyMs,
    errorType: null,
    errorMessage: null,
    httpStatus: 200,
    formatValid: true,
    reachable: true,
    activeKeyCount: status.activeKeyCount,
    degradedMode: status.degradedMode,
    lastInitializationError: null,
  });
}
