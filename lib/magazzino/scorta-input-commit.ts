/** Commit draft input → quantità intera ≥ 0; invalido/vuoto → committed. */
export function commitScortaInputDraft(raw: string, committed: number): number {
  const trimmed = raw.trim();
  if (!trimmed) return committed;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return committed;
  return Math.max(0, Math.round(n));
}
