import { buildMezzoPersistEntityKey } from "@/lib/validation/entity-keys";
import { findSimilarEntityInPool, normalizeEntityString } from "@/lib/validation/global-entity-validation";
import type { MezzoRow } from "@/src/types/supabase-tables";

export function mezzoEntityKeyForPersist(
  data: Pick<MezzoRow, "cliente" | "marca" | "modello" | "targa" | "matricola">,
): string | null {
  return buildMezzoPersistEntityKey(data);
}

export function findSimilarMezzoCliente(
  candidate: string,
  existing: readonly string[],
  exclude?: string,
): string | null {
  return findSimilarEntityInPool(candidate, existing, {
    exclude,
    standardizeLegalSuffix: true,
  });
}

/** Confronto identità mezzo (targa/matricola normalizzata). */
export function mezzoIdentMatches(a: string, b: string): boolean {
  const na = normalizeEntityString(a);
  const nb = normalizeEntityString(b);
  return Boolean(na && nb && na === nb);
}

export function findMezzoBySimilarIdent(
  rows: readonly MezzoRow[],
  targa?: string,
  matricola?: string,
  excludeId?: string,
): MezzoRow | null {
  const t = targa?.trim();
  const m = matricola?.trim();
  if (!t && !m) return null;
  for (const row of rows) {
    if (excludeId && row.id === excludeId) continue;
    if (t && row.targa?.trim() && mezzoIdentMatches(t, row.targa)) return row;
    if (m && row.matricola?.trim() && mezzoIdentMatches(m, row.matricola)) return row;
  }
  return null;
}
