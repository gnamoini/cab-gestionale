export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Variazione percentuale; null se prev <= 0. */
export function pctChange(prev: number, cur: number): number | null {
  if (prev <= 0) return null;
  return round1(((cur - prev) / prev) * 100);
}
