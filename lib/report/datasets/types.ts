import type { ReportPayload } from "@/lib/report/contracts/report-payload";
import { assertValidReportPayload } from "@/lib/report/contracts/validate-envelope";
import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import { buildReportMetadataEnvelope } from "@/lib/report/datasets/metadata/build-report-metadata-envelope";

export type DatasetMetricHealthStatus = "full" | "partial" | "unavailable";

export type DatasetMetricHealth = Record<string, { status: DatasetMetricHealthStatus }>;

export type DatasetMetricRow = {
  id: string;
  value: number;
  label?: string;
};

export type DatasetBuildResult<T> = {
  data: T;
  metricIds: string[];
};

export type WrapReportPayloadOptions = {
  dataWarnings?: string[];
  calculationDurationMs?: number;
};

export function wrapReportPayload<T>(
  ctx: ReportDatasetContext,
  result: DatasetBuildResult<T>,
  opts?: WrapReportPayloadOptions,
): ReportPayload<T> {
  const payload: ReportPayload<T> = {
    metadata: buildReportMetadataEnvelope(ctx, opts?.dataWarnings),
    data: result.data,
  };
  if (opts?.calculationDurationMs != null) {
    payload.metadata.calculationDurationMs = opts.calculationDurationMs;
  }
  assertValidReportPayload(payload);
  return payload;
}
