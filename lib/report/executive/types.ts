import type { DrillDownRef } from "@/lib/report/contracts/drill-down-contract";
import type { ReportMetadataEnvelope, TrustStatus } from "@/lib/report/contracts/metadata-envelope";

export const EXECUTIVE_CONTRACT_VERSION = "1" as const;
export const EXECUTIVE_CARD_CONTRACT_VERSION = "1" as const;

export type ExecutiveContractVersion = typeof EXECUTIVE_CONTRACT_VERSION;
export type ExecutiveCardContractVersion = typeof EXECUTIVE_CARD_CONTRACT_VERSION;

export type ExecutiveDatasetKey = "lavorazioni" | "magazzino" | "economico";

export type ExecutiveMetricDefinition = {
  metricId: string;
  dataset: ExecutiveDatasetKey;
  displayKey: string;
  drillDown: DrillDownRef;
  priority: number;
};

export type ExecutiveDatasetSlice = {
  metricId: string;
  value: unknown;
  metricHealth?: { status: "full" | "partial" | "unavailable" };
  sourceDataset: ExecutiveDatasetKey;
};

export type ExecutiveCardDto = {
  contractVersion: ExecutiveCardContractVersion;
  metricId: string;
  displayKey: string;
  label: string;
  value: number;
  formattedValue: string;
  trust: TrustStatus;
  drillDown: DrillDownRef;
  warnings?: string[];
};

export type ReportExecutiveDto = {
  contractVersion: ExecutiveContractVersion;
  cards: ExecutiveCardDto[];
  metadata: ReportMetadataEnvelope;
};

export type ExecutivePayloadData = {
  contractVersion: ExecutiveContractVersion;
  cards: ExecutiveCardDto[];
};

export type BuildReportExecutiveInput = {
  lavorazioni: import("@/lib/report/datasets/builders/lavorazioni").LavorazioniDatasetData;
  magazzino: import("@/lib/report/datasets/builders/magazzino").MagazzinoDatasetData;
  economico: import("@/lib/report/datasets/builders/economico").EconomicoDatasetData;
  childMetadata?: ReportMetadataEnvelope[];
  requestedPeriod?: ReportMetadataEnvelope["requestedPeriod"];
};
