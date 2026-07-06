/**
 * I-VIN-1: `vin` è solo alias UI. Dominio/DB: `telaio_num` (SSOT).
 * I-VIN-2: ogni `telaio_num` persistito è già UPPER(TRIM()) — unico punto di canonicalizzazione.
 *
 * Mapping ammesso: vin ⇄ telaio_num
 * Vietato: vin ⇄ telaio_num_norm (solo mezzi.service per check unicità).
 */

/** Canonical: UPPER(TRIM()). Whitespace-only → null (I-VIN-2). */
export function normalizeVin(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (!t) return null;
  return t.toUpperCase();
}

export function vinCanonicalEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeVin(a);
  const nb = normalizeVin(b);
  if (!na || !nb) return false;
  return na === nb;
}

/** Applica I-VIN-2 su payload write: telaio_num sempre canonicalizzato o null. */
export function canonicalTelaioNumForWrite(
  raw: string | null | undefined,
  opts?: { clearWhenEmpty?: boolean },
): string | null | undefined {
  if (raw === undefined && !opts?.clearWhenEmpty) return undefined;
  if (opts?.clearWhenEmpty && (raw == null || raw.trim() === "")) return null;
  return normalizeVin(raw);
}
