/** ponytail: score weights tunable via reasons audit; threshold 60 from real magazzino samples post-release. */

export const RICAMBIO_CODE_INTENT_SEED_THRESHOLD = 60;

const RICAMBIO_CODE_INTENT_DESC_BLACKLIST = [
  "FILTRO",
  "OLIO",
  "ACQUA",
  "POMPA",
  "KIT",
  "GUARNIZIONE",
  "CUSCINETTO",
  "BATTERIA",
  "MOTORE",
] as const;

export type RicambioCodeIntentResult = {
  score: number;
  reasons: string[];
};

function clampScore(raw: number): number {
  return Math.max(0, Math.min(100, raw));
}

/** Seeds only code-like zero-result searches; descriptive queries intentionally yield no seed. */
export function evaluateRicambioCodeIntent(value: string): RicambioCodeIntentResult {
  const q = value.trim();
  if (!q) {
    return { score: 0, reasons: ["empty"] };
  }

  const compact = q.replace(/\s+/g, "");
  if (compact.length < 3) {
    return { score: 0, reasons: ["too_short"] };
  }

  // ponytail: spaces around -/./_ copied from supplier sheets should not read as description.
  const qNormalized = q.replace(/\s+([-._/])\s+/g, "$1");

  let score = 0;
  const reasons: string[] = [];

  if (compact.length >= 6 && compact.length <= 8) {
    score += 15;
    reasons.push("length_6_8");
  } else if (compact.length >= 9 && compact.length <= 20) {
    score += 25;
    reasons.push("length_9_20");
  }

  const hasDigit = /\d/.test(compact);
  const hasLetter = /[A-Za-z]/.test(compact);

  if (hasDigit) {
    score += 30;
    reasons.push("contains_digits");
  }

  if (/^\d{9,20}$/.test(compact)) {
    score += 10;
    reasons.push("numeric_code");
  }

  if (hasLetter && hasDigit) {
    score += 20;
    reasons.push("mixed_alpha_numeric");
  }

  if (/[A-Z]+\d+|\d+[A-Z]+/i.test(compact)) {
    score += 10;
    reasons.push("technical_mixed_pattern");
  }

  if (/[-._/]/.test(qNormalized)) {
    score += 10;
    reasons.push("technical_separator");
  }

  const lettersOnly = /^[A-Z]+$/i.test(compact);
  if (lettersOnly && compact.length >= 8 && compact.length <= 20) {
    score += 35;
    reasons.push("letters_only_code");
    if (compact === compact.toUpperCase()) {
      score += 5;
      reasons.push("all_uppercase");
    }
  }

  const spaceCount = (qNormalized.match(/\s/g) ?? []).length;
  const tokens = qNormalized.split(/\s+/).filter(Boolean);
  const hasTechSep = /[-._/]/.test(qNormalized);

  if (spaceCount >= 2) {
    score -= 30;
    reasons.push("multiple_internal_spaces");
  } else if (spaceCount === 1) {
    // ponytail: skip mild space penalty when compact still looks like a technical key (digit + separator).
    const codeLikeSpaced = hasDigit && hasTechSep;
    if (!codeLikeSpaced) {
      score -= 10;
      reasons.push("single_internal_space");
    }
  }

  if (tokens.length >= 2 && spaceCount >= 2) {
    score -= 25;
    reasons.push("multiple_tokens");
  }

  for (const token of tokens) {
    const upper = token.toUpperCase();
    if (RICAMBIO_CODE_INTENT_DESC_BLACKLIST.some((word) => upper === word)) {
      score -= 40;
      reasons.push(`desc_blacklist:${upper}`);
    }
  }

  if (/^0+$/.test(compact)) {
    score -= 50;
    reasons.push("all_zeros");
  }

  if (/^(.)\1{6,}$/.test(compact)) {
    score -= 40;
    reasons.push("repeated_character");
  }

  return { score: clampScore(score), reasons };
}

export function getRicambioCodeIntentScore(value: string): number {
  return evaluateRicambioCodeIntent(value).score;
}

export function isLikelyRicambioCodice(value: string): boolean {
  return getRicambioCodeIntentScore(value) >= RICAMBIO_CODE_INTENT_SEED_THRESHOLD;
}
