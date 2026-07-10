import type { ReportPeriodPreset } from "@/lib/report/date-ranges";
import type { NormalizationConfig } from "@/lib/report/kpi-series/normalize";
import { isReportPeriodPreset } from "@/lib/report/report-period-presets";
import type { KpiChartConfigBody } from "@/lib/report/kpi-chart-config/contracts";

export const MAX_KPI_CHART_METRICS = 5;
export const MAX_SAVED_KPI_CHARTS_PER_USER = 30;
export const MAX_KPI_CHART_NAME_LEN = 120;

export function assertCanAddSavedCharts(currentCount: number, adding: number): string | null {
  if (currentCount + adding > MAX_SAVED_KPI_CHARTS_PER_USER) {
    return `Massimo ${MAX_SAVED_KPI_CHARTS_PER_USER} grafici salvati per utente.`;
  }
  return null;
}

function isValidYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseNormalization(raw: unknown): NormalizationConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const mode = o.mode === "indexed" || o.mode === "absolute" ? o.mode : null;
  const baseline =
    o.baseline === "first-visible-point" || o.baseline === "first-period" ? o.baseline : null;
  const missing = o.missing === "ignore" || o.missing === "zero" ? o.missing : null;
  if (!mode || !baseline || !missing) return null;
  return { mode, baseline, missing };
}

export function normalizeChartName(name: string): string {
  return name.trim().slice(0, MAX_KPI_CHART_NAME_LEN);
}

export function validateChartName(name: string): string | null {
  const n = normalizeChartName(name);
  if (!n) return "Nome obbligatorio.";
  return null;
}

export function parseKpiChartConfigBody(raw: unknown): KpiChartConfigBody | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.metricIds) || !o.metricIds.every((x) => typeof x === "string")) return null;
  if (o.metricIds.length > MAX_KPI_CHART_METRICS) return null;
  const preset = o.preset;
  if (typeof preset !== "string" || !isReportPeriodPreset(preset)) return null;
  const normalization = parseNormalization(o.normalization);
  if (!normalization) return null;
  const displayMode = o.displayMode === "indexed" || o.displayMode === "absolute" ? o.displayMode : null;
  if (!displayMode) return null;
  return {
    metricIds: o.metricIds,
    preset: preset as ReportPeriodPreset,
    customFrom: isValidYmd(o.customFrom) ? o.customFrom : "",
    customTo: isValidYmd(o.customTo) ? o.customTo : "",
    displayMode,
    normalization,
  };
}

export function serializeKpiChartConfigBody(body: KpiChartConfigBody): KpiChartConfigBody {
  return {
    metricIds: [...body.metricIds],
    preset: body.preset,
    customFrom: body.customFrom,
    customTo: body.customTo,
    displayMode: body.displayMode,
    normalization: { ...body.normalization },
  };
}
