import type { OrdineFornitoreRecord } from "@/lib/ordini-fornitori/types";

const ORDINE_NUMERO_RE = /^(\d{2})-(\d{4})\/O$/i;

export function isOrdineFornitoreNumero(numero: string): boolean {
  return ORDINE_NUMERO_RE.test(numero.trim());
}

export function formatOrdineFornitoreNumero(year: number, seq: number): string {
  const yy = String(year % 100).padStart(2, "0");
  return `${yy}-${String(seq).padStart(4, "0")}/O`;
}

function parseOrdineNumeroSeq(numero: string, year: number): number | null {
  const t = numero.trim();
  const m = ORDINE_NUMERO_RE.exec(t);
  if (!m) return null;
  const yy = parseInt(m[1]!, 10);
  const fullYear = 2000 + yy;
  if (fullYear !== year) return null;
  const seq = parseInt(m[2]!, 10);
  return Number.isFinite(seq) && seq > 0 ? seq : null;
}

/** Anteprima client-side (non autoritativa): max sequenza /O per l'anno corrente + 1. */
export function nextOrdineNumeroFromRecords(
  existingRecords: readonly Pick<OrdineFornitoreRecord, "numero">[],
  year = new Date().getFullYear(),
): string {
  let max = 0;
  for (const o of existingRecords) {
    const seq = parseOrdineNumeroSeq(o.numero, year);
    if (seq !== null) max = Math.max(max, seq);
  }
  return formatOrdineFornitoreNumero(year, max + 1);
}
