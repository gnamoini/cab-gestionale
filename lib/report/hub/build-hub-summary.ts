import { deltaPct } from "@/lib/report/date-ranges";
import type { ReportMetricEnvelope } from "@/lib/report/metrics/report-metric-envelope";
import type { ReportMetricCompareState } from "@/lib/report/metrics/report-metric-types";
import {
  formatReportMetricValue,
  unitToReportFormatter,
} from "@/lib/report/metrics/report-value-formatter";
import type { ReportMetricUnit } from "@/lib/report/metrics/report-metric-types";

/** Metrics fetched for the /report hub strip — existing analytics engine calculators. */
export const HUB_SUMMARY_METRIC_IDS = [
  "eco_incassato",
  "eco_fatturato",
  "cost-tot",
  "lav-periodo",
  "clienti",
] as const;

export type HubSummaryKpiId =
  | "incassi"
  | "fatturato"
  | "costi"
  | "margine"
  | "margine_pct"
  | "lavorazioni"
  | "clienti";

export type HubSummaryKpi = {
  id: HubSummaryKpiId;
  label: string;
  formatted: string;
  value: number | null;
  deltaPercent: number | null;
  invertTrend: boolean;
};

const INVOICE_METRIC_IDS = new Set(["eco_incassato", "eco_fatturato"]);

function comparePrevious(compare: ReportMetricCompareState | null): number | null {
  if (compare == null || compare.status !== "available") return null;
  return Number.isFinite(compare.previousValue) ? compare.previousValue : null;
}

/** Measured scalar, or null when the engine did not actually observe the value. */
export function hubMeasuredScalar(envelope: ReportMetricEnvelope | undefined): number | null {
  if (!envelope) return null;
  if (envelope.trust === "not_available") return null;
  if (INVOICE_METRIC_IDS.has(envelope.metricId) && envelope.trust === "partial") return null;
  const v = envelope.metric.value;
  return Number.isFinite(v) ? v : null;
}

function hubPreviousScalar(envelope: ReportMetricEnvelope | undefined): number | null {
  if (!envelope) return null;
  if (hubMeasuredScalar(envelope) == null) return null;
  return comparePrevious(envelope.metric.compare);
}

function formatOrDash(value: number | null, unit: ReportMetricUnit): string {
  if (value == null) return "—";
  return formatReportMetricValue(value, unitToReportFormatter(unit));
}

function kpi(
  id: HubSummaryKpiId,
  label: string,
  value: number | null,
  previous: number | null,
  unit: ReportMetricUnit,
  invertTrend = false,
): HubSummaryKpi {
  return {
    id,
    label,
    formatted: formatOrDash(value, unit),
    value,
    deltaPercent: value != null && previous != null ? deltaPct(value, previous) : null,
    invertTrend,
  };
}

export function buildHubSummary(envelopesById: ReadonlyMap<string, ReportMetricEnvelope>): HubSummaryKpi[] {
  const incassiEnv = envelopesById.get("eco_incassato");
  const fatturatoEnv = envelopesById.get("eco_fatturato");
  const costiEnv = envelopesById.get("cost-tot");
  const lavEnv = envelopesById.get("lav-periodo");
  const clientiEnv = envelopesById.get("clienti");

  const incassi = hubMeasuredScalar(incassiEnv);
  const fatturato = hubMeasuredScalar(fatturatoEnv);
  const costi = hubMeasuredScalar(costiEnv);
  const lavorazioni = hubMeasuredScalar(lavEnv);
  const clienti = hubMeasuredScalar(clientiEnv);

  const incassiPrev = hubPreviousScalar(incassiEnv);
  const fatturatoPrev = hubPreviousScalar(fatturatoEnv);
  const costiPrev = hubPreviousScalar(costiEnv);
  const lavPrev = hubPreviousScalar(lavEnv);
  const clientiPrev = hubPreviousScalar(clientiEnv);

  const margine = incassi != null && costi != null ? Math.round((incassi - costi) * 100) / 100 : null;
  const marginePrev = incassiPrev != null && costiPrev != null ? Math.round((incassiPrev - costiPrev) * 100) / 100 : null;
  const marginePct =
    incassi != null && incassi !== 0 && margine != null ? Math.round((margine / incassi) * 1000) / 10 : null;
  const marginePctPrev =
    incassiPrev != null && incassiPrev !== 0 && marginePrev != null
      ? Math.round((marginePrev / incassiPrev) * 1000) / 10
      : null;

  return [
    kpi("incassi", "Incassi totali", incassi, incassiPrev, "currency"),
    kpi("fatturato", "Fatturato", fatturato, fatturatoPrev, "currency"),
    kpi("costi", "Costi totali", costi, costiPrev, "currency", true),
    kpi("margine", "Margine", margine, marginePrev, "currency"),
    kpi("margine_pct", "Margine %", marginePct, marginePctPrev, "percentage"),
    kpi("lavorazioni", "N. lavorazioni", lavorazioni, lavPrev, "count"),
    kpi("clienti", "N. clienti", clienti, clientiPrev, "count"),
  ];
}
