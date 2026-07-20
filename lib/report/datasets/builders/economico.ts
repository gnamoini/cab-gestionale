import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import {
  ECO_DA_INCASSARE_SOURCE_PENDING,
  ECO_FATTURATO_SOURCE_PENDING,
  type ReportDatasetSlices,
} from "@/lib/report/datasets/builders/shared";
import { canonicalMetricIds } from "@/lib/report/datasets/registry";
import type {
  DatasetBuildResult,
  DatasetMetricHealth,
  DatasetMetricRow,
} from "@/lib/report/datasets/types";
import { computeTopClienteConcentration } from "@/lib/report/economic-analytics-extended";
import { computeDsoDays } from "@/lib/report/economic-credit-analytics";
import { buildEconomicAnalytics, buildInvoicePeriodKpi } from "@/lib/report/report-domain-analytics";

export type EconomicoDatasetSignals = {
  collectionRatePct: number | null;
  overdueAmount: number;
  dsoDays: number | null;
  marginPct: number | null;
  topClienteSharePct: number | null;
  topClienteLabel: string | null;
};

export type EconomicoDatasetData = {
  metrics: DatasetMetricRow[];
  metricHealth?: DatasetMetricHealth;
  invoicesAvailable: boolean;
  signals?: EconomicoDatasetSignals;
};

export function buildEconomicoDataset(
  ctx: ReportDatasetContext,
  slices: ReportDatasetSlices,
): DatasetBuildResult<EconomicoDatasetData> {
  const {
    range,
    compareRange,
    compareMode,
    rangeKey,
    preventivi = [],
    invoices = [],
    ddtDocuments = [],
    invoicesAvailable = false,
  } = slices;

  const economic = buildEconomicAnalytics({
    rangeKey,
    requestId: 0,
    range,
    compareRange,
    compareMode,
    preventivi,
    invoices,
    ddtDocuments,
  });

  const invKpi = buildInvoicePeriodKpi(invoices, range);
  const collectionRatePct =
    invKpi.fatturato > 0 ? Math.round((invKpi.incassato / invKpi.fatturato) * 1000) / 10 : null;
  const concentration = computeTopClienteConcentration(invoices, range);

  const metrics: DatasetMetricRow[] = [
    { id: "eco_preventivi", value: economic.preventiviCount, label: "Preventivi" },
  ];

  const metricHealth: DatasetMetricHealth = {};

  if (invoicesAvailable && invoices.length >= 0) {
    metrics.push({
      id: "eco_fatturato",
      value: economic.invoicesBilled,
      label: "Fatturato periodo",
    });
    metricHealth.eco_fatturato = { status: "full" };
    metrics.push({
      id: "eco_incassato",
      value: invKpi.incassato,
      label: "Incassato periodo",
    });
    metricHealth.eco_incassato = { status: "full" };
    metrics.push({
      id: "eco_da_incassare",
      value: invKpi.daIncassare,
      label: "Da incassare",
    });
    metricHealth.eco_da_incassare = { status: "full" };
    metrics.push({
      id: "eco_scadute_importo",
      value: invKpi.importoScaduto,
      label: "Importo scaduto",
    });
    if (collectionRatePct != null) {
      metrics.push({
        id: "eco_tasso_incasso",
        value: collectionRatePct,
        label: "Tasso incasso",
      });
    }
  } else {
    metrics.push({ id: "eco_fatturato", value: 0, label: "Fatturato periodo" });
    metricHealth.eco_fatturato = { status: "partial" };
    metrics.push({ id: "eco_incassato", value: 0, label: "Incassato periodo" });
    metricHealth.eco_incassato = { status: "partial" };
    metrics.push({ id: "eco_da_incassare", value: 0, label: "Da incassare" });
    metricHealth.eco_da_incassare = { status: "partial" };
  }

  void ctx;

  return {
    data: {
      metrics,
      metricHealth,
      invoicesAvailable,
      signals: {
        collectionRatePct,
        overdueAmount: invKpi.importoScaduto,
        dsoDays: computeDsoDays(invoices, range),
        marginPct: null,
        topClienteSharePct: concentration?.sharePct ?? null,
        topClienteLabel: concentration?.cliente ?? null,
      },
    },
    metricIds: canonicalMetricIds(metrics.map((m) => m.id)),
  };
}

export function economicoDatasetWarnings(data: EconomicoDatasetData): string[] {
  if (data.invoicesAvailable) return [];
  return [ECO_FATTURATO_SOURCE_PENDING, ECO_DA_INCASSARE_SOURCE_PENDING];
}
