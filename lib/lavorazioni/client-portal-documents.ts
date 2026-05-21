import { LAVORAZIONE_DOCUMENT_SLOTS } from "@/lib/lavorazioni/lavorazione-documents";
import type { LavorazioneDocumentTipo } from "@/src/types/supabase-tables";

/** Etichette documenti nel portale clienti (senza terminologia interna officina). */
export function clientPortalDocumentLabel(tipo: LavorazioneDocumentTipo, defaultLabel: string): string {
  if (tipo === "preventivo_upload") return "Preventivo";
  return defaultLabel;
}

export const CLIENT_PORTAL_DOCUMENT_SLOTS = LAVORAZIONE_DOCUMENT_SLOTS.map((slot) => ({
  ...slot,
  label: clientPortalDocumentLabel(slot.tipo, slot.label),
}));
