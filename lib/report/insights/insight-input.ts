import type { AnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import type { ReportCrossDto } from "@/lib/report/cross-analysis/types";
import type { ReportRequestedPeriod, TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { DatasetMetricRow } from "@/lib/report/datasets/types";

function metricValue(metrics: DatasetMetricRow[], id: string): number | undefined {
  const row = metrics.find((m) => m.id === id);
  if (!row) return undefined;
  const n = typeof row.value === "number" ? row.value : Number(row.value);
  return Number.isFinite(n) ? n : undefined;
}

export type InsightLavorazioniSignals = {
  opened: number;
  closed: number;
  open: number;
  avgCloseDays: number;
  lateSla: number;
};

export type InsightMagazzinoSignals = {
  lowStock: number;
  partsUsed: number;
  movementValue: number;
  coverageCritical: number;
  deadStock: number;
  spike: { current: number; avgPrev: number } | null;
};

export type InsightEconomicoSignals = {
  revenue: number;
  receivables: number;
  quotes: number;
  collected: number;
  collectionRatePct: number | null;
  overdueAmount: number;
  dsoDays: number | null;
  marginPct: number | null;
  topClienteSharePct: number | null;
  topClienteLabel: string | null;
  invoicesAvailable: boolean;
  partialTrust: boolean;
};

export type InsightOreSignals = {
  totalHours: number;
  maintenanceCost: number;
};

export type InsightCrossSignal = {
  value: number;
  trust: TrustStatus;
};

export type InsightSignals = {
  lavorazioni: InsightLavorazioniSignals | null;
  magazzino: InsightMagazzinoSignals | null;
  economico: InsightEconomicoSignals | null;
  ore: InsightOreSignals | null;
  cross: Map<string, InsightCrossSignal>;
  crossCompare?: Map<string, InsightCrossSignal>;
};

export type ComplianceInsightCounts = {
  overdue: number;
  due30d: number;
};

export type InsightEngineInput = {
  bundle: AnalyticsDatasetBundle;
  cross: ReportCrossDto;
  crossCompare?: ReportCrossDto | null;
  requestedPeriod?: ReportRequestedPeriod;
  complianceCounts?: ComplianceInsightCounts;
};

export type InsightRuleContext = InsightEngineInput & {
  signals: InsightSignals;
};

export function buildInsightSignals(
  bundle: AnalyticsDatasetBundle,
  cross: ReportCrossDto,
  options?: {
    complianceCounts?: ComplianceInsightCounts;
    crossCompare?: ReportCrossDto | null;
  },
): InsightSignals {
  const lav = bundle.datasets.lavorazioni.metrics;
  const mag = bundle.datasets.magazzino.metrics;
  const eco = bundle.datasets.economico;
  const ore = bundle.datasets.ore.metrics;

  const lavorazioni: InsightLavorazioniSignals | null =
    lav.length > 0
      ? {
          opened: metricValue(lav, "lav-periodo") ?? 0,
          closed: metricValue(lav, "lav-chiusi") ?? 0,
          open: metricValue(lav, "lav-aperti") ?? 0,
          avgCloseDays: metricValue(lav, "lav-tempo") ?? 0,
          lateSla: metricValue(lav, "lav_late_sla") ?? 0,
        }
      : null;

  const magazzino: InsightMagazzinoSignals | null =
    mag.length > 0
      ? {
          lowStock: metricValue(mag, "scorta") ?? 0,
          partsUsed: metricValue(mag, "ric-usati") ?? 0,
          movementValue: metricValue(mag, "mag_movement_value") ?? 0,
          coverageCritical: 0,
          deadStock: 0,
          spike: null,
        }
      : null;

  const economico: InsightEconomicoSignals | null =
    eco.metrics.length > 0
      ? {
          revenue: metricValue(eco.metrics, "eco_fatturato") ?? 0,
          receivables: metricValue(eco.metrics, "eco_da_incassare") ?? 0,
          quotes: metricValue(eco.metrics, "eco_preventivi") ?? 0,
          collected: metricValue(eco.metrics, "eco_incassato") ?? 0,
          collectionRatePct: eco.signals?.collectionRatePct ?? metricValue(eco.metrics, "eco_tasso_incasso") ?? null,
          overdueAmount: eco.signals?.overdueAmount ?? metricValue(eco.metrics, "eco_scadute_importo") ?? 0,
          dsoDays: eco.signals?.dsoDays ?? null,
          marginPct: eco.signals?.marginPct ?? null,
          topClienteSharePct: eco.signals?.topClienteSharePct ?? null,
          topClienteLabel: eco.signals?.topClienteLabel ?? null,
          invoicesAvailable: eco.invoicesAvailable,
          partialTrust: !eco.invoicesAvailable || eco.metricHealth?.eco_fatturato?.status === "partial",
        }
      : null;

  const oreSignals: InsightOreSignals | null =
    ore.length > 0
      ? {
          totalHours: metricValue(ore, "ore_total") ?? 0,
          maintenanceCost: metricValue(ore, "cost-tot") ?? 0,
        }
      : null;

  const crossMap = new Map<string, InsightCrossSignal>();
  for (const m of cross.metrics) {
    crossMap.set(m.metricId, { value: m.value, trust: m.trust });
  }
  if (options?.complianceCounts) {
    crossMap.set("compliance_overdue", { value: options.complianceCounts.overdue, trust: "GREEN" });
    crossMap.set("compliance_due_30d", { value: options.complianceCounts.due30d, trust: "GREEN" });
  }

  const crossCompareMap = new Map<string, InsightCrossSignal>();
  for (const m of options?.crossCompare?.metrics ?? []) {
    crossCompareMap.set(m.metricId, { value: m.value, trust: m.trust });
  }

  return {
    lavorazioni,
    magazzino,
    economico,
    ore: oreSignals,
    cross: crossMap,
    crossCompare: crossCompareMap.size > 0 ? crossCompareMap : undefined,
  };
}

export function buildInsightRuleContext(input: InsightEngineInput): InsightRuleContext {
  return {
    ...input,
    signals: buildInsightSignals(input.bundle, input.cross, {
      complianceCounts: input.complianceCounts,
      crossCompare: input.crossCompare,
    }),
  };
}
