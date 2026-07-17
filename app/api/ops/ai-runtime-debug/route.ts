import { NextResponse } from "next/server";
import { buildAiRuntimeDebugPayload } from "@/lib/ops/ai-runtime-debug.server";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json(buildAiRuntimeDebugPayload());
}
