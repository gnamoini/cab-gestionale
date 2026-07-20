import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { canonicalMetricIds } from "@/lib/report/datasets/registry";
import type { DatasetBuildResult, DatasetMetricRow } from "@/lib/report/datasets/types";
import { buildLaborAnalytics } from "@/lib/report/report-domain-analytics";
import { sumRicambiCostFromMagLog } from "@/lib/report/kpi-performance/kpi-performance-formulas";

export type OreDatasetData = {
  metrics: DatasetMetricRow[];
};

export function buildOreDataset(
  ctx: ReportDatasetContext,
  slices: ReportDatasetSlices,
): DatasetBuildResult<OreDatasetData> {
  const {
    integrity,
    magazzinoRows,
    range,
    compareRange,
    compareMode,
    rangeKey,
    totalHours = 0,
    schedeStore = null,
    costoOrario = 0,
  } = slices;

  const labor = buildLaborAnalytics({
    rangeKey,
    requestId: 0,
    range,
    compareRange,
    compareMode,
    completate: integrity.completate,
    schedeStore,
    totalHours,
    costoOrario,
    magazzinoRows: [...magazzinoRows],
  });

  const movementValue = sumRicambiCostFromMagLog(integrity.magLog, integrity.magazzino, range);
  const costTot = movementValue + labor.manodoperaCost;

  const metrics: DatasetMetricRow[] = [
    { id: "ore_total", value: labor.totalHours, label: "Ore totali" },
    { id: "cost-tot", value: costTot, label: "Costi manutenzione" },
  ];

  void ctx;

  return {
    data: { metrics },
    metricIds: canonicalMetricIds(metrics.map((m) => m.id)),
  };
}
