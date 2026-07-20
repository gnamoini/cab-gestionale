import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai/runtime/service";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const status = await aiService.getConfigurationStatus();
  if (!status.configured) {
    return NextResponse.json(
      { success: false, errorType: "AI_CONFIG_MISSING", configured: false, reachable: false },
      { status: 503 },
    );
  }

  const result = await aiService.runHealthCheck();
  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        errorType: result.code,
        errorMessage: result.message,
        configured: true,
        reachable: false,
        model: status.modelId,
      },
      { status: result.code === "AI_KEY_INVALID" ? 502 : 503 },
    );
  }

  return NextResponse.json({
    success: true,
    latencyMs: result.data.latencyMs,
    configured: true,
    reachable: true,
    model: status.modelId,
    provider: status.provider,
    activeKeyCount: status.activeKeyCount,
    degradedMode: status.degradedMode,
  });
}
