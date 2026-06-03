import { filterReportLavorazioniRows } from "@/lib/lavorazioni/lavorazioni-report-adapter";
import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import type { MagazzinoChangeLogEntry } from "@/lib/magazzino/magazzino-change-log-storage";
import type { RicambioMagazzino } from "@/lib/magazzino/types";
import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildReportLavorazioniBundle, type ReportLavorazioniBundle, type ReportManualByMonth } from "@/lib/report/lavorazioni-report-selectors";
import { movimentiRowsToMagazzinoChangeLog } from "@/lib/report/report-movimenti-log";
import { manualEntriesToByMonth } from "@/lib/report/report-manual-entries-map";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { MovimentoRicambioRow, ReportManualEntryRow } from "@/src/types/supabase-tables";

export type ReportTruthContext = {
  lavorazioniRaw: LavorazioneListRow[];
  /** Fetch dedicato archivio (`archived=true`) — source-of-truth per metriche completate. */
  lavorazioniArchivioRaw?: LavorazioneListRow[];
  magazzino: RicambioMagazzino[];
  mezzi: MezzoGestito[];
  movimenti: MovimentoRicambioRow[];
  manualEntries: ReportManualEntryRow[];
};

export type ReportTruthDataset = ReportLavorazioniBundle & {
  magazzino: RicambioMagazzino[];
  mezzi: MezzoGestito[];
  manualEntries: ReportManualEntryRow[];
  manualByMonth: ReportManualByMonth;
  magLog: MagazzinoChangeLogEntry[];
  validRicambioIds: ReadonlySet<string>;
  validLavorazioneIds: ReadonlySet<string>;
  validMezzoIds: ReadonlySet<string>;
  /** Movimenti scartati (ricambio/lavorazione orfana) — per sanity dev. */
  movimentiExcludedCount: number;
  /** Lavorazioni scartate (deleted/orfano mezzo) — per sanity dev. */
  lavorazioniExcludedCount: number;
};

export function idsFromMagazzino(prodotti: readonly RicambioMagazzino[]): Set<string> {
  return new Set(prodotti.map((p) => p.id));
}

export function idsFromMezzi(mezzi: readonly MezzoGestito[]): Set<string> {
  return new Set(mezzi.map((m) => m.id));
}

/**
 * Solo movimenti con ricambio esistente; se `lavorazione_id` valorizzato deve essere in lavorazioni valide.
 */
export function filterMovimentiForReport(
  movimenti: readonly MovimentoRicambioRow[],
  validRicambioIds: ReadonlySet<string>,
  validLavorazioneIds: ReadonlySet<string>,
): { rows: MovimentoRicambioRow[]; excludedCount: number } {
  const rows: MovimentoRicambioRow[] = [];
  let excludedCount = 0;
  for (const m of movimenti) {
    const rid = m.ricambio_id?.trim();
    if (!rid || !validRicambioIds.has(rid)) {
      excludedCount += 1;
      continue;
    }
    const lavId = m.lavorazione_id?.trim();
    if (lavId && !validLavorazioneIds.has(lavId)) {
      excludedCount += 1;
      continue;
    }
    rows.push(m);
  }
  return { rows, excludedCount };
}

/** @deprecated Usare `ReportDataIntegrityLayer.buildValidatedDataset`. */
export function buildReportTruthDataset(ctx: ReportTruthContext): ReportTruthDataset {
  const validRicambioIds = idsFromMagazzino(ctx.magazzino);
  const validMezzoIds = idsFromMezzi(ctx.mezzi);

  const { rows: lavorazioniFiltered, excludedCount: lavorazioniExcludedCount } = filterReportLavorazioniRows(
    ctx.lavorazioniRaw,
    validMezzoIds,
  );
  const archivioSource =
    ctx.lavorazioniArchivioRaw ??
    lavorazioniFiltered.filter((r) => !r.deleted_at && isLavorazioneArchived(r));
  const { rows: archivioFiltered } = filterReportLavorazioniRows(archivioSource, validMezzoIds);
  const validLavorazioneIds = new Set(lavorazioniFiltered.map((r) => r.id));

  const { rows: movimentiFiltered, excludedCount: movimentiExcludedCount } = filterMovimentiForReport(
    ctx.movimenti,
    validRicambioIds,
    validLavorazioneIds,
  );

  const bundle = buildReportLavorazioniBundle(lavorazioniFiltered, archivioFiltered);
  const manualByMonth = manualEntriesToByMonth(ctx.manualEntries);
  const magLog = movimentiRowsToMagazzinoChangeLog(movimentiFiltered);

  return {
    ...bundle,
    magazzino: ctx.magazzino,
    mezzi: ctx.mezzi,
    manualEntries: ctx.manualEntries,
    manualByMonth,
    magLog,
    validRicambioIds,
    validLavorazioneIds,
    validMezzoIds,
    movimentiExcludedCount,
    lavorazioniExcludedCount,
  };
}
