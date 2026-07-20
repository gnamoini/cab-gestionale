import type { CrossDatasetKey } from "@/lib/report/cross-analysis/types";
import {
  getRegistryEntry,
  type CanonicalMetricId,
} from "@/lib/report/metrics/report-metric-registry";
import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";

export type DerivedMetricCategory = "cross" | "trend" | "insight";

export type DerivedMetricDefinition = {
  metricId: CanonicalMetricId;
  category: DerivedMetricCategory;
  sourceDatasets: CrossDatasetKey[];
  formulaReference?: string;
};

export function createDerivedMetric(
  metricId: CanonicalMetricId,
  def: Omit<DerivedMetricDefinition, "metricId">,
): DerivedMetricDefinition {
  const canonical = resolveCanonicalMetricId(metricId);
  if (canonical !== metricId) {
    throw new Error(`derived-metric-catalog: non-canonical metricId ${metricId}`);
  }
  if (!getRegistryEntry(metricId)) {
    throw new Error(`derived-metric-catalog: missing registry entry ${metricId}`);
  }
  return { metricId, ...def };
}

export function defineDerivedMetrics(
  entries: DerivedMetricDefinition[],
): readonly DerivedMetricDefinition[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.metricId)) {
      throw new Error(`derived-metric-catalog: duplicate metricId ${entry.metricId}`);
    }
    ids.add(entry.metricId);
  }
  return Object.freeze(entries);
}

export const derivedMetricCatalog = defineDerivedMetrics([
  createDerivedMetric("cross_efficiency", {
    category: "cross",
    sourceDatasets: ["lavorazioni", "ore"],
    formulaReference: "completedInPeriod / totalHours",
  }),
  createDerivedMetric("cross_parts_job", {
    category: "cross",
    sourceDatasets: ["magazzino", "lavorazioni"],
    formulaReference: "partsUsedQty / completedInPeriod",
  }),
  createDerivedMetric("cross_cost_job", {
    category: "cross",
    sourceDatasets: ["lavorazioni", "magazzino", "ore"],
    formulaReference: "(movementValue + manodoperaCost) / completedInPeriod",
  }),
  createDerivedMetric("cross_value_hour", {
    category: "cross",
    sourceDatasets: ["economico", "ore"],
    formulaReference: "invoicesBilled / totalHours",
  }),
]);

export function crossDerivedMetrics(): DerivedMetricDefinition[] {
  return derivedMetricCatalog.filter((e) => e.category === "cross");
}
