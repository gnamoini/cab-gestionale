import "server-only";

import { adaptHealthScoreToOperational } from "@/lib/health-score/explain/adapt-to-operational-health-score";
import { filterBreakdownForViewer } from "@/lib/health-score/explain/filter-breakdown-for-viewer";
import { runHealthScoreServer } from "@/lib/health-score/engine/run-health-score.server";
import type { OperationalHealthScore } from "@/lib/dashboard/operational-health-score";
import { loadServerModuleAccessMap } from "@/src/lib/auth/server-permission-guards";

export type DashboardHealthScoreApiPayload = {
  status: "READY" | "CALCULATING" | "STALE" | "FAILED";
  score: OperationalHealthScore | null;
  meta: Record<string, unknown>;
};

/** SSOT payload per GET /api/dashboard/health-score e seed SSR dashboard. */
export async function buildDashboardHealthScoreApiPayloadServer(): Promise<DashboardHealthScoreApiPayload> {
  const fullResult = await runHealthScoreServer();
  const moduleAccess = await loadServerModuleAccessMap();
  const access = moduleAccess ?? {};
  const filteredBreakdown = filterBreakdownForViewer(fullResult.breakdown, access);
  const score = adaptHealthScoreToOperational(fullResult, access);

  return {
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
  };
}
