/** OCC token su mezzi.updated_at — ponytail: tolleranza ms per jitter timestamp DB. */
export const MEZZO_OCC_TOLERANCE_MS = 1000;

export function isMezzoUpdatedAtStale(
  snapshotUpdatedAt: string,
  currentUpdatedAt: string,
  toleranceMs = MEZZO_OCC_TOLERANCE_MS,
): boolean {
  const atLink = snapshotUpdatedAt.trim();
  const live = currentUpdatedAt.trim();
  if (!atLink || !live) return false;

  const snap = Date.parse(atLink);
  const cur = Date.parse(live);
  if (!Number.isFinite(snap) || !Number.isFinite(cur)) {
    return live !== atLink;
  }
  return Math.abs(cur - snap) > toleranceMs;
}
