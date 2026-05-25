import type { PreventivoRecord } from "@/lib/preventivi/types";

const PREVENTIVO_NUMERO_LAVORAZIONE_RE = /^(\d{2}-\d{4})\/(\d+)$/;

/** Numero preventivo collegato a lavorazione (es. 26-0001/3). */
export function isPreventivoNumeroLavorazione(numero: string): boolean {
  return PREVENTIVO_NUMERO_LAVORAZIONE_RE.test(numero.trim());
}

export function formatPreventivoNumeroLavorazione(codiceLavorazione: string, seq: number): string {
  const codice = codiceLavorazione.trim();
  return `${codice}/${seq}`;
}

/** Suffisso progressivo se il numero corrisponde al codice lavorazione atteso. */
export function parsePreventivoNumeroLavorazioneSuffix(
  numero: string,
  codiceLavorazione: string,
): number | null {
  const t = numero.trim();
  const codice = codiceLavorazione.trim();
  if (!t || !codice) return null;
  const m = PREVENTIVO_NUMERO_LAVORAZIONE_RE.exec(t);
  if (!m || m[1] !== codice) return null;
  const seq = parseInt(m[2]!, 10);
  return Number.isFinite(seq) && seq > 0 ? seq : null;
}

/** Anteprima client-side (non autoritativa): max suffisso esistente + 1 per la lavorazione. */
export function nextPreventivoNumeroForLavorazione(
  codiceLavorazione: string,
  existingRecords: readonly PreventivoRecord[],
  lavorazioneId?: string,
): string {
  const codice = codiceLavorazione.trim();
  let max = 0;
  for (const p of existingRecords) {
    if (lavorazioneId && p.lavorazioneId !== lavorazioneId) continue;
    const seq = parsePreventivoNumeroLavorazioneSuffix(p.numero, codice);
    if (seq !== null) max = Math.max(max, seq);
  }
  return formatPreventivoNumeroLavorazione(codice, max + 1);
}
