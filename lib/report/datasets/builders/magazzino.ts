import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { canonicalMetricIds } from "@/lib/report/datasets/registry";
import type { DatasetBuildResult, DatasetMetricRow } from "@/lib/report/datasets/types";
import { buildWarehouseAnalytics } from "@/lib/report/report-domain-analytics";
import { aggregateMagazzinoQtyByProductInRange } from "@/lib/report/magazzino-period-aggregate";
import { sumRicambiCostFromMagLog, sottoScortaCount } from "@/lib/report/kpi-performance/kpi-performance-formulas";

export type MagazzinoDatasetData = {
  metrics: DatasetMetricRow[];
};

export function buildMagazzinoDataset(
  ctx: ReportDatasetContext,
  slices: ReportDatasetSlices,
): DatasetBuildResult<MagazzinoDatasetData> {
  const { integrity, magazzinoRows, range, compareRange, compareMode, rangeKey, ordini = [] } = slices;
  const warehouse = buildWarehouseAnalytics({
    rangeKey,
    requestId: 0,
    range,
    compareRange,
    compareMode,
    magLog: integrity.magLog,
    magazzino: integrity.magazzino,
    magazzinoRows: [...magazzinoRows],
    ordini,
  });

  const agg = aggregateMagazzinoQtyByProductInRange(integrity.magLog, range);
  let ricUsati = 0;
  for (const v of agg.values()) ricUsati += v.uscite;
  const movementValue = sumRicambiCostFromMagLog(integrity.magLog, integrity.magazzino, range);
  const scorta = sottoScortaCount(integrity.magazzino);

  const metrics: DatasetMetricRow[] = [
    { id: "scorta", value: scorta, label: "Ricambi sotto scorta" },
    { id: "ric-usati", value: ricUsati, label: "Ricambi movimentati" },
    { id: "mag_movement_value", value: movementValue, label: "Valore movimentato" },
  ];

  void warehouse;

  return {
    data: { metrics },
    metricIds: canonicalMetricIds(metrics.map((m) => m.id)),
  };
}
