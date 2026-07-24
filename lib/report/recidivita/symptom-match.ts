const STOP_WORDS = new Set([
  "il",
  "lo",
  "la",
  "i",
  "gli",
  "le",
  "un",
  "una",
  "di",
  "da",
  "in",
  "su",
  "per",
  "con",
  "non",
  "che",
  "del",
  "della",
  "dei",
  "delle",
  "al",
  "alla",
]);

export function normalizeSymptomText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function symptomTokens(value: string): string[] {
  return normalizeSymptomText(value)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));
}

/** Overlap Jaccard su token — 0..1 */
export function symptomSimilarity(a: string, b: string): number {
  const ta = new Set(symptomTokens(a));
  const tb = new Set(symptomTokens(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) {
    if (tb.has(t)) inter += 1;
  }
  const union = ta.size + tb.size - inter;
  return union > 0 ? inter / union : 0;
}

export function symptomMatchScore(a: string, b: string, threshold = 0.35): number {
  const sim = symptomSimilarity(a, b);
  return sim >= threshold ? sim : 0;
}
