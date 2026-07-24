export type PolishGuardContext = {
  lineCount: number;
  ricambiCodes: string[];
  ricambiQuantities: number[];
  sourceText: string;
};

export type PolishGuardRejectReason =
  | "line_count_changed"
  | "forbidden_new_activity"
  | "commercial_tone_detected"
  | "max_chars_exceeded"
  | "verb_mutation";

const COMMERCIAL_RE =
  /\b(offerta|promozion|convenien|miglior prezz|garanzia estesa|approfitta|sconto speciale)\b/i;

const FORBIDDEN_ACTIVITY_TERMS = [
  "collaudo",
  "lubrificazione",
  "controlli finali",
  "pulizia circuito",
] as const;

const VERB_MUTATION_PAIRS: ReadonlyArray<readonly [RegExp, RegExp]> = [
  [/sostitu/i, /revision/i],
  [/smont/i, /montagg/i],
];

function splitDescriptionLines(description: string): string[] {
  return description
    .split(/\r?\n/)
    .map((l) => l.replace(/^-\s*/, "").trim())
    .filter(Boolean);
}

function normToken(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function containsTerm(text: string, term: string): boolean {
  return normToken(text).includes(normToken(term));
}

export function updateGuardContextLineCount(
  guardContext: PolishGuardContext,
  description: string,
): PolishGuardContext {
  return {
    ...guardContext,
    lineCount: splitDescriptionLines(description).length,
  };
}

export function validatePolishOutput(
  originalDescription: string,
  polishedDescription: string,
  guardContext: PolishGuardContext,
  opts?: { maxCharsPerLine?: number },
): { ok: true } | { ok: false; reason: PolishGuardRejectReason } {
  const maxChars = opts?.maxCharsPerLine ?? 200;
  const preLines = splitDescriptionLines(originalDescription);
  const postLines = splitDescriptionLines(polishedDescription);

  const expectedCount = guardContext.lineCount > 0 ? guardContext.lineCount : preLines.length;
  if (postLines.length !== expectedCount) {
    return { ok: false, reason: "line_count_changed" };
  }

  for (const line of postLines) {
    if (line.length > maxChars) {
      return { ok: false, reason: "max_chars_exceeded" };
    }
    if (COMMERCIAL_RE.test(line)) {
      return { ok: false, reason: "commercial_tone_detected" };
    }
  }

  const preJoined = preLines.join("\n");
  for (const term of FORBIDDEN_ACTIVITY_TERMS) {
    const inPost = postLines.some((l) => containsTerm(l, term));
    const inPre = containsTerm(preJoined, term) || containsTerm(guardContext.sourceText, term);
    if (inPost && !inPre) {
      return { ok: false, reason: "forbidden_new_activity" };
    }
  }

  for (let i = 0; i < preLines.length; i++) {
    const pre = preLines[i]!;
    const post = postLines[i]!;
    for (const [preVerb, postVerb] of VERB_MUTATION_PAIRS) {
      if (preVerb.test(pre) && postVerb.test(post) && !preVerb.test(post)) {
        return { ok: false, reason: "verb_mutation" };
      }
    }
  }

  return { ok: true };
}
