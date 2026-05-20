import { LAVORAZIONE_STATO_COMPLETATA_ID } from "@/lib/lavorazioni/constants";
import { meseCompletamentoFromIso } from "@/lib/lavorazioni/duration";
import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import type { LavorazioneArchiviata, LavorazioneAttiva, PrioritaLav } from "@/lib/lavorazioni/types";
import { LAVORAZIONI_STATI_CHIUSE, type LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneRow, PrioritaLavorazione } from "@/src/types/supabase-tables";

const CHIUSE = new Set<string>(LAVORAZIONI_STATI_CHIUSE);

/** UI legacy: stato DB considerato chiuso (non usare per split report). */
export function isStatoLavorazioneChiusoDb(stato: string): boolean {
  return CHIUSE.has(stato);
}

/** UI legacy: stato «completata» (non usare per KPI chiusure report). */
export function isCompletataForReport(statoId: string): boolean {
  return statoId === LAVORAZIONE_STATO_COMPLETATA_ID || statoId === "completata";
}

function str(v: string | null | undefined, fb = "—"): string {
  const t = v?.trim();
  return t && t.length > 0 ? t : fb;
}

function prioritaToLav(p: PrioritaLavorazione): PrioritaLav {
  if (p === "bassa" || p === "media" || p === "alta") return p;
  return "alta";
}

/** ISO chiusura/archivio per statistiche (solo lavorazioni archiviate). */
export function lavorazioneReportClosureIso(
  row: Pick<LavorazioneRow, "archived_at" | "data_uscita" | "updated_at">,
): string | null {
  const iso = row.archived_at?.trim() || row.data_uscita?.trim() || row.updated_at?.trim();
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

/** Riga lista DB → shape legacy `LavorazioneAttiva` (report / classifiche). */
export function lavorazioneListRowToAttiva(row: LavorazioneListRow): LavorazioneAttiva {
  const { macchina, cliente, utilizzatore, targa, matricola, nScuderia } = macchinaClienteUtil(row);
  const ing = row.data_ingresso?.trim() ? row.data_ingresso : row.created_at;
  const usc = row.data_uscita?.trim() ? row.data_uscita : null;
  return {
    id: row.id,
    macchina,
    targa,
    matricola,
    nScuderia,
    cliente,
    utilizzatore,
    cantiere: "",
    statoId: row.stato,
    priorita: prioritaToLav(row.priorita),
    addetto: "—",
    noteInterne: str(row.note, ""),
    dataIngresso: ing,
    dataCompletamento: usc,
  };
}

/** Riga lista DB → shape legacy `LavorazioneArchiviata`. */
export function lavorazioneListRowToArchiviata(row: LavorazioneListRow): LavorazioneArchiviata {
  const a = lavorazioneListRowToAttiva(row);
  const fine = lavorazioneReportClosureIso(row) ?? row.updated_at;
  return {
    id: a.id,
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
    dataCompletamento: fine,
    meseCompletamento: meseCompletamentoFromIso(fine),
  };
}

/**
 * Report: distingue in corso (`archived=false`) vs archiviate (`archived=true`).
 * Esclude righe con `deleted_at` (defense in depth oltre a RLS/query).
 */
export function splitLavorazioniListRowsForReport(rows: LavorazioneListRow[]): {
  attive: LavorazioneAttiva[];
  storico: LavorazioneArchiviata[];
} {
  const attive: LavorazioneAttiva[] = [];
  const storico: LavorazioneArchiviata[] = [];
  for (const r of rows) {
    if (r.deleted_at) continue;
    if (isLavorazioneArchived(r)) storico.push(lavorazioneListRowToArchiviata(r));
    else attive.push(lavorazioneListRowToAttiva(r));
  }
  return { attive, storico };
}
