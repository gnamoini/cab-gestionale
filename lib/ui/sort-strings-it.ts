/** Ordinamento alfabetico italiano, case-insensitive (solo visualizzazione / UI). */
export function sortStringsItCaseInsensitive(values: readonly string[]): string[] {
  return [...values].sort((a, b) => a.localeCompare(b, "it", { sensitivity: "base" }));
}
