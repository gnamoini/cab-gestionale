import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import type { DatasetMetricRow } from "@/lib/report/datasets/types";
import type { CrossFormulaInput } from "@/lib/report/cross-analysis/types";
import type {
  EconomicAnalyticsDto,
  LaborAnalyticsDto,
  OperationalAnalyticsDto,
  ReportAnalyticsDerivedSnapshot,
  WarehouseAnalyticsDto,
} from "@/lib/report/report-domain-types";

function metricValue(metrics: DatasetMetricRow[], id: string): number | undefined {
  const row = metrics.find((m) => m.id === id);
  if (!row) return undefined;
  const n = typeof row.value === "number" ? row.value : Number(row.value);
  return Number.isFinite(n) ? n : undefined;
}

export function crossFormulaInputFromDerived(
  derived: ReportAnalyticsDerivedSnapshot,
): CrossFormulaInput {
  const op = derived.operational?.data;
  const wh = derived.warehouse?.data;
  const lab = derived.labor?.data;
  const eco = derived.economic?.data;

  return {
    operational: op ? { completedInPeriod: op.completedInPeriod } : undefined,
    warehouse: wh
      ? { partsUsedQty: wh.partsUsedQty, movementValue: wh.movementValue }
      : undefined,
    labor: lab ? { totalHours: lab.totalHours, actualLaborHours: lab.actualLaborHours, manodoperaCost: lab.manodoperaCost } : undefined,
    economic: eco ? { invoicesBilled: eco.invoicesBilled } : undefined,
  };
}

export function normalizeCrossInput(bundle: AnalyticsDatasetBundle): CrossFormulaInput {
  const { lavorazioni, magazzino, economico, ore } = bundle.datasets;
  const movementValue = metricValue(magazzino.metrics, "mag_movement_value") ?? 0;
  const costTot = metricValue(ore.metrics, "cost-tot") ?? 0;

  return {
    operational: {
      completedInPeriod: metricValue(lavorazioni.metrics, "lav-chiusi") ?? 0,
    },
    warehouse: {
      partsUsedQty: metricValue(magazzino.metrics, "ric-usati") ?? 0,
      movementValue,
    },
    labor: {
      totalHours: metricValue(ore.metrics, "ore_total") ?? 0,
      manodoperaCost: costTot - movementValue,
    },
    economic: economico.invoicesAvailable
      ? { invoicesBilled: metricValue(economico.metrics, "eco_fatturato") ?? 0 }
      : undefined,
  };
}

/** Test helper — build bundle-shaped input from domain DTOs without server slices. */
export function bundleFromDomainDtos(dtos: {
  operational?: OperationalAnalyticsDto;
  warehouse?: WarehouseAnalyticsDto;
  labor?: LaborAnalyticsDto;
  economic?: EconomicAnalyticsDto;
  invoicesAvailable?: boolean;
}): AnalyticsDatasetBundle {
  const invoicesAvailable = dtos.invoicesAvailable ?? Boolean(dtos.economic);
  return {
    datasets: {
      lavorazioni: {
        metrics: [
          {
            id: "lav-chiusi",
            value: dtos.operational?.completedInPeriod ?? 0,
            label: "Chiusure periodo",
          },
        ],
      },
      magazzino: {
        metrics: [
          {
            id: "ric-usati",
            value: dtos.warehouse?.partsUsedQty ?? 0,
            label: "Ricambi movimentati",
          },
          {
            id: "mag_movement_value",
            value: dtos.warehouse?.movementValue ?? 0,
            label: "Valore movimentato",
          },
        ],
      },
      economico: {
        metrics: [
          {
            id: "eco_fatturato",
            value: dtos.economic?.invoicesBilled ?? 0,
            label: "Fatturato periodo",
          },
        ],
        invoicesAvailable,
        metricHealth: invoicesAvailable ? { eco_fatturato: { status: "full" } } : { eco_fatturato: { status: "partial" } },
      },
      ore: {
        metrics: [
          {
            id: "ore_total",
            value: dtos.labor?.totalHours ?? 0,
            label: "Ore totali",
          },
          {
            id: "cost-tot",
            value: (dtos.warehouse?.movementValue ?? 0) + (dtos.labor?.manodoperaCost ?? 0),
            label: "Costi manutenzione",
          },
        ],
      },
    },
    metadata: {
      childMetadata: [],
      generatedAt: new Date().toISOString(),
    },
  };
}
