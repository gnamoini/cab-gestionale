import type { MezzoGestito } from "@/lib/mezzi/types";
import { buildSearchDocumentMezzo } from "@/lib/search/builders/build-search-document-mezzo";
import { probeDocumentBuild } from "@/lib/search/search-hot-path-probe";

/** Precomputed haystack per riga — evita rebuild ad ogni query change. */
export function buildMezziHaystackIndex(gestiti: readonly MezzoGestito[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of gestiti) {
    probeDocumentBuild();
    index.set(row.id, buildSearchDocumentMezzo(row));
  }
  return index;
}

export function mezziHaystackForRow(
  row: MezzoGestito,
  haystackById: Map<string, string>,
): string {
  const cached = haystackById.get(row.id);
  if (cached !== undefined) return cached;
  probeDocumentBuild();
  const doc = buildSearchDocumentMezzo(row);
  haystackById.set(row.id, doc);
  return doc;
}
