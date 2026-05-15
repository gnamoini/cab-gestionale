/**
 * Unisce elenchi opzioni filtro (es. `app_settings` + valori presenti in tabella),
 * deduplica e ordina in italiano. Liste vuote / undefined sono ignorate.
 */
export function mergeUniqueSortedIt(a?: readonly string[] | null, b?: readonly string[] | null): string[] {
  const s = new Set<string>();
  for (const arr of [a, b]) {
    if (!arr) continue;
    for (const x of arr) {
      const t = typeof x === "string" ? x.trim() : "";
      if (t) s.add(t);
    }
  }
  return [...s].sort((x, y) => x.localeCompare(y, "it"));
}
