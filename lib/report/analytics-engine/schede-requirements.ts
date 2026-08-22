import type { SchedeConsumerScope } from "@/lib/report/schede-report-scope";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";

/** Maps engine metrics needing schede to consumer scopes. */
export function resolveSchedeConsumerScopesForMetrics(metricIds: readonly string[]): SchedeConsumerScope {
  const scope: SchedeConsumerScope = {};
  for (const id of metricIds) {
    const entry = getEngineManifestEntry(id);
    if (!entry?.requiredSlices.schede) continue;
    if (id === "actual_labor_hours_total") {
      scope.needsActualHours = "hours_in_period";
    }
    if (id === "eco_margine_operativo_stimato") {
      scope.needsLaborCost = "completed_in_period";
      scope.needsMargin = "completed_in_period";
    }
  }
  return scope;
}
