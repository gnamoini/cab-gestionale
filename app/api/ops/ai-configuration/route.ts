import { NextResponse } from "next/server";
import { buildGeminiOpsConfigurationPayload } from "@/lib/ai/gemini-env-diagnostics";
import { logGeminiConfigurationCheck } from "@/lib/ai/gemini-observability.server";
import { resolveGeminiReportModelId } from "@/lib/ai/gemini-client";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const modelId = resolveGeminiReportModelId();
  const payload = buildGeminiOpsConfigurationPayload(modelId);
  logGeminiConfigurationCheck({
    configured: payload.configured,
    primarySource: payload.primarySource,
    keyLength: payload.keyLength,
    formatValid: payload.formatValid,
    resolverMismatch: payload.resolver.mismatchEntriesVsDirect,
  });
  return NextResponse.json(payload);
}
