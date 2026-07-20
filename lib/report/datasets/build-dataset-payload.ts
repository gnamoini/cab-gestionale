import { createReportDatasetContext } from "@/lib/report/datasets/context";
import { buildLavorazioniDataset } from "@/lib/report/datasets/builders/lavorazioni";
import { buildMagazzinoDataset } from "@/lib/report/datasets/builders/magazzino";
import {
  buildEconomicoDataset,
  economicoDatasetWarnings,
} from "@/lib/report/datasets/builders/economico";
import { buildOreDataset } from "@/lib/report/datasets/builders/ore";
import { buildClientiDataset } from "@/lib/report/datasets/builders/clienti";
import type { ReportDatasetSlices } from "@/lib/report/datasets/builders/shared";
import { getDatasetAccessPolicy, type ReportDatasetId } from "@/lib/report/datasets/registry";
import { wrapReportPayload } from "@/lib/report/datasets/types";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import type { ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";

export type DatasetBuilderFn<T> = (
  ctx: ReturnType<typeof createReportDatasetContext>,
  slices: ReportDatasetSlices,
) => { data: T; metricIds: string[] };

const BUILDERS: Record<
  ReportDatasetId,
  (slices: ReportDatasetSlices, period: ReportRequestedPeriod, opts?: { includeRanking?: boolean }) => ReportPayload<unknown>
> = {
  lavorazioni: (slices, period) => {
    const ctx = createReportDatasetContext({
      period,
      compareMode: period.compareMode,
      integrity: slices.integrity,
    });
    const t0 = Date.now();
    const result = buildLavorazioniDataset(ctx, slices);
    return wrapReportPayload(ctx, result, { calculationDurationMs: Date.now() - t0 });
  },
  magazzino: (slices, period) => {
    const ctx = createReportDatasetContext({
      period,
      compareMode: period.compareMode,
      integrity: slices.integrity,
    });
    const t0 = Date.now();
    const result = buildMagazzinoDataset(ctx, slices);
    return wrapReportPayload(ctx, result, { calculationDurationMs: Date.now() - t0 });
  },
  economico: (slices, period) => {
    const ctx = createReportDatasetContext({
      period,
      compareMode: period.compareMode,
      integrity: slices.integrity,
    });
    const t0 = Date.now();
    const result = buildEconomicoDataset(ctx, slices);
    const warnings = economicoDatasetWarnings(result.data);
    return wrapReportPayload(ctx, result, {
      dataWarnings: warnings,
      calculationDurationMs: Date.now() - t0,
    });
  },
  ore: (slices, period) => {
    const ctx = createReportDatasetContext({
      period,
      compareMode: period.compareMode,
      integrity: slices.integrity,
    });
    const t0 = Date.now();
    const result = buildOreDataset(ctx, slices);
    return wrapReportPayload(ctx, result, { calculationDurationMs: Date.now() - t0 });
  },
  clienti: (slices, period, opts) => {
    const ctx = createReportDatasetContext({
      period,
      compareMode: period.compareMode,
      integrity: slices.integrity,
    });
    const t0 = Date.now();
    const result = buildClientiDataset(ctx, slices, { includeRanking: opts?.includeRanking });
    return wrapReportPayload(ctx, result, { calculationDurationMs: Date.now() - t0 });
  },
};

export function buildDatasetPayload(
  datasetId: ReportDatasetId,
  slices: ReportDatasetSlices,
  period: ReportRequestedPeriod,
  opts?: { includeRanking?: boolean },
): ReportPayload<unknown> {
  return BUILDERS[datasetId](slices, period, opts);
}

export function getDatasetPolicy(datasetId: ReportDatasetId) {
  return getDatasetAccessPolicy(datasetId);
}
