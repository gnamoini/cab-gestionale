import { isPreventivoVendita } from "@/lib/preventivi/preventivo-categoria";
import type { PreventivoRecord } from "@/lib/preventivi/types";

/** Validazione client-side prima del persist — ritorna messaggio errore o null se OK. */
export function validatePreventivoBeforeSave(record: PreventivoRecord): string | null {
  if (!record.cliente.trim()) {
    return "Il cliente è obbligatorio.";
  }
  if (!isPreventivoVendita(record)) {
    const hasMezzoId = Boolean(record.mezzoId?.trim());
    const hasIdent =
      Boolean(record.targa.trim()) ||
      Boolean(record.matricola.trim()) ||
      Boolean(record.nScuderia.trim());
    const hasLavorazione = Boolean(record.lavorazioneId?.trim());
    if (!hasMezzoId && !hasIdent && !hasLavorazione) {
      return "Indicare il mezzo (targa, matricola o scuderia) o collegare una lavorazione.";
    }
  }
  return null;
}
