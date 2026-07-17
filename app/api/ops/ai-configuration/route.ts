import { NextResponse } from "next/server";
import { getGeminiConfigurationStatus } from "@/lib/ai/gemini-api-keys";
import { resolveGeminiReportModelId } from "@/lib/ai/gemini-client";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const status = getGeminiConfigurationStatus(undefined, { modelId: resolveGeminiReportModelId() });
  return NextResponse.json(status);
}
