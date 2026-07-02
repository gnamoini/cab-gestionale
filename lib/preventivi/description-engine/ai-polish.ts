import { aggregateLinesFingerprint } from "./semantic-fingerprint";
import { DEFAULT_STYLE_PROFILE } from "./style-profile";
import type {
  AiPolishConstraints,
  AiPolishResult,
  AiRejectReason,
  GeneratedDescriptionLine,
} from "./types";

const COMMERCIAL_RE =
  /\b(offerta|promozion|convenien|miglior prezz|garanzia estesa|approfitta|sconto speciale)\b/i;

export const DEFAULT_AI_POLISH_CONSTRAINTS: AiPolishConstraints = {
  forbidNewActivities: true,
  maxLineDelta: 0,
  maxCharsPerLine: 120,
  preserveTechnicalTerms: [],
  linguisticBlacklist: DEFAULT_STYLE_PROFILE.blacklistPatterns.map((p) => new RegExp(p, "i")),
  forbidCommercialTone: true,
  requireKbMatch: true,
  allowedOperations: ["rephrase", "dedupe", "uniform_style"],
};

/** ponytail: stub senza LLM — validazione-only; integrazione AI esterna in fase 5 opzionale. */
export function polishDescriptionWithAi(
  lines: GeneratedDescriptionLine[],
  constraints: AiPolishConstraints = DEFAULT_AI_POLISH_CONSTRAINTS,
  polishFn?: (texts: string[]) => string[],
): AiPolishResult {
  const linesPre = lines.map((l) => l.text);

  if (!polishFn) {
    return { applied: false, linesPre };
  }

  const preFp = aggregateLinesFingerprint(
    lines.map((l) => ({ text: l.text, activityType: undefined, componenteSlugs: undefined })),
  );

  const polished = polishFn(linesPre);
  if (polished.length !== linesPre.length) {
    return { applied: false, rejectReason: "line_count_changed", linesPre };
  }

  for (let i = 0; i < polished.length; i++) {
    const text = polished[i]!;
    if (text.length > constraints.maxCharsPerLine) {
      return { applied: false, rejectReason: "max_chars_exceeded", linesPre };
    }
    for (const re of constraints.linguisticBlacklist) {
      if (re.test(text)) {
        return { applied: false, rejectReason: "blacklist_match", linesPre };
      }
    }
    if (constraints.forbidCommercialTone && COMMERCIAL_RE.test(text)) {
      return { applied: false, rejectReason: "commercial_tone_detected", linesPre };
    }
    for (const term of constraints.preserveTechnicalTerms) {
      if (linesPre[i]!.includes(term) && !text.includes(term)) {
        return { applied: false, rejectReason: "technical_term_removed", linesPre };
      }
    }
  }

  const postFp = aggregateLinesFingerprint(polished.map((text) => ({ text })));
  if (preFp !== postFp) {
    return { applied: false, rejectReason: "fingerprint_changed", linesPre };
  }

  return { applied: true, linesPre, linesPost: polished };
}

export function applyAiPolishToLines(
  lines: GeneratedDescriptionLine[],
  polishResult: AiPolishResult,
): GeneratedDescriptionLine[] {
  if (!polishResult.applied || !polishResult.linesPost) return lines;
  return lines.map((l, i) => ({ ...l, text: polishResult.linesPost![i] ?? l.text }));
}

export type { AiRejectReason };
