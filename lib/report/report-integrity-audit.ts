import { cabDevWarn } from "@/src/lib/observability/dev-warn";
import type { ReportTruthDataset } from "@/lib/report/report-truth-dataset";

export type IntegrityFindingCode =
  | "orphan_ricambio"
  | "orphan_lavorazione"
  | "orphan_mezzo"
  | "cache_drift"
  | "partial_fetch"
  | "bundle_incoherent"
  | "query_error";

export type IntegrityFindingSeverity = "info" | "warning" | "critical";

export type IntegrityFinding = {
  code: IntegrityFindingCode;
  severity: IntegrityFindingSeverity;
  count?: number;
  message: string;
};

export type ReportIntegrityAuditReport = {
  findings: IntegrityFinding[];
  strictBlocked: boolean;
};

/** Meta query passata dal hook (subset usato dall'audit). */
export type ReportIntegrityQueryMetaSlice = {
  source: string;
  isError: boolean;
  isFetching: boolean;
  rowCount?: number;
};

export type ReportIntegrityAuditOptions = {
  queryMeta?: readonly ReportIntegrityQueryMetaSlice[];
  extraFindings?: IntegrityFinding[];
  /** Override strict (default: env NEXT_PUBLIC_REPORT_INTEGRITY_STRICT === "1"). */
  strict?: boolean;
};

const AUDIT_SCOPE = "report.integrity.audit";

export function isReportIntegrityStrictMode(): boolean {
  return process.env.NEXT_PUBLIC_REPORT_INTEGRITY_STRICT === "1";
}

function crossRefOrphanMagLog(dataset: ReportTruthDataset): number {
  let orphan = 0;
  for (const e of dataset.magLog) {
    if (!dataset.validRicambioIds.has(e.ricambioId)) orphan += 1;
  }
  return orphan;
}

function bundleIncoherent(dataset: ReportTruthDataset): boolean {
  const lavCount = dataset.attive.length + dataset.storico.length;
  if (lavCount === 0) return false;
  const archivedInSource = dataset.storico.length + dataset.completate.length;
  return dataset.completate.length > 0 && archivedInSource === 0 && lavCount > 5;
}

function findingsFromQueryMeta(queryMeta: readonly ReportIntegrityQueryMetaSlice[]): IntegrityFinding[] {
  const findings: IntegrityFinding[] = [];
  for (const q of queryMeta) {
    if (q.isError) {
      findings.push({
        code: "query_error",
        severity: "warning",
        message: `Query ${q.source} in errore`,
      });
    }
    if (q.isFetching && (q.rowCount ?? 0) > 0) {
      findings.push({
        code: "partial_fetch",
        severity: "warning",
        message: `Refetch in corso su ${q.source} con dati già in cache`,
      });
    }
  }
  return findings;
}

/** Audit strutturato post-validazione dataset report. */
export function runReportIntegrityAudit(
  dataset: ReportTruthDataset,
  opts?: ReportIntegrityAuditOptions,
): ReportIntegrityAuditReport {
  const findings: IntegrityFinding[] = [];

  const orphanMag = crossRefOrphanMagLog(dataset);
  if (orphanMag > 0) {
    findings.push({
      code: "orphan_ricambio",
      severity: "critical",
      count: orphanMag,
      message: "magLog contiene ricambioId non presente in magazzino",
    });
  }

  if (dataset.lavorazioniExcludedCount > 0) {
    findings.push({
      code: "orphan_mezzo",
      severity: "info",
      count: dataset.lavorazioniExcludedCount,
      message: "Lavorazioni escluse (eliminate o mezzo orfano)",
    });
  }

  if (dataset.movimentiExcludedCount > 0) {
    findings.push({
      code: "orphan_lavorazione",
      severity: "info",
      count: dataset.movimentiExcludedCount,
      message: "Movimenti esclusi (ricambio/lavorazione orfana)",
    });
  }

  if (bundleIncoherent(dataset)) {
    findings.push({
      code: "bundle_incoherent",
      severity: "warning",
      message: "Bundle lavorazioni: completate presenti ma storico vuoto con molte righe",
    });
  }

  if (opts?.queryMeta?.length) {
    findings.push(...findingsFromQueryMeta(opts.queryMeta));
  }

  if (opts?.extraFindings?.length) {
    findings.push(...opts.extraFindings);
  }

  const strict = opts?.strict ?? isReportIntegrityStrictMode();
  const strictBlocked = strict && findings.some((f) => f.severity === "critical");

  return { findings, strictBlocked };
}

/** Emissione warn DEV (non blocca produzione). */
export function emitReportIntegrityDevWarnings(report: ReportIntegrityAuditReport): void {
  for (const f of report.findings) {
    if (f.severity === "info") continue;
    cabDevWarn(
      AUDIT_SCOPE,
      f.message,
      { code: f.code, count: f.count, severity: f.severity },
      { oncePerSession: true },
    );
  }
  if (report.strictBlocked) {
    cabDevWarn(
      AUDIT_SCOPE,
      "Report integrity strict mode: dataset bloccato per finding critical",
      { findings: report.findings.filter((x) => x.severity === "critical").map((x) => x.code) },
      { oncePerSession: true },
    );
  }
}

export const ReportIntegrityAudit = {
  run: runReportIntegrityAudit,
  emitDevWarnings: emitReportIntegrityDevWarnings,
  isStrictMode: isReportIntegrityStrictMode,
};
