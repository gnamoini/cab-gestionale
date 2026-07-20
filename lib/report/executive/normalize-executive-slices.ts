import type { EconomicoDatasetData } from "@/lib/report/datasets/builders/economico";
import type { LavorazioniDatasetData } from "@/lib/report/datasets/builders/lavorazioni";
import type { MagazzinoDatasetData } from "@/lib/report/datasets/builders/magazzino";
import type { DatasetMetricHealth } from "@/lib/report/datasets/types";
import { sortedExecutiveMetrics } from "@/lib/report/executive/executive-metric-registry";
import type { ExecutiveDatasetKey, ExecutiveDatasetSlice } from "@/lib/report/executive/types";

type DatasetBundle = {
  lavorazioni: LavorazioniDatasetData;
  magazzino: MagazzinoDatasetData;
  economico: EconomicoDatasetData;
};

function metricHealthFor(
  dataset: ExecutiveDatasetKey,
  metricId: string,
  bundle: DatasetBundle,
): DatasetMetricHealth[string] | undefined {
  if (dataset === "economico") {
    return bundle.economico.metricHealth?.[metricId];
  }
  return undefined;
}

function metricValue(
  dataset: ExecutiveDatasetKey,
  metricId: string,
  bundle: DatasetBundle,
): number {
  const data = bundle[dataset];
  const row = data.metrics.find((m) => m.id === metricId);
  if (!row) {
    throw new Error(`Executive metric ${metricId} missing from ${dataset} dataset`);
  }
  return row.value;
}

export function normalizeExecutiveSlices(bundle: DatasetBundle): ExecutiveDatasetSlice[] {
  return sortedExecutiveMetrics().map((def) => ({
    metricId: def.metricId,
    value: metricValue(def.dataset, def.metricId, bundle),
    metricHealth: metricHealthFor(def.dataset, def.metricId, bundle),
    sourceDataset: def.dataset,
  }));
}
