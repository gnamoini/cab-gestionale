import type { ReportMetadataEnvelope } from "@/lib/report/contracts/metadata-envelope";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import type { ReportAnalyticsResult } from "@/lib/report/analytics-engine/types";
import type { ReportAnalyticsSourceBundle } from "@/lib/report/analytics-engine/source-bundle";

export function buildAnalyticsMetadataEnvelope(input: {
  bundle: ReportAnalyticsSourceBundle;
  result: ReportAnalyticsResult;
}): ReportMetadataEnvelope {
  const { bundle, result } = input;
  const trustStatus =
    result.trustSummary.notAvailable > 0
      ? "RED"
      : result.trustSummary.partial > 0 || result.trustSummary.estimated > 0
        ? "AMBER"
        : "GREEN";

  return {
    contractVersion: REPORT_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    requestedPeriod: bundle.period,
    sourceFreshness: bundle.integrity.status === "ok" ? "LIVE" : "STALE",
    trustStatus,
  };
}
