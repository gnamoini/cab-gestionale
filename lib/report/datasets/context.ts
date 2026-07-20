import type { ReportCompareMode, ReportRequestedPeriod } from "@/lib/report/contracts/metadata-envelope";
import type { ReportIntegrityResult } from "@/lib/report/report-data-integrity-layer";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";

export type ReportDatasetRequester = {
  userId?: string;
  role?: string;
};

export type ReportDatasetContext = {
  contractVersion: typeof REPORT_CONTRACT_VERSION;
  period: ReportRequestedPeriod;
  compareMode: ReportCompareMode;
  integrity: ReportIntegrityResult;
  requester?: ReportDatasetRequester;
  builtAt?: string;
};

export function createReportDatasetContext(input: {
  period: ReportRequestedPeriod;
  compareMode: ReportCompareMode;
  integrity: ReportIntegrityResult;
  requester?: ReportDatasetRequester;
  builtAt?: string;
}): ReportDatasetContext {
  return {
    contractVersion: REPORT_CONTRACT_VERSION,
    period: input.period,
    compareMode: input.compareMode,
    integrity: input.integrity,
    requester: input.requester,
    builtAt: input.builtAt,
  };
}
