import type { List, Page } from "@/lib/domain/list-types";

/** Stable pure function — hook ONLY caller (R-5). */
export function flattenPages<T>(pages: readonly Page<T>[]): List<T> {
  return pages.flatMap((p) => p.rows);
}

/** Lavorazioni infinite cache — prima occorrenza per id (ordine pagine RPC). */
export function dedupeLavorazioneListRowsById<T extends { id: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

export function flattenLavorazioneListPages(
  pages: readonly Page<{ id: string }>[],
): { id: string }[] {
  return dedupeLavorazioneListRowsById(flattenPages(pages));
}
