/** Parse legacy KPI string values to number for adapter migration. */
export function parseMetricNumber(raw: string): number {
  const cleaned = raw
    .replace(/\s/g, "")
    .replace(/[€$]/g, "")
    .replace(/h$/i, "")
    .replace(/gg$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (Number.isFinite(n)) return n;
  const digits = raw.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n2 = Number(digits);
  return Number.isFinite(n2) ? n2 : 0;
}
