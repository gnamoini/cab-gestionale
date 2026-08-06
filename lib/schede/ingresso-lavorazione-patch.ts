import {
  lavorazioneRowToTagliandoFields,
  tagliandoFieldsToLavorazionePatch,
  type TagliandoLavorazioneFields,
} from "@/lib/maintenance-plans/tagliando-lavorazione-fields";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { PrioritaLavorazione, StatoLavorazione } from "@/src/types/supabase-tables";

/** Patch note/tagliando/stato/priorità — esclude mezzo_id e data_ingresso (gestiti da executeInterventoWrite). */
export function buildConsolidatedIngressoLavorazionePatch(input: {
  row: LavorazioneListRow;
  lavorazioneNote?: string;
  tagliandoFields?: TagliandoLavorazioneFields;
  lavorazioneGestione?: {
    stato?: StatoLavorazione;
    priorita?: PrioritaLavorazione;
  };
}): Record<string, unknown> {
  const { row, lavorazioneNote, tagliandoFields, lavorazioneGestione } = input;
  const patch: Record<string, unknown> = {};

  const nextNote = lavorazioneNote?.trim() ?? "";
  const currentNote = (row.note ?? "").trim();
  if (nextNote !== currentNote) {
    patch.note = nextNote || null;
  }

  if (tagliandoFields) {
    const currentTagliando = lavorazioneRowToTagliandoFields(row);
    if (JSON.stringify(tagliandoFields) !== JSON.stringify(currentTagliando)) {
      Object.assign(patch, tagliandoFieldsToLavorazionePatch(tagliandoFields));
    }
  }

  if (lavorazioneGestione?.stato && lavorazioneGestione.stato !== row.stato) {
    patch.stato = lavorazioneGestione.stato;
  }
  if (lavorazioneGestione?.priorita && lavorazioneGestione.priorita !== row.priorita) {
    patch.priorita = lavorazioneGestione.priorita;
  }

  return patch;
}

export function ingressoTagliandoFieldsChanged(
  row: LavorazioneListRow,
  tagliandoFields?: TagliandoLavorazioneFields,
): boolean {
  if (!tagliandoFields) return false;
  return JSON.stringify(tagliandoFields) !== JSON.stringify(lavorazioneRowToTagliandoFields(row));
}
