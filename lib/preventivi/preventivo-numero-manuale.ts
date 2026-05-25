import type { PreventivoRecord } from "@/lib/preventivi/types";

const PREVENTIVO_NUMERO_MANUALE_RE = /^(\d{2})-(\d{4})\/M$/i;

/** Numero preventivo manuale (es. 26-0001/M). */
export function isPreventivoNumeroManuale(numero: string): boolean {
  return PREVENTIVO_NUMERO_MANUALE_RE.test(numero.trim());
}

export function formatPreventivoNumeroManuale(year: number, seq: number): string {
  const yy = String(year % 100).padStart(2, "0");
  return `${yy}-${String(seq).padStart(4, "0")}/M`;
}

function parsePreventivoNumeroManualeSeq(numero: string, year: number): number | null {
  const t = numero.trim();
  const m = PREVENTIVO_NUMERO_MANUALE_RE.exec(t);
  if (!m) return null;
  const yy = parseInt(m[1]!, 10);
  const fullYear = 2000 + yy;
  if (fullYear !== year) return null;
  const seq = parseInt(m[2]!, 10);
  return Number.isFinite(seq) && seq > 0 ? seq : null;
}

/** Anteprima client-side (non autoritativa): max sequenza /M per l'anno corrente + 1. */
export function nextPreventivoNumeroManualeFromRecords(
  existingRecords: readonly PreventivoRecord[],
  year = new Date().getFullYear(),
): string {
  let max = 0;
  for (const p of existingRecords) {
    const seq = parsePreventivoNumeroManualeSeq(p.numero, year);
    if (seq !== null) max = Math.max(max, seq);
  }
  return formatPreventivoNumeroManuale(year, max + 1);
}
