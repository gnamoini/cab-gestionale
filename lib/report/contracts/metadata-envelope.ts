import type { ReportContractVersion } from "@/lib/report/contracts/contract-version";

export type TrustStatus = "GREEN" | "AMBER" | "RED";

export type SourceFreshness = "LIVE" | "STALE" | "CACHED" | "UNKNOWN";

export type ReportPeriodPreset =
  | "questo_mese"
  | "mese_scorso"
  | "questo_trimestre"
  | "anno_corrente"
  | "custom";

export type ReportCompareMode = "none" | "prev_period" | "prev_year";

export type ReportRequestedPeriod = {
  preset: ReportPeriodPreset;
  start: string;
  end: string;
  compareMode: ReportCompareMode;
};

export type ReportMetadataEnvelope = {
  contractVersion: ReportContractVersion;
  generatedAt: string;
  requestedPeriod?: ReportRequestedPeriod;
  sourceFreshness: SourceFreshness;
  trustStatus: TrustStatus;
  dataWarnings?: string[];
  calculationDurationMs?: number;
  /** Response source discriminator (e.g. narrative-v2). */
  source?: string;
  /** End-to-end tracing id (generation → consumption). */
  correlationId?: string;
};

export const TRUST_STATUSES: readonly TrustStatus[] = ["GREEN", "AMBER", "RED"];
export const SOURCE_FRESHNESS_VALUES: readonly SourceFreshness[] = [
  "LIVE",
  "STALE",
  "CACHED",
  "UNKNOWN",
];
