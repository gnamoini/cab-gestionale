/**
 * Report Data Integrity Layer — gate unico per statistiche report/dashboard.
 *
 * Regole (implementate in report-truth-dataset + adapter):
 * - Ricambi: solo ID in snapshot magazzino
 * - Movimenti: solo da movimenti_ricambi con ricambio/lavorazione validi
 * - Lavorazioni: no deleted_at, no mezzo_id orfano; completate solo archivio con chiusura
 * - Mezzi: anagrafica query; manual entries skip deleted_at
 *
 * Nessun dato KPI report deve bypassare `ReportDataIntegrityLayer.buildValidatedDataset`.
 */
import { filterReportLavorazioniRows } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { GESTIONALE_REPORT_STALE_MS } from "@/lib/react-query/query-layer-policies";
import {
  buildReportTruthDataset,
  filterMovimentiForReport,
  idsFromMagazzino,
  idsFromMezzi,
  type ReportTruthContext,
  type ReportTruthDataset,
} from "@/lib/report/report-truth-dataset";
import {
  ReportIntegrityAudit,
  type IntegrityFinding,
  type ReportIntegrityAuditReport,
} from "@/lib/report/report-integrity-audit";

export type ReportIntegrityQueryMeta = {
  source: "lavorazioni" | "magazzino" | "mezzi" | "movimenti" | "manualEntries";
  isError: boolean;
  isFetching: boolean;
  dataUpdatedAt: number;
  rowCount: number;
};

export type ReportIntegrityInput = ReportTruthContext & {
  queryMeta?: ReportIntegrityQueryMeta[];
  /** Se true, non schedula refresh su cache drift grave. */
  skipDriftRefresh?: boolean;
  /** Callback opzionale per refresh su drift > 300s (hook report). */
  onSevereCacheDrift?: () => void;
};

export type ReportIntegrityStatus = "ok" | "degraded" | "blocked";

export type ReportIntegrityResult = ReportTruthDataset & {
  status: ReportIntegrityStatus;
  audit: ReportIntegrityAuditReport;
};

export const CACHE_DRIFT_WARN_MS = GESTIONALE_REPORT_STALE_MS;
export const CACHE_DRIFT_REFRESH_MS = 300_000;

function emptyContextForSource(source: ReportIntegrityQueryMeta["source"]): Partial<ReportTruthContext> {
  switch (source) {
    case "lavorazioni":
      return { lavorazioniRaw: [] };
    case "magazzino":
      return { magazzino: [] };
    case "mezzi":
      return { mezzi: [] };
    case "movimenti":
      return { movimenti: [] };
    case "manualEntries":
      return { manualEntries: [] };
  }
}

/** Fallback sicuro: svuota entità con query in errore (no mix stale parziale). */
export function applyQueryErrorFallback(
  ctx: ReportTruthContext,
  queryMeta?: ReportIntegrityQueryMeta[],
): ReportTruthContext {
  if (!queryMeta?.length) return ctx;
  let next = ctx;
  for (const q of queryMeta) {
    if (!q.isError) continue;
    next = { ...next, ...emptyContextForSource(q.source) };
  }
  return next;
}

/** Rileva cache drift tra sorgenti React Query (spread dataUpdatedAt). */
export function detectCacheDrift(queryMeta: readonly ReportIntegrityQueryMeta[]): {
  findings: IntegrityFinding[];
  severeDrift: boolean;
} {
  const loaded = queryMeta.filter((q) => !q.isError && q.rowCount >= 0 && q.dataUpdatedAt > 0);
  if (loaded.length < 2) return { findings: [], severeDrift: false };

  const times = loaded.map((q) => q.dataUpdatedAt);
  const spread = Math.max(...times) - Math.min(...times);
  const findings: IntegrityFinding[] = [];

  if (spread > CACHE_DRIFT_WARN_MS) {
    findings.push({
      code: "cache_drift",
      severity: "warning",
      count: spread,
      message: `Cache drift tra sorgenti report (${Math.round(spread / 1000)}s)`,
    });
  }

  return { findings, severeDrift: spread > CACHE_DRIFT_REFRESH_MS };
}

/** Invariante post-build: ogni magLog.ricambioId deve essere in validRicambioIds. */
export function assertDatasetCrossRefs(dataset: ReportTruthDataset): number {
  let orphan = 0;
  for (const e of dataset.magLog) {
    if (!dataset.validRicambioIds.has(e.ricambioId)) orphan += 1;
  }
  return orphan;
}

function resolveStatus(
  audit: ReportIntegrityAuditReport,
  queryMeta?: ReportIntegrityQueryMeta[],
): ReportIntegrityStatus {
  if (audit.strictBlocked) return "blocked";
  const hasQueryError = queryMeta?.some((q) => q.isError) ?? false;
  const hasWarning = audit.findings.some((f) => f.severity === "warning" || f.severity === "critical");
  if (hasQueryError || hasWarning) return "degraded";
  return "ok";
}

function buildValidatedDataset(input: ReportIntegrityInput): ReportIntegrityResult {
  const ctx = applyQueryErrorFallback(input, input.queryMeta);
  const dataset = buildReportTruthDataset(ctx);

  const driftFindings = input.queryMeta ? detectCacheDrift(input.queryMeta) : { findings: [], severeDrift: false };
  if (driftFindings.severeDrift && !input.skipDriftRefresh) {
    input.onSevereCacheDrift?.();
  }

  const audit = ReportIntegrityAudit.run(dataset, {
    queryMeta: input.queryMeta?.map(({ source, isError, isFetching, rowCount }) => ({
      source,
      isError,
      isFetching,
      rowCount,
    })),
    extraFindings: driftFindings.findings,
  });

  ReportIntegrityAudit.emitDevWarnings(audit);

  const status = resolveStatus(audit, input.queryMeta);

  return { ...dataset, status, audit };
}

/** Helper dashboard: movimenti filtrati con stesse regole report. */
export function filterDashboardMovimenti(
  movimenti: ReportTruthContext["movimenti"],
  magazzino: ReportTruthContext["magazzino"],
  lavorazioniRaw: ReportTruthContext["lavorazioniRaw"],
  mezzi: ReportTruthContext["mezzi"],
): ReportTruthContext["movimenti"] {
  const validRicambioIds = idsFromMagazzino(magazzino);
  const validMezzoIds = idsFromMezzi(mezzi);
  const { rows: lavorazioniFiltered } = filterReportLavorazioniRows(lavorazioniRaw, validMezzoIds);
  const validLavorazioneIds = new Set(lavorazioniFiltered.map((r) => r.id));
  return filterMovimentiForReport(movimenti, validRicambioIds, validLavorazioneIds).rows;
}

export const ReportDataIntegrityLayer = {
  buildValidatedDataset,
  applyQueryErrorFallback,
  detectCacheDrift,
  assertDatasetCrossRefs,
  filterMovimentiForReport,
  filterReportLavorazioniRows,
  filterDashboardMovimenti,
  idsFromMagazzino,
  idsFromMezzi,
};

export { filterMovimentiForReport, filterReportLavorazioniRows };
