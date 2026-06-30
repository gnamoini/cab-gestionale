/** Snapshot minimo fornitore da label settings (no anagrafica strutturata v1). */
export function buildFornitoreSnapshotFromLabel(
  label: string,
  extra?: Record<string, unknown>,
): Record<string, unknown> {
  const trimmed = label.trim();
  return {
    label: trimmed,
    ...(extra ?? {}),
  };
}
