import type { ReportMetadataEnvelope, TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import { mergeTrustStatus } from "@/lib/report/contracts/merge-trust-status";
import type { ExecutiveDatasetSlice } from "@/lib/report/executive/types";

export { mergeTrustStatus } from "@/lib/report/contracts/merge-trust-status";

export function trustFromSlice(slice: ExecutiveDatasetSlice): TrustStatus {
  if (slice.metricHealth?.status === "partial" || slice.metricHealth?.status === "unavailable") {
    return "AMBER";
  }
  return "GREEN";
}

export function mergeExecutiveMetadata(
  childEnvelopes: ReportMetadataEnvelope[],
  slices: ExecutiveDatasetSlice[],
  opts?: { requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"] },
): ReportMetadataEnvelope {
  const sliceTrusts = slices.map(trustFromSlice);
  const childTrusts = childEnvelopes.map((e) => e.trustStatus);
  const warnings = [
    ...childEnvelopes.flatMap((e) => e.dataWarnings ?? []),
  ].filter(Boolean);

  return {
    contractVersion: REPORT_CONTRACT_VERSION,
    generatedAt: new Date().toISOString(),
    requestedPeriod: opts?.requestedPeriod,
    sourceFreshness: childEnvelopes.some((e) => e.sourceFreshness === "UNKNOWN")
      ? "UNKNOWN"
      : childEnvelopes.some((e) => e.sourceFreshness === "STALE")
        ? "STALE"
        : "LIVE",
    trustStatus: mergeTrustStatus([...childTrusts, ...sliceTrusts]),
    dataWarnings: warnings.length > 0 ? [...new Set(warnings)] : undefined,
  };
}
