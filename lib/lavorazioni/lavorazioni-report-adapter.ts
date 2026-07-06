import { meseCompletamentoFromIso } from "@/lib/lavorazioni/duration";
import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import { lavorazioneAddettoLabel } from "@/lib/lavorazioni/lavorazioni-list-row-labels";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LogModificaRow } from "@/src/types/supabase-tables";
import type { LavorazioneRow, PrioritaLavorazione } from "@/src/types/supabase-tables";
import type { LavorazioneSchedeStore } from "@/types/schede";
import type { AddettoRecord } from "@/lib/lavorazioni/addetto-model";

function str(v: string | null | undefined, fb = "—"): string {
  const t = v?.trim();
  return t && t.length > 0 ? t : fb;
}

function prioritaToLav(p: PrioritaLavorazione): PrioritaLav {
  if (p === "bassa" || p === "media" || p === "alta") return p;
  return "alta";
}

/** ISO chiusura/archivio persistente (solo `archived_at` o `data_uscita` da conclude). */
export function lavorazioneReportClosureIso(
  row: Pick<LavorazioneRow, "archived_at" | "data_uscita">,
): string | null {
  const iso = row.archived_at?.trim() || row.data_uscita?.trim();
  return iso && iso.length > 0 ? iso : null;
}

function macchinaClienteUtil(row: LavorazioneListRow): {
  macchina: string;
  cliente: string;
  utilizzatore: string;
  targa: string;
  matricola: string;
  nScuderia: string;
} {
  const m = row.mezzo;
  const macchina = m ? `${m.marca} ${m.modello}`.trim() : "—";
  return {
    macchina,
    cliente: m ? str(m.cliente) : "—",
    utilizzatore: m ? str(m.utilizzatore) : "—",
    targa: m ? str(m.targa) : "—",
    matricola: m ? str(m.matricola) : "—",
    nScuderia: m?.numero_scuderia?.trim() ?? "",
  };
}

export type LavorazioniReportResolveContext = {
  schedeStore?: LavorazioneSchedeStore;
  logsByLavorazioneId?: ReadonlyMap<string, readonly LogModificaRow[]>;
  addettiRecords?: readonly AddettoRecord[];
};

function resolveReportAddetto(
  row: LavorazioneListRow,
  ctx?: LavorazioniReportResolveContext,
): string {
  if (!ctx?.schedeStore) return "—";
  const logs = ctx.logsByLavorazioneId?.get(row.id);
  return lavorazioneAddettoLabel(row, ctx.schedeStore, logs, ctx.addettiRecords);
}

/** Riga lista DB → shape legacy `LavorazioneAttiva` (report / classifiche). */
export function lavorazioneListRowToAttiva(
  row: LavorazioneListRow,
  ctx?: LavorazioniReportResolveContext,
): LavorazioneAttiva {
  const { macchina, cliente, utilizzatore, targa, matricola, nScuderia } = macchinaClienteUtil(row);
  const ing = row.data_ingresso?.trim() ? row.data_ingresso : row.created_at;
  return {
    id: row.id,
    codice: row.codice ?? null,
    macchina,
    targa,
    matricola,
    nScuderia,
    cliente,
    utilizzatore,
    cantiere: "",
    statoId: row.stato,
    priorita: prioritaToLav(row.priorita),
    addetto: resolveReportAddetto(row, ctx),
    noteInterne: str(row.note, ""),
    dataIngresso: ing,
    dataCompletamento: null,
  };
}

/** Riga lista DB → shape legacy `LavorazioneArchiviata`. */
export function lavorazioneListRowToArchiviata(
  row: LavorazioneListRow,
  ctx?: LavorazioniReportResolveContext,
): LavorazioneArchiviata {
  const a = lavorazioneListRowToAttiva(row, ctx);
  const fine = lavorazioneReportClosureIso(row);
  return {
    id: a.id,
    codice: a.codice,
    mezzoId: row.mezzo_id?.trim() || null,
    macchina: a.macchina,
    targa: a.targa,
    matricola: a.matricola,
    nScuderia: a.nScuderia,
    cliente: a.cliente,
    utilizzatore: a.utilizzatore,
    cantiere: "",
    addetto: a.addetto,
    noteInterne: a.noteInterne,
    statoFinaleId: row.stato,
    prioritaFinale: a.priorita,
    dataIngresso: a.dataIngresso,
    dataCompletamento: fine ?? "",
    meseCompletamento: fine ? meseCompletamentoFromIso(fine) : "",
  };
}

/**
 * Report — completata = solo archivio ufficiale con chiusura persistente.
 * Esclude lavorazioni in corso, stati UI «completata» non archiviate, `updated_at` come proxy.
 */
export function isReportArchivioCompletataRow(
  row: Pick<LavorazioneListRow, "archived" | "deleted_at" | "archived_at" | "data_uscita">,
): boolean {
  if (row.deleted_at) return false;
  if (!isLavorazioneArchived(row)) return false;
  return Boolean(lavorazioneReportClosureIso(row));
}

/**
 * Lavorazione ammissibile nel report: non eliminata; se ha `mezzo_id` il mezzo deve esistere (join o anagrafica).
 */
export function isReportValidLavorazioneRow(
  row: Pick<LavorazioneListRow, "deleted_at" | "mezzo_id" | "mezzo">,
  validMezzoIds: ReadonlySet<string>,
): boolean {
  if (row.deleted_at) return false;
  const mezzoId = row.mezzo_id?.trim();
  if (!mezzoId) return true;
  if (row.mezzo != null) return true;
  return validMezzoIds.has(mezzoId);
}

/** Esclude eliminate e relazioni mezzo orfane prima del bundle report. */
export function filterReportLavorazioniRows(
  rows: readonly LavorazioneListRow[],
  validMezzoIds: ReadonlySet<string>,
): { rows: LavorazioneListRow[]; excludedCount: number } {
  const out: LavorazioneListRow[] = [];
  let excludedCount = 0;
  for (const r of rows) {
    if (!isReportValidLavorazioneRow(r, validMezzoIds)) {
      excludedCount += 1;
      continue;
    }
    out.push(r);
  }
  return { rows: out, excludedCount };
}

/**
 * Report: distingue in corso (`archived=false`) vs archiviate (`archived=true`).
 * Esclude righe con `deleted_at` (defense in depth oltre a RLS/query).
 */
export function splitLavorazioniListRowsForReport(
  rows: readonly LavorazioneListRow[],
  ctx?: LavorazioniReportResolveContext,
): {
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
} {
  const attive: LavorazioneAttiva[] = [];
  const storico: LavorazioneArchiviata[] = [];
  for (const r of rows) {
    if (r.deleted_at) continue;
    if (isLavorazioneArchived(r)) storico.push(lavorazioneListRowToArchiviata(r, ctx));
    else attive.push(lavorazioneListRowToAttiva(r, ctx));
  }
  return { attive, storico };
}
