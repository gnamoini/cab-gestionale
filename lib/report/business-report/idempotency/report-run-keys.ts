import type { ReportCompareMode } from "@/lib/report/date-ranges";
import type { BusinessReportType } from "@/lib/report/business-report/types";
import {
  BUSINESS_REPORT_ENGINE_VERSION,
  BUSINESS_REPORT_SCHEMA_VERSION,
} from "@/lib/report/business-report/versions";

export type LogicalReportKeyInput = {
  reportType: BusinessReportType;
  periodStart: string;
  periodEnd: string;
  compareMode: ReportCompareMode;
  engineVersion?: string;
  schemaVersion?: string;
};

export function buildLogicalReportKey(input: LogicalReportKeyInput): string {
  const engineVersion = input.engineVersion ?? BUSINESS_REPORT_ENGINE_VERSION;
  const schemaVersion = input.schemaVersion ?? BUSINESS_REPORT_SCHEMA_VERSION;
  return [
    input.reportType,
    input.periodStart,
    input.periodEnd,
    input.compareMode,
    engineVersion,
    schemaVersion,
  ].join(":");
}

export type IdempotencyKeyInput = LogicalReportKeyInput & {
  generationVersion: number;
};

/** Per-run attempt identity — includes generationVersion for row uniqueness. */
export function buildIdempotencyKey(input: IdempotencyKeyInput): string {
  return `${buildLogicalReportKey(input)}:v${input.generationVersion}`;
}

export function buildNextGenerationVersion(currentMax: number | null | undefined): number {
  return Math.max(1, (currentMax ?? 0) + 1);
}
