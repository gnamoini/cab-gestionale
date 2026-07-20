import type { AIInsightPayload } from "@/lib/report/ai-context/types";
import type { NarrativeClaim } from "@/lib/report/narrative/quality/narrative-quality.types";
import { parseLocalizedNumber } from "@/lib/report/narrative/quality/parse-localized-number";

export type NumericEvidenceIndex = {
  values: number[];
};

type ClaimKind = NarrativeClaim["kind"];

const EXCLUDED_KEY_PATTERNS = [
  /id$/i,
  /code$/i,
  /at$/i,
  /date$/i,
  /^year$/i,
  /^version$/i,
  /^schemaversion$/i,
];

function isExcludedKey(key: string): boolean {
  const normalized = key.replace(/[_-]/g, "");
  return EXCLUDED_KEY_PATTERNS.some((re) => re.test(normalized));
}

function parseNumericString(raw: string): number | null {
  const trimmed = raw.trim();
  const percent = trimmed.endsWith("%");
  const core = percent ? trimmed.slice(0, -1).trim() : trimmed;
  const parsed = parseLocalizedNumber(core.replace(/€/g, "").replace(/\s/g, ""));
  if (parsed === null) return null;
  return parsed;
}

function addValue(index: NumericEvidenceIndex, value: number): void {
  if (!index.values.includes(value)) {
    index.values.push(value);
  }
}

/** Estrae solo evidenza numerica ammessa da AIInsightPayload.values (whitelist key). */
export function extractNumericEvidence(payload: AIInsightPayload): NumericEvidenceIndex {
  const index: NumericEvidenceIndex = { values: [] };

  for (const [key, value] of Object.entries(payload.values)) {
    if (isExcludedKey(key)) continue;

    if (typeof value === "number" && Number.isFinite(value)) {
      addValue(index, value);
      continue;
    }

    if (typeof value === "string") {
      const parsed = parseNumericString(value);
      if (parsed !== null) addValue(index, parsed);
    }
  }

  return index;
}

export function numericEvidenceMatches(
  index: NumericEvidenceIndex,
  claim: number,
  kind: ClaimKind,
): boolean {
  for (const evidence of index.values) {
    if (kind === "percent") {
      const tolerance = Math.max(Math.abs(evidence) * 0.005, 0.01);
      if (Math.abs(evidence - claim) <= tolerance) return true;
      continue;
    }

    const tolerance = Number.isInteger(evidence) ? 1 : Math.max(Math.abs(evidence) * 0.005, 0.01);
    if (Math.abs(evidence - claim) <= tolerance) return true;
  }

  return false;
}
