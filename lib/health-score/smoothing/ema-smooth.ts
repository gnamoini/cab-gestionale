export function emaSmooth(raw: number, previous: number | null, alpha: number): number {
  if (previous == null || !Number.isFinite(previous)) return raw;
  return Math.round(alpha * raw + (1 - alpha) * previous);
}
