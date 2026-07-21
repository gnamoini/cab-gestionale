/** Ricalcola target scorta da quantità corrente + delta (floor a 0). */
export function resolveScortaAdjustTarget(
  currentQuantita: number,
  delta: number,
): { prima: number; dopo: number; appliedDelta: number } | null {
  const prima = Math.max(0, Math.round(currentQuantita));
  const rounded = Math.round(delta);
  const dopo = Math.max(0, prima + rounded);
  if (dopo === prima) return null;
  return { prima, dopo, appliedDelta: dopo - prima };
}
