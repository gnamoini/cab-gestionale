import type { ReportMetricKind } from "@/lib/report/metrics/report-metric-types";
import { REPORT_METRIC_REGISTRY } from "@/lib/report/metrics/report-metric-registry";

export function reportMetricRendererAudit(
  rendererMap: Partial<Record<ReportMetricKind, unknown>>,
): string[] {
  const missing: string[] = [];
  const kinds = new Set<ReportMetricKind>();
  for (const entry of REPORT_METRIC_REGISTRY) {
    if (entry.status !== "active") continue;
    kinds.add(entry.rendererKind);
  }
  for (const kind of kinds) {
    if (rendererMap[kind] == null) {
      missing.push(kind);
    }
  }
  return missing;
}
