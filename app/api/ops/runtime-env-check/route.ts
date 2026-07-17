import { NextResponse } from "next/server";
import { buildRuntimeEnvCheckPayload } from "@/lib/ai/gemini-env-diagnostics";
import { logGeminiConfigurationCheck } from "@/lib/ai/gemini-observability.server";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const payload = buildRuntimeEnvCheckPayload();
  logGeminiConfigurationCheck({
    configured: payload.resolvedKeyCount > 0,
    primarySource: payload.primarySource,
    keyLength: payload.primarySource ? (payload.lengths[payload.primarySource] ?? 0) : 0,
    formatValid: payload.primarySource
      ? (payload.formatValid[payload.primarySource] ?? false)
      : false,
    resolverMismatch: false,
  });
  return NextResponse.json(payload);
}
