/** ponytail: Set invertito da listMezziWithoutPreset — O(1) lookup in lista lavorazioni. */
export function mezzoHasPresetConfig(
  mezzoId: string,
  mezziWithoutPreset: ReadonlySet<string>,
): boolean {
  const id = mezzoId.trim();
  if (!id) return false;
  return !mezziWithoutPreset.has(id);
}
