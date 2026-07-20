import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { canonicalMetricIds } from "@/lib/report/datasets/registry";
import type { DatasetBuildResult, DatasetMetricRow } from "@/lib/report/datasets/types";
import { buildOperationalAnalytics } from "@/lib/report/report-domain-analytics";
import { countOpenedInRange, countCompletedInRange } from "@/lib/report/lavorazioni-report-selectors";
import { countInterventiAperti, countInterventiInRitardo } from "@/lib/report/kpi-performance/kpi-performance-formulas";

export type LavorazioniDatasetData = {
  metrics: DatasetMetricRow[];
};

export function buildLavorazioniDataset(
  ctx: ReportDatasetContext,
  slices: ReportDatasetSlices,
): DatasetBuildResult<LavorazioniDatasetData> {
  const { integrity, lavRows, range, compareRange, compareMode, rangeKey } = slices;
  const operational = buildOperationalAnalytics({
    rangeKey,
    requestId: 0,
    range,
    compareRange,
    compareMode,
    attive: integrity.attive,
    storico: integrity.storico,
    completate: integrity.completate,
    lavRows,
    manualByMonth: integrity.manualByMonth,
  });

  const opened = countOpenedInRange(integrity.attive, integrity.storico, range);
  const completed = countCompletedInRange(integrity.completate, range, integrity.manualByMonth);
  const aperti = countInterventiAperti(integrity.attive);
  const late = countInterventiInRitardo(integrity.attive, new Date());

  const metrics: DatasetMetricRow[] = [
    { id: "lav-periodo", value: opened, label: "Carico periodo" },
    { id: "lav-chiusi", value: completed, label: "Chiusure periodo" },
    { id: "lav-aperti", value: aperti, label: "Interventi aperti" },
    { id: "lav-tempo", value: operational.avgCloseDays ?? 0, label: "Tempo medio chiusura" },
    { id: "lav_late_sla", value: late, label: "Oltre SLA" },
  ];

  return {
    data: { metrics },
    metricIds: canonicalMetricIds(metrics.map((m) => m.id)),
  };
}
