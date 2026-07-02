import { buildMezzoPersistEntityKey } from "@/lib/validation/entity-keys";
import { findSimilarEntityInPool, normalizeEntityString } from "@/lib/validation/global-entity-validation";
import type { MezzoGestito } from "@/lib/mezzi/types";
import type { MezzoRow } from "@/src/types/supabase-tables";

type MezzoIdentCandidate = Pick<MezzoRow, "id" | "targa"> & {
  matricola?: string | null;
  cliente?: string;
  marca?: string;
  modello?: string;
};

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
  rows: readonly (MezzoRow | MezzoGestito)[],
  targa?: string,
  matricola?: string,
  excludeId?: string,
): MezzoIdentCandidate | null {
  const t = targa?.trim();
  const m = matricola?.trim();
  if (!t && !m) return null;
  for (const row of rows) {
    if (excludeId && row.id === excludeId) continue;
    const rowTarga = row.targa?.trim();
    const rowMatricola =
      "matricola" in row && row.matricola != null
        ? String(row.matricola).trim()
        : null;
    if (t && rowTarga && mezzoIdentMatches(t, rowTarga)) return row;
    if (m && rowMatricola && rowMatricola !== "Non assegnata" && mezzoIdentMatches(m, rowMatricola)) return row;
  }
  return null;
}
