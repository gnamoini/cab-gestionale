import type { ReportMetadataEnvelope, TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import { mergeTrustStatus } from "@/lib/report/contracts/merge-trust-status";
import type { CrossMetricDto } from "@/lib/report/cross-analysis/types";
import type { EconomicoDatasetData } from "@/lib/report/datasets/builders/economico";

export function trustFromEconomico(data: EconomicoDatasetData): TrustStatus {
  const health = data.metricHealth ?? {};
  const partial = Object.values(health).some(
    (h) => h?.status === "partial" || h?.status === "unavailable",
  );
  return partial ? "AMBER" : "GREEN";
}

export function mergeCrossMetadata(
  childEnvelopes: ReportMetadataEnvelope[],
  metrics: CrossMetricDto[],
  opts?: { requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"] },
): ReportMetadataEnvelope {
  const metricTrusts = metrics.map((m) => m.trust);
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
    trustStatus: mergeTrustStatus([...childTrusts, ...metricTrusts]),
    dataWarnings: warnings.length > 0 ? [...new Set(warnings)] : undefined,
  };
}
