import type { KpiCardModel } from "@/lib/report/build-report-model";
import { parseMetricNumber } from "@/lib/report/adapters/parse-metric-number";
import { compareFromDeltaRows } from "@/lib/report/metrics/build-metric-compare-state";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import type { ReportMetric } from "@/lib/report/metrics/report-metric-types";

export function fromKpiCardModel(card: KpiCardModel): ReportMetric | null {
  const entry = getRegistryEntry(card.id);
  if (!entry) return null;

  const value = parseMetricNumber(card.value);
  const metric: ReportMetric = {
    id: card.id,
    value,
    compare: compareFromDeltaRows(value, card.compareRows),
    source: { module: entry.sourceModule, trace: "fromKpiCardModel" },
  };

  if (card.spark?.length) {
    metric.payload = { kind: "kpi", data: { spark: card.spark } };
  }

  return metric;
}

export function fromKpiCardModels(cards: readonly KpiCardModel[]): ReportMetric[] {
  const out: ReportMetric[] = [];
  for (const c of cards) {
    const m = fromKpiCardModel(c);
    if (m) out.push(m);
  }
  return out;
}
