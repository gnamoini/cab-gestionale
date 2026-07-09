import type { UnifiedKpiDisplayItem } from "@/lib/report/kpi-performance/merge-unified-kpi-display";
import { parseMetricNumber } from "@/lib/report/adapters/parse-metric-number";
import {
  compareForApplicability,
  compareFromDeltaRows,
} from "@/lib/report/metrics/build-metric-compare-state";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportMetric } from "@/lib/report/metrics/report-metric-types";
import type { ReportCompareMode } from "@/lib/report/date-ranges";

export function fromUnifiedKpiItem(
  item: UnifiedKpiDisplayItem,
  compareMode?: ReportCompareMode,
): ReportMetric | null {
  const entry = getRegistryEntry(item.id);
  if (!entry || entry.status === "deprecated") return null;

  const value = parseMetricNumber(item.value);
  let compare = compareFromDeltaRows(value, item.compareRows);
  compare = compareForApplicability(entry.applicability, compareMode, compare);

  const metric: ReportMetric = {
    id: item.id,
    value,
    compare,
    source: { module: entry.sourceModule, trace: "fromUnifiedKpiItem" },
  };

  if (item.spark?.length) {
    metric.payload = { kind: "kpi", data: { spark: item.spark } };
  }

  return metric;
}

export function fromUnifiedKpiItems(
  items: readonly UnifiedKpiDisplayItem[],
  compareMode?: ReportCompareMode,
): ReportMetric[] {
  const out: ReportMetric[] = [];
  for (const item of items) {
    const m = fromUnifiedKpiItem(item, compareMode);
    if (m) out.push(m);
  }
  return out;
}
