import type { CrossDatasetKey } from "@/lib/report/cross-analysis/types";
import type { CanonicalMetricId } from "@/lib/report/metrics/report-metric-registry";

export type CrossMetricDefinition = {
  metricId: CanonicalMetricId;
  displayKey: string;
  priority: number;
  sourceDatasets: CrossDatasetKey[];
};

export const CROSS_P0_METRIC_IDS = [
  "cross_efficiency",
  "cross_parts_job",
  "cross_cost_job",
  "cross_value_hour",
] as const satisfies readonly CanonicalMetricId[];

export type CrossP0MetricId = (typeof CROSS_P0_METRIC_IDS)[number];

export const CROSS_METRIC_REGISTRY: readonly CrossMetricDefinition[] = [
  {
    metricId: "cross_efficiency",
    displayKey: "report.cross.efficiency",
    priority: 1,
    sourceDatasets: ["lavorazioni", "ore"],
  },
  {
    metricId: "cross_parts_job",
    displayKey: "report.cross.parts_job",
    priority: 2,
    sourceDatasets: ["magazzino", "lavorazioni"],
  },
  {
    metricId: "cross_cost_job",
    displayKey: "report.cross.cost_job",
    priority: 3,
    sourceDatasets: ["lavorazioni", "magazzino", "ore"],
  },
  {
    metricId: "cross_value_hour",
    displayKey: "report.cross.value_hour",
    priority: 4,
    sourceDatasets: ["economico", "ore"],
  },
] as const;

export function sortedCrossMetrics(): CrossMetricDefinition[] {
  return [...CROSS_METRIC_REGISTRY].sort((a, b) => a.priority - b.priority);
}
