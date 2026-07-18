/**
 * SSOT normalizzazione codici/descrizioni per ricezione DDT ↔ catalogo magazzino.
 * Non usare normalizeRicambioCodice() direttamente nel path matching ricezione.
 */

/** Forma display: trim + uppercase IT. */
export function normalizeItemCodeDisplay(raw: string): string {
  if (!raw) return "";
  return raw.trim().toLocaleUpperCase("it-IT");
}

/**
 * Chiave confronto: uppercase, senza separatori spazio/-/_/./
 * Es: ABC-001 → ABC001, abc/001 → ABC001
 */
export function normalizeItemCode(raw: string): string {
  const display = normalizeItemCodeDisplay(raw);
  if (!display) return "";
  return display.replace(/[\s\-_/\\.]+/g, "");
}

/**
 * Chiave loose: dopo normalizeItemCode, rimuove zeri iniziali sul segmento numerico finale.
 * Es: 000123 → 123, ABC0001 → ABC1
 * ponytail: euristica — non garantisce equivalenza fornitore legacy su tutti i formati.
 */
export function normalizeItemCodeLoose(raw: string): string {
  const base = normalizeItemCode(raw);
  if (!base) return "";
  const m = base.match(/^([A-Z]*?)(0*\d+)$/);
  if (!m) return base;
  const prefix = m[1] ?? "";
  const num = (m[2] ?? "").replace(/^0+/, "") || "0";
  return `${prefix}${num}`;
}

/** Descrizione per fuzzy: trim, collapse spaces, lowercase. */
export function normalizeItemDescription(raw: string): string {
  if (!raw) return "";
  return raw.trim().replace(/\s+/g, " ").toLocaleLowerCase("it-IT");
}
