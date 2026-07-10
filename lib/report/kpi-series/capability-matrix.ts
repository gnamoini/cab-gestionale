import {
  REPORT_METRIC_REGISTRY,
  getRegistryEntry,
} from "@/lib/report/metrics/report-metric-registry";
import type { KpiChartDisplayMode, KpiSeriesGranularity } from "@/lib/report/metrics/report-metric-types";

export type MetricSeriesCapability = {
  metricId: string;
  label: string;
  unit: string;
  day: boolean;
  week: boolean;
  month: boolean;
  indexed: boolean;
  absolute: boolean;
  dualAxis: boolean;
};

export type ChartSelectionValidation = {
  ok: boolean;
  errors: string[];
};

function capabilityFromEntry(id: string): MetricSeriesCapability | null {
  const entry = getRegistryEntry(id);
  if (!entry || entry.status !== "active" || entry.valueCapability !== "series" || !entry.series) {
    return null;
  }
  const g = new Set(entry.series.granularities);
  const m = new Set(entry.series.supportedModes);
  return {
    metricId: id,
    label: entry.label,
    unit: entry.unit,
    day: g.has("day"),
    week: g.has("week"),
    month: g.has("month"),
    indexed: m.has("indexed"),
    absolute: m.has("absolute"),
    dualAxis: m.has("dual-axis"),
  };
}

export function getPlottableMetrics(): MetricSeriesCapability[] {
  return REPORT_METRIC_REGISTRY.filter(
    (e) => e.status === "active" && e.valueCapability === "series" && e.series,
  )
    .map((e) => capabilityFromEntry(e.id)!)
    .filter(Boolean);
}

export function getMetricSeriesCapability(metricId: string): MetricSeriesCapability | null {
  return capabilityFromEntry(metricId);
}

export function metricSupportsBucket(metricId: string, bucket: KpiSeriesGranularity): boolean {
  const cap = getMetricSeriesCapability(metricId);
  if (!cap) return false;
  if (bucket === "day") return cap.day;
  if (bucket === "week") return cap.week;
  return cap.month;
}

export function validateChartSelection(
  metricIds: readonly string[],
  bucket: KpiSeriesGranularity,
  displayMode: KpiChartDisplayMode,
): ChartSelectionValidation {
  const errors: string[] = [];

  if (metricIds.length < 2) errors.push("Seleziona almeno 2 KPI.");
  if (metricIds.length > 5) errors.push("Massimo 5 KPI per grafico.");

  const caps = metricIds.map((id) => getMetricSeriesCapability(id));
  if (caps.some((c) => !c)) errors.push("Uno o più KPI non supportano serie temporali.");

  for (const id of metricIds) {
    if (!metricSupportsBucket(id, bucket)) {
      errors.push(`Il KPI ${id} non supporta il bucket ${bucket}.`);
    }
  }

  if (displayMode === "absolute" || displayMode === "dual-axis") {
    if (metricIds.length > 2) errors.push("Valori assoluti: massimo 2 KPI.");
    const units = caps.filter(Boolean).map((c) => c!.unit);
    if (new Set(units).size > 2) errors.push("Valori assoluti: massimo 2 unità distinte.");
    for (const id of metricIds) {
      const cap = getMetricSeriesCapability(id);
      if (cap && displayMode === "dual-axis" && !cap.dualAxis) {
        errors.push(`Il KPI ${id} non supporta assi separati.`);
      }
      if (cap && displayMode === "absolute" && !cap.absolute) {
        errors.push(`Il KPI ${id} non supporta valori assoluti.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
