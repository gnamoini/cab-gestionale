import { NextResponse } from "next/server";
import { syncRuntimeConfigToDatabase } from "@/lib/ai/runtime/sync-runtime-config";
import { requireOpsAdmin } from "@/lib/ops/ops-api-auth.server";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireOpsAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const result = await syncRuntimeConfigToDatabase({ dryRun: true });
    return NextResponse.json({
      environment: process.env.VERCEL_ENV ?? "development",
      candidates: result.candidates,
      syncConfidence: result.syncConfidence,
      wouldCreate: result.wouldCreate,
      wouldUpdate: result.wouldUpdate,
      wouldDisable: result.wouldDisable,
      warnings: result.warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        syncConfidence: false,
        wouldCreate: [],
        wouldUpdate: [],
        wouldDisable: [],
        warnings: [error instanceof Error ? error.message : "sync preview failed"],
      },
      { status: 503 },
    );
  }
}
