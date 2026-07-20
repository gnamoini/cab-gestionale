import "server-only";

import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildAnalyticsDatasetBundle } from "@/lib/report/analytics/analytics-dataset-bundle";
import {
  enrichSlicesForDataset,
  loadBaseSlices,
} from "@/lib/report/datasets/api/report-dataset-api";
import { buildReportCrossDto } from "@/lib/report/cross-analysis/build-report-cross-dto";
import type { ReportCrossDto } from "@/lib/report/cross-analysis/types";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import { resolveDatasetDateRanges } from "@/lib/report/datasets/period";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function loadCrossDtoForPeriod(period: ReportRequestedPeriod): Promise<ReportCrossDto> {
  const baseSlices = await loadBaseSlices(period);
  const economicoSlices = await enrichSlicesForDataset("economico", baseSlices);
  const oreSlices = await enrichSlicesForDataset("ore", baseSlices);

  const lavCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: baseSlices.integrity,
  });
  const magCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: baseSlices.integrity,
  });
  const ecoCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: economicoSlices.integrity,
  });
  const oreCtx = createReportDatasetContext({
    period,
    compareMode: period.compareMode,
    integrity: oreSlices.integrity,
  });

  const bundle = buildAnalyticsDatasetBundle({
    lavorazioniCtx: lavCtx,
    magazzinoCtx: magCtx,
    economicoCtx: ecoCtx,
    oreCtx,
    baseSlices,
    economicoSlices,
    oreSlices,
  });

  return buildReportCrossDto({ bundle, requestedPeriod: period });
}

/** Cross DTO per il periodo di confronto (compareMode forzato a none). */
export async function loadCrossDtoForComparePeriod(
  period: ReportRequestedPeriod,
): Promise<ReportCrossDto | null> {
  const { compareRange } = resolveDatasetDateRanges({ period });
  if (!compareRange || period.compareMode === "none") return null;
  return loadCrossDtoForPeriod({
    ...period,
    preset: "custom",
    start: ymd(compareRange.start),
    end: ymd(compareRange.end),
    compareMode: "none",
  });
}
