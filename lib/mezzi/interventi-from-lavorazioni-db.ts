import { isLavorazioneArchived } from "@/lib/lavorazioni/archived";
import { permanenzaGiorniTra } from "@/lib/lavorazioni/duration";
import {
  interventionTypeFromTagliandoFields,
  lavorazioneRowToTagliandoFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { MezzoGestito, MezzoInterventoLavorazione } from "@/lib/mezzi/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";

function prioritaIt(p: string): string {
  if (p === "alta") return "Alta";
  if (p === "media") return "Media";
  if (p === "bassa") return "Bassa";
  if (p === "urgente") return "Urgente";
  return p;
}

export function labelLavorazioneStatoDb(stato: string): string {
  return stato.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @deprecated Usare `isLavorazioneArchived(row)` — l'archivio non dipende dallo stato. */
export function isLavorazioneStoricoDb(_stato: string): boolean {
  return false;
}

/** Collegamento mezzo–lavorazione: solo FK `mezzo_id` (no fuzzy attach su orfani). */
export function lavorazioneCollegataMezzoDb(m: MezzoGestito, row: LavorazioneListRow): boolean {
  if (row.deleted_at) return false;
  const mezzoId = row.mezzo_id?.trim();
  return Boolean(mezzoId && mezzoId === m.id);
}

function lavRowToIntervento(row: LavorazioneListRow, weakMezzoLink = false): MezzoInterventoLavorazione {
  const ing = row.data_ingresso?.trim() ? row.data_ingresso : row.created_at;
  const fin = row.data_uscita;
  const statoLabel = labelLavorazioneStatoDb(row.stato);
  const tagliandoFields = lavorazioneRowToTagliandoFields(row);
  const base = {
    id: row.id,
    codice: row.codice ?? null,
    dataIngresso: ing,
    dataCompletamento: fin,
    tipoIntervento: statoLabel,
    interventionType: interventionTypeFromTagliandoFields(tagliandoFields),
    descrizione: (row.note ?? "").trim() || "—",
    prioritaLabel: prioritaIt(row.priorita),
    statoId: row.stato,
    targetType:
      row.target_type === "telaio" || row.target_type === "attrezzatura" ? row.target_type : undefined,
    weakMezzoLink,
  };
  if (isLavorazioneArchived(row)) {
    const { label, num } = permanenzaGiorniTra(ing, fin);
    return {
      ...base,
      origine: "storico",
      durataGiorniLabel: label,
      durataGiorniNum: num,
      statoFinale: statoLabel,
    };
  }
  const completed = fin;
  const dur = completed ? permanenzaGiorniTra(ing, completed) : { label: "In corso", num: 0 };
  return {
    ...base,
    origine: "attiva",
    durataGiorniLabel: dur.label,
    durataGiorniNum: dur.num,
    statoFinale: completed ? statoLabel : "In officina",
  };
}

function sortInterventi(rows: MezzoInterventoLavorazione[]): MezzoInterventoLavorazione[] {
  rows.sort((a, b) => {
    const ta = new Date(a.dataIngresso).getTime();
    const tb = new Date(b.dataIngresso).getTime();
    if (tb !== ta) return tb - ta;
    return b.id.localeCompare(a.id);
  });
  return rows;
}

export function interventiMezzoDaLavorazioniDb(
  m: MezzoGestito,
  rows: readonly LavorazioneListRow[],
): MezzoInterventoLavorazione[] {
  const out: MezzoInterventoLavorazione[] = [];
  for (const row of rows) {
    if (!lavorazioneCollegataMezzoDb(m, row)) continue;
    out.push(lavRowToIntervento(row));
  }
  return sortInterventi(out);
}

/** Index FK lavorazioni + fuzzy su orphan rows — evita scan completo per ogni mezzo. */
export function buildInterventiByMezzoIdFromLavorazioni(
  mezzi: readonly MezzoGestito[],
  rows: readonly LavorazioneListRow[],
): Map<string, MezzoInterventoLavorazione[]> {
  const fkByMezzoId = new Map<string, LavorazioneListRow[]>();
  for (const row of rows) {
    if (row.deleted_at) continue;
    const mezzoId = row.mezzo_id?.trim();
    if (!mezzoId) continue;
    const list = fkByMezzoId.get(mezzoId);
    if (list) list.push(row);
    else fkByMezzoId.set(mezzoId, [row]);
  }

  const map = new Map<string, MezzoInterventoLavorazione[]>();
  for (const m of mezzi) {
    const matched: LavorazioneListRow[] = [...(fkByMezzoId.get(m.id) ?? [])];
    map.set(m.id, sortInterventi(matched.map((row) => lavRowToIntervento(row, !row.mezzo_id?.trim()))));
  }
  return map;
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
