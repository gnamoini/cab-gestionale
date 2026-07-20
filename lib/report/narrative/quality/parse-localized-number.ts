/** Parse IT/EU amounts and dot-decimal literals (e.g. LLM "10.98"). */
export function parseLocalizedNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasComma = trimmed.includes(",");
  const hasDot = trimmed.includes(".");

  if (hasComma) {
    const normalized = trimmed.replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  if (hasDot) {
    const parts = trimmed.split(".");
    if (parts.length === 2 && parts[1]!.length <= 2) {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : null;
    }
    const normalized = trimmed.replace(/\./g, "");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}
