import { NextResponse } from "next/server";
import { buildAiRuntimeKeysPayload } from "@/lib/ai/runtime/diagnostics";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const payload = await buildAiRuntimeKeysPayload();
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Errore caricamento chiavi AI";
    return NextResponse.json({ error: message, keys: [] }, { status: 503 });
  }
}
