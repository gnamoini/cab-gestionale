/** Valore parziale valido mentre l'utente digita (es. "12," / "12." / "12,5"). */
export function isDecimalInputDraft(raw: string, opts?: { allowNegative?: boolean }): boolean {
  if (raw === "") return true;
  const neg = opts?.allowNegative ? "-?" : "";
  return new RegExp(`^${neg}\\d*[.,]?\\d*$`).test(raw);
}

/** Normalizza separatore decimale: virgola → punto. */
export function normalizeDecimalInput(raw: string): string {
  return raw.trim().replace(",", ".");
}

/** Parse "12,5" / "12.5" / "12" → number o null. */
export function parseDecimalInput(raw: string): number | null {
  const t = normalizeDecimalInput(raw);
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}
