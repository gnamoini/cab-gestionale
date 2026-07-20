import type { NarrativeClaim } from "@/lib/report/narrative/quality/narrative-quality.types";
import { parseLocalizedNumber } from "@/lib/report/narrative/quality/parse-localized-number";

const YEAR_MIN = 1900;
const YEAR_MAX = 2100;

const MEZZO_ID_PATTERN = /\bmezzo\s+(\d[\d.]*)/gi;
const CURRENCY_PATTERN = /€\s*([\d.]+(?:,\d+)?)/g;
const PERCENT_PATTERN = /(-?\d+(?:[.,]\d+)?)\s*%/g;
const ABSOLUTE_PATTERN = /\b(?:circa\s+)?(-?\d+(?:[.,]\d+)?)\b/g;

function isYear(n: number): boolean {
  return Number.isInteger(n) && n >= YEAR_MIN && n <= YEAR_MAX;
}

function pushClaim(out: NarrativeClaim[], raw: string, normalized: number, kind: NarrativeClaim["kind"]): void {
  if (isYear(normalized)) return;
  out.push({ raw, normalized, kind });
}

export function extractNarrativeClaims(text: string): NarrativeClaim[] {
  const claims: NarrativeClaim[] = [];
  const mezzoSpans: [number, number][] = [];

  let mezzoMatch: RegExpExecArray | null;
  while ((mezzoMatch = MEZZO_ID_PATTERN.exec(text)) !== null) {
    mezzoSpans.push([mezzoMatch.index, mezzoMatch.index + mezzoMatch[0].length]);
  }

  const inMezzoSpan = (index: number): boolean =>
    mezzoSpans.some(([start, end]) => index >= start && index < end);

  let currencyMatch: RegExpExecArray | null;
  while ((currencyMatch = CURRENCY_PATTERN.exec(text)) !== null) {
    const parsed = parseLocalizedNumber(currencyMatch[1]!);
    if (parsed !== null) {
      pushClaim(claims, currencyMatch[0], parsed, "currency");
    }
  }

  let percentMatch: RegExpExecArray | null;
  while ((percentMatch = PERCENT_PATTERN.exec(text)) !== null) {
    const parsed = parseLocalizedNumber(percentMatch[1]!);
    if (parsed !== null) {
      pushClaim(claims, percentMatch[0], parsed, "percent");
    }
  }

  let absMatch: RegExpExecArray | null;
  while ((absMatch = ABSOLUTE_PATTERN.exec(text)) !== null) {
    if (inMezzoSpan(absMatch.index)) continue;
    if (absMatch[0].includes("%")) continue;
    if (absMatch[0].includes("€")) continue;

    const parsed = parseLocalizedNumber(absMatch[1]!);
    if (parsed !== null) {
      pushClaim(claims, absMatch[0].trim(), parsed, "absolute");
    }
  }

  return claims;
}
