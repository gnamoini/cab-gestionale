import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import { durataMsStorico } from "@/lib/lavorazioni/duration";
import { lavorazioneMatchesMezzo } from "@/lib/mezzi/lavorazioni-sync";
import { lavRowToMatchShape } from "@/lib/mezzi/mezzi-db-ui-adapter";
import type { MezzoGestito, MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function prioritaIt(p: string): string {
  if (p === "alta") return "Alta";
  if (p === "media") return "Media";
  if (p === "bassa") return "Bassa";
  if (p === "urgente") return "Urgente";
  return p;
}

function giorniTra(isoIn: string, isoOut: string | null): { label: string; num: number } {
  if (!isoOut?.trim()) return { label: "—", num: 0 };
  const ms = durataMsStorico(isoIn, isoOut);
  const g = ms / 86400000;
  const rounded = Math.round(g * 10) / 10;
  if (rounded === 0) return { label: "< 1 giorno", num: g };
  return { label: `${rounded} giorni`, num: g };
}

export function labelLavorazioneStatoDb(stato: string): string {
  return stato.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @deprecated Usare `isLavorazioneArchived(row)` — l'archivio non dipende dallo stato. */
export function isLavorazioneStoricoDb(_stato: string): boolean {
  return false;
}

/** Collegamento mezzo–lavorazione: FK `mezzo_id` stretto, fuzzy solo senza FK, esclude soft-deleted. */
export function lavorazioneCollegataMezzoDb(m: MezzoGestito, row: LavorazioneListRow): boolean {
  if (row.deleted_at) return false;
  const mezzoId = row.mezzo_id?.trim();
  if (mezzoId) return mezzoId === m.id;
  return lavorazioneMatchesMezzo(m, lavRowToMatchShape(row));
}

export function interventiMezzoDaLavorazioniDb(
  m: MezzoGestito,
  rows: readonly LavorazioneListRow[],
): MezzoInterventoLavorazione[] {
  const out: MezzoInterventoLavorazione[] = [];
  for (const row of rows) {
    if (!lavorazioneCollegataMezzoDb(m, row)) continue;
    const ing = row.data_ingresso?.trim() ? row.data_ingresso : row.created_at;
    const fin = row.data_uscita;
    const statoLabel = labelLavorazioneStatoDb(row.stato);
    if (isLavorazioneArchived(row)) {
      const { label, num } = giorniTra(ing, fin);
      out.push({
        id: row.id,
        origine: "storico",
        dataIngresso: ing,
        dataCompletamento: fin,
        durataGiorniLabel: label,
        durataGiorniNum: num,
        tipoIntervento: statoLabel,
        descrizione: (row.note ?? "").trim() || "—",
        prioritaLabel: prioritaIt(row.priorita),
        statoFinale: statoLabel,
      });
    } else {
      const completed = fin;
      const dur = completed ? giorniTra(ing, completed) : { label: "In corso", num: 0 };
      out.push({
        id: row.id,
        origine: "attiva",
        dataIngresso: ing,
        dataCompletamento: completed,
        durataGiorniLabel: dur.label,
        durataGiorniNum: dur.num,
        tipoIntervento: statoLabel,
        descrizione: (row.note ?? "").trim() || "—",
        prioritaLabel: prioritaIt(row.priorita),
        statoFinale: completed ? statoLabel : "In officina",
      });
    }
  }
  out.sort((a, b) => {
    const ta = new Date(a.dataIngresso).getTime();
    const tb = new Date(b.dataIngresso).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  return out;
}

export function mezzoHaLavorazioneAttivaDb(m: MezzoGestito, rows: readonly LavorazioneListRow[]): boolean {
  return rows.some((row) => {
    if (isLavorazioneArchived(row)) return false;
    return lavorazioneCollegataMezzoDb(m, row);
  });
}

/** Lavorazione non eliminata (in corso o archiviata) collegata per identità mezzo. */
export function mezzoHaLavorazioneCollegataDb(m: MezzoGestito, rows: readonly LavorazioneListRow[]): boolean {
  return rows.some((row) => lavorazioneCollegataMezzoDb(m, row));
}
