import type { ReportMetadataEnvelope, SourceFreshness, TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import { REPORT_CONTRACT_VERSION } from "@/lib/report/contracts/contract-version";
import type { ReportDatasetContext } from "@/lib/report/datasets/context";
import type { ReportIntegrityStatus } from "@/lib/report/report-data-integrity-layer";
import type { IntegrityFinding } from "@/lib/report/report-integrity-audit";

function mapFreshness(status: ReportIntegrityStatus, findings: IntegrityFinding[]): SourceFreshness {
  if (findings.some((f) => f.code === "partial_fetch")) return "UNKNOWN";
  if (status === "ok") return "LIVE";
  if (status === "degraded") return "STALE";
  return "UNKNOWN";
}

function mapTrust(
  status: ReportIntegrityStatus,
  strictBlocked: boolean,
  extraWarnings: string[],
  findings: IntegrityFinding[],
): TrustStatus {
  if (strictBlocked || status === "blocked") return "RED";
  const hasAuditWarning = findings.some((f) => f.severity === "warning" || f.severity === "critical");
  if (status === "degraded" || extraWarnings.length > 0 || hasAuditWarning) return "AMBER";
  return "GREEN";
}

export function buildReportMetadataEnvelope(
  ctx: ReportDatasetContext,
  extraWarnings: string[] = [],
): ReportMetadataEnvelope {
  const { integrity } = ctx;
  const auditWarnings = integrity.audit.findings.map((f) => f.message);
  const dataWarnings = [...auditWarnings, ...extraWarnings].filter(Boolean);

  return {
    contractVersion: REPORT_CONTRACT_VERSION,
    generatedAt: ctx.builtAt ?? new Date().toISOString(),
    requestedPeriod: ctx.period,
    sourceFreshness: mapFreshness(integrity.status, integrity.audit.findings),
    trustStatus: mapTrust(integrity.status, integrity.audit.strictBlocked, extraWarnings, integrity.audit.findings),
    dataWarnings: dataWarnings.length > 0 ? dataWarnings : undefined,
  };
}
