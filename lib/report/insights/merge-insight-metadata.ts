import type { ReportMetadataEnvelope } from "@/lib/report/contracts/metadata-envelope";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import { mergeTrustStatus } from "@/lib/report/contracts/merge-trust-status";
import type { InsightDto } from "@/lib/report/insights/types";

export function mergeInsightMetadata(
  childEnvelopes: ReportMetadataEnvelope[],
  insights: InsightDto[],
  opts?: { requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"] },
): ReportMetadataEnvelope {
  const insightTrusts = insights.map((i) => i.trust);
  const childTrusts = childEnvelopes.map((e) => e.trustStatus);
  const warnings = childEnvelopes.flatMap((e) => e.dataWarnings ?? []).filter(Boolean);

  return {
    contractVersion: REPORT_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    requestedPeriod: opts?.requestedPeriod,
    sourceFreshness: childEnvelopes.some((e) => e.sourceFreshness === "UNKNOWN")
      ? "UNKNOWN"
      : childEnvelopes.some((e) => e.sourceFreshness === "STALE")
        ? "STALE"
        : "LIVE",
    trustStatus: mergeTrustStatus([...childTrusts, ...insightTrusts]),
    dataWarnings: warnings.length > 0 ? [...new Set(warnings)] : undefined,
  };
}
