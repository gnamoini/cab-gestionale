import "server-only";

import { resolveCanonicalMetricId } from "@/lib/report/metrics/resolve-metric-id";
import { getRegistryEntry } from "@/lib/report/metrics/report-metric-registry";
import { getEngineManifestEntry } from "@/lib/report/analytics-engine/engine-metric-manifest";
import {
  getDrilldownMetricEntry,
  type DrilldownMetricRegistryEntry,
} from "@/lib/report/drilldown/drilldown-metric-registry";
import type { ReportDrillDownRequest } from "@/lib/report/drilldown/types";
import { DEFAULT_DRILLDOWN_PAGE_SIZE } from "@/lib/report/drilldown/types";

export class DrilldownValidationError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "DrilldownValidationError";
  }
}

export type ValidatedDrilldownRequest = ReportDrillDownRequest & {
  metricId: string;
  registry: DrilldownMetricRegistryEntry;
  pageSize: number;
};

function assertPeriod(period: ReportDrillDownRequest["period"]): void {
  if (!period?.start?.trim() || !period?.end?.trim()) {
    throw new DrilldownValidationError("Periodo start/end obbligatorio");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(period.start) || !/^\d{4}-\d{2}-\d{2}$/.test(period.end)) {
    throw new DrilldownValidationError("Periodo non valido");
  }
}

export function validateDrilldownRequest(input: ReportDrillDownRequest): ValidatedDrilldownRequest {
  assertPeriod(input.period);
  const metricId = resolveCanonicalMetricId(input.metricId?.trim() ?? "");
  if (!metricId) throw new DrilldownValidationError("metricId obbligatorio");

  const registryEntry = getRegistryEntry(metricId);
  if (!registryEntry) throw new DrilldownValidationError(`Metrica non registrata: ${metricId}`);

  const manifest = getEngineManifestEntry(metricId);
  if (!manifest) throw new DrilldownValidationError(`Metrica non supportata dal engine: ${metricId}`);

  const drillEntry = getDrilldownMetricEntry(metricId);
  if (!drillEntry) throw new DrilldownValidationError(`Drill-down non supportato: ${metricId}`);

  if (input.dimension && !drillEntry.supportedDimensions.includes(input.dimension)) {
    throw new DrilldownValidationError(`Dimensione non supportata: ${input.dimension}`);
  }

  if (input.filters) {
    for (const key of Object.keys(input.filters)) {
      if (!drillEntry.supportedFilters.includes(key) && key !== "targetTab") {
        throw new DrilldownValidationError(`Filtro non supportato: ${key}`);
      }
    }
  }

  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? DEFAULT_DRILLDOWN_PAGE_SIZE));

  return {
    ...input,
    metricId,
    registry: drillEntry,
    pageSize,
  };
}

export function parseDrilldownRequestFromSearchParams(
  searchParams: URLSearchParams,
  period: ReportDrillDownRequest["period"],
): ReportDrillDownRequest {
  const metricId = searchParams.get("metricId")?.trim() ?? "";
  const dimension = searchParams.get("dimension")?.trim() as ReportDrillDownRequest["dimension"];
  const dimensionValue = searchParams.get("dimensionValue")?.trim();
  const pageSizeRaw = searchParams.get("pageSize");
  const cursorRaw = searchParams.get("cursor");
  let cursor = null;
  if (cursorRaw) {
    try {
      cursor = JSON.parse(cursorRaw) as ReportDrillDownRequest["cursor"];
    } catch {
      throw new DrilldownValidationError("cursor non valido");
    }
  }
  return {
    metricId,
    period,
    compareMode: period.compareMode,
    dimension: dimension || undefined,
    dimensionValue: dimensionValue || undefined,
    pageSize: pageSizeRaw ? Number(pageSizeRaw) : undefined,
    cursor,
  };
}
