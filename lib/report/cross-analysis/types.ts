import type { ReportMetadataEnvelope, TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import type { CanonicalMetricId } from "@/lib/report/metrics/report-metric-registry";

export const CROSS_CONTRACT_VERSION = "1" as const;
export const CROSS_NUMERIC_PRECISION = 6 as const;

export type CrossContractVersion = typeof CROSS_CONTRACT_VERSION;

export type CrossDatasetKey = "lavorazioni" | "magazzino" | "economico" | "ore";

export type CrossMetricDto = {
  metricId: CanonicalMetricId;
  displayKey: string;
  value: number;
  formattedValue: string;
  trust: TrustStatus;
  sourceDatasets: CrossDatasetKey[];
  warnings?: string[];
};

export type ReportCrossDto = {
  contractVersion: CrossContractVersion;
  metrics: CrossMetricDto[];
  metadata: ReportMetadataEnvelope;
};

export type CrossPayloadData = {
  contractVersion: CrossContractVersion;
  metrics: CrossMetricDto[];
};

export type CrossFormulaInput = {
  operational?: { completedInPeriod: number };
  warehouse?: { partsUsedQty: number; movementValue: number };
  labor?: { totalHours: number; manodoperaCost: number };
  economic?: { invoicesBilled: number };
};
