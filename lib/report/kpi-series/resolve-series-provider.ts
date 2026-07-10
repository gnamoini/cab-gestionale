import type { KpiSeriesProviderId } from "@/lib/report/metrics/report-metric-types";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { economiciSeriesProvider } from "@/lib/report/kpi-series/providers/economici";
import { lavorazioniSeriesProvider } from "@/lib/report/kpi-series/providers/lavorazioni";
import { magazzinoSeriesProvider } from "@/lib/report/kpi-series/providers/magazzino";
import { oreSeriesProvider } from "@/lib/report/kpi-series/providers/ore";
import type { KpiSeriesProvider } from "@/lib/report/kpi-series/providers/types";

const PROVIDERS: Record<KpiSeriesProviderId, KpiSeriesProvider> = {
  lavorazioni: lavorazioniSeriesProvider,
  economici: economiciSeriesProvider,
  magazzino: magazzinoSeriesProvider,
  ore: oreSeriesProvider,
};

export function resolveSeriesProvider(metricId: string): KpiSeriesProvider | null {
  const entry = getRegistryEntry(metricId);
  if (!entry?.series) return null;
  return PROVIDERS[entry.series.provider] ?? null;
}

export function resolveSeriesProviderId(metricId: string): KpiSeriesProviderId | null {
  const entry = getRegistryEntry(metricId);
  return entry?.series?.provider ?? null;
}
