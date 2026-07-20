import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import {
  SOURCE_FRESHNESS_VALUES,
  TRUST_STATUSES,
  type ReportMetadataEnvelope,
} from "@/lib/report/contracts/metadata-envelope";
import type { ReportPayload } from "@/lib/report/contracts/report-payload";

function isIso8601(value: string): boolean {
  const t = Date.parse(value);
  return Number.isFinite(t);
}

export function assertValidReportMetadata(metadata: ReportMetadataEnvelope): void {
  if (!metadata || typeof metadata !== "object") {
    throw new Error("Report metadata is required");
  }
  if (metadata.contractVersion !== REPORT_CONTRACT_VERSION) {
    throw new Error(`Invalid contractVersion: expected ${REPORT_CONTRACT_VERSION}`);
  }
  if (!metadata.generatedAt || !isIso8601(metadata.generatedAt)) {
    throw new Error("metadata.generatedAt must be a valid ISO 8601 timestamp");
  }
  if (!SOURCE_FRESHNESS_VALUES.includes(metadata.sourceFreshness)) {
    throw new Error(`Invalid sourceFreshness: ${metadata.sourceFreshness}`);
  }
  if (!TRUST_STATUSES.includes(metadata.trustStatus)) {
    throw new Error(`Invalid trustStatus: ${metadata.trustStatus}`);
  }
}

export function assertValidReportPayload<T>(payload: ReportPayload<T> | null | undefined): asserts payload is ReportPayload<T> {
  if (!payload || typeof payload !== "object") {
    throw new Error("Report payload is required");
  }
  if (!("metadata" in payload)) {
    throw new Error("Report payload missing metadata");
  }
  if (!("data" in payload) || payload.data === undefined) {
    throw new Error("Report payload missing data");
  }
  assertValidReportMetadata(payload.metadata);
}
