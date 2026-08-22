import type { ReportCompareMode } from "@/lib/report/contracts/metadata-envelope";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import { buildReportRangeKey } from "@/lib/report/report-domain-types";
import type { ReportAnalyticsGranularity, ReportAnalyticsQuery } from "@/lib/report/analytics-engine/types";
import { validateAnalyticsMetricIds } from "@/lib/report/analytics-engine/validate-metric-ids";

function parseMetricIdsParam(raw: string | null): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseDimensionsParam(raw: string | null): ReportAnalyticsQuery["dimensions"] {
  if (!raw?.trim()) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean) as ReportAnalyticsQuery["dimensions"];
}

function parseCompareMode(raw: string | null): ReportCompareMode {
  if (raw === "prev_period" || raw === "prev_year") return raw;
  return "none";
}

export function parseAnalyticsQueryFromSearchParams(
  searchParams: URLSearchParams,
): ReportAnalyticsQuery {
  const preset = (searchParams.get("preset") ?? "questo_mese") as ReportRequestedPeriod["preset"];
  const compareMode = parseCompareMode(searchParams.get("compareMode"));
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const granularity = (searchParams.get("granularity") ?? undefined) as ReportAnalyticsGranularity | undefined;
  const includeSeries = searchParams.get("includeSeries") === "true";

  const period: ReportRequestedPeriod = {
    preset,
    start: fromParam ?? "",
    end: toParam ?? "",
    compareMode,
  };

  const metricIds = validateAnalyticsMetricIds(parseMetricIdsParam(searchParams.get("metrics")));

  return {
    period,
    metricIds,
    compareMode,
    granularity,
    dimensions: parseDimensionsParam(searchParams.get("dimensions")),
    includeSeries,
  };
}

import type { ReportCompareMode as MetadataCompareMode } from "@/lib/report/contracts/metadata-envelope";

function toMetadataCompareMode(mode: import("@/lib/report/date-ranges").ReportCompareMode): MetadataCompareMode {
  if (mode === "prev_period" || mode === "prev_year") return mode;
  return "none";
}

export function resolveAnalyticsPeriod(query: ReportAnalyticsQuery) {
  const anchor = new Date();
  const { range, compareRange, compareMode } = resolveDatasetDateRanges({
    anchor,
    period: query.period,
  });
  const rangeKey = buildReportRangeKey(range, compareRange);
  const normalizedCompare = toMetadataCompareMode(query.compareMode ?? compareMode);
  return {
    period: query.period,
    range,
    compareRange,
    compareMode: normalizedCompare,
    rangeKey,
  };
}
