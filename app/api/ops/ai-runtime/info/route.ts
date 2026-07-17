import { NextResponse } from "next/server";
import { buildAiRuntimeInfoPayload } from "@/lib/ai/runtime/diagnostics";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const payload = await buildAiRuntimeInfoPayload();
  return NextResponse.json(payload);
}
