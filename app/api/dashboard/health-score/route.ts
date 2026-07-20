import { NextResponse } from "next/server";
import { adaptHealthScoreToOperational } from "@/lib/health-score/explain/adapt-to-operational-health-score";
import { filterBreakdownForViewer } from "@/lib/health-score/explain/filter-breakdown-for-viewer";
import { runHealthScoreServer } from "@/lib/health-score/engine/run-health-score.server";
import { verifyServerPageRead, loadServerModuleAccessMap } from "@/src/lib/auth/server-permission-guards";

export const runtime = "nodejs";

export async function GET() {
  const allowed = await verifyServerPageRead("dashboard");
  if (!allowed) {
    return NextResponse.json({ error: "Permesso negato" }, { status: 403 });
  }

  try {
    const fullResult = await runHealthScoreServer();
    const moduleAccess = await loadServerModuleAccessMap();
    const access = moduleAccess ?? {};
    const filteredBreakdown = filterBreakdownForViewer(fullResult.breakdown, access);
    const score = adaptHealthScoreToOperational(fullResult, access);

    return NextResponse.json({
      status: fullResult.status,
      score,
      meta: {
        workshopSize: fullResult.workshopSize,
        confidenceOverall: fullResult.confidenceOverall,
        dataQualityOverall: fullResult.dataQualityOverall,
        engineVersion: fullResult.engineVersion,
        configVersion: fullResult.configVersion,
        schemaVersion: fullResult.schemaVersion,
        cacheHit: fullResult.cacheHit,
        redactedSummary: filteredBreakdown.redactedSummary,
      },
    });
  } catch (e) {
    console.error("[health-score] compute failed", e);
    return NextResponse.json(
      { status: "FAILED", error: "Calcolo Health Score non riuscito" },
      { status: 500 },
    );
  }
}
