import type {
  ReportIntegrityQueryMeta,
  ReportIntegrityStatus,
} from "@/lib/report/report-data-integrity-layer";
import type { ReportIntegrityAuditReport } from "@/lib/report/report-integrity-audit";

export type ReportIntegrityBadgeState = "ok" | "degraded" | "partial" | "drift_detected";

export type ReportIntegrityBadgeView = {
  status: ReportIntegrityStatus;
  audit: ReportIntegrityAuditReport;
  queryMeta: readonly ReportIntegrityQueryMeta[];
  /** Override manuali attivi (non eliminati). */
  manualEntryCount: number;
  isLoading?: boolean;
  isFetching?: boolean;
};

const SOURCE_LABEL: Record<ReportIntegrityQueryMeta["source"], string> = {
  lavorazioni: "Lavorazioni",
  magazzino: "Magazzino",
  mezzi: "Mezzi",
  movimenti: "Movimenti",
  manualEntries: "Override manuali",
};

function hasFinding(audit: ReportIntegrityAuditReport, code: string): boolean {
  return audit.findings.some((f) => f.code === code);
}

function fallbackSources(queryMeta: readonly ReportIntegrityQueryMeta[]): string[] {
  return queryMeta.filter((q) => q.isError).map((q) => SOURCE_LABEL[q.source]);
}

function partialFetchSources(audit: ReportIntegrityAuditReport): string[] {
  return audit.findings
    .filter((f) => f.code === "partial_fetch")
    .map((f) => {
      const m = f.message.match(/su (\w+)/);
      const key = m?.[1] as ReportIntegrityQueryMeta["source"] | undefined;
      return key ? SOURCE_LABEL[key] ?? key : f.message;
    });
}

function driftSpreadSec(audit: ReportIntegrityAuditReport): number | null {
  const drift = audit.findings.find((f) => f.code === "cache_drift");
  if (!drift?.count) return null;
  return Math.round(drift.count / 1000);
}

function formatAgeMs(updatedAt: number, now = Date.now()): string {
  if (updatedAt <= 0) return "—";
  const ageSec = Math.max(0, Math.round((now - updatedAt) / 1000));
  if (ageSec < 60) return `${ageSec}s`;
  if (ageSec < 3600) return `${Math.round(ageSec / 60)}m`;
  return `${Math.round(ageSec / 3600)}h`;
}

/** Stato badge UI (priorità: drift → partial → degraded → ok). */
export function deriveReportIntegrityBadgeState(view: ReportIntegrityBadgeView): ReportIntegrityBadgeState {
  if (hasFinding(view.audit, "cache_drift")) return "drift_detected";
  const hasLoadedSource = view.queryMeta.some((q) => !q.isError && q.dataUpdatedAt > 0);
  if (
    hasFinding(view.audit, "partial_fetch") ||
    hasFinding(view.audit, "query_error") ||
    fallbackSources(view.queryMeta).length > 0
  ) {
    return "partial";
  }
  if (view.isLoading && !hasLoadedSource) return "partial";
  if (view.status === "degraded" || view.status === "blocked") return "degraded";
  return "ok";
}

export function reportIntegrityBadgeLabel(state: ReportIntegrityBadgeState): string {
  switch (state) {
    case "ok":
      return "OK";
    case "degraded":
      return "DEGRADED";
    case "partial":
      return "PARTIAL";
    case "drift_detected":
      return "DRIFT DETECTED";
  }
}

/** Righe tooltip (cache, override, drift, fallback). */
export function buildReportIntegrityTooltipLines(
  view: ReportIntegrityBadgeView,
  now = Date.now(),
): string[] {
  const loaded = view.queryMeta.filter((q) => !q.isError && q.dataUpdatedAt > 0);
  const cacheLines =
    loaded.length > 0
      ? loaded.map((q) => `${SOURCE_LABEL[q.source]}: ${formatAgeMs(q.dataUpdatedAt, now)}`)
      : ["Cache: caricamento…"];

  const spread = driftSpreadSec(view.audit);
  const driftLine =
    spread != null
      ? `Drift rilevato: sì (${spread}s tra sorgenti)`
      : "Drift rilevato: no";

  const overrideLine =
    view.manualEntryCount > 0
      ? `Override attivi: ${view.manualEntryCount}`
      : "Override attivi: nessuno";

  const fallbacks = fallbackSources(view.queryMeta);
  const partial = partialFetchSources(view.audit);
  const fallbackParts = [...new Set([...fallbacks, ...partial])];
  const fallbackLine =
    fallbackParts.length > 0
      ? `Fallback attivi: ${fallbackParts.join(", ")}`
      : view.isLoading || view.isFetching
        ? "Fallback attivi: aggiornamento in corso"
        : "Fallback attivi: nessuno";

  return [`Cache · ${cacheLines.join(" · ")}`, overrideLine, driftLine, fallbackLine];
}
