import { findExactListOption } from "@/lib/ui/list-select-utils";
import { normalizeEntityString, scoreEntityMatch } from "@/lib/validation/global-entity-validation";

export type MagazzinoCategoriaInferResult = {
  categoria: string;
  confidence: number;
  source: "heuristic" | "fallback";
};

const MIN_SCORE = 25;
const MIN_SCORE_GAP = 8;

/** ponytail: keyword map statica IT — copre casi tipici officina; upgrade = AI batch su low-confidence. */
const AUTOMOTIVE_HINTS: ReadonlyArray<{ keywords: RegExp[]; categoryPatterns: RegExp[] }> = [
  {
    keywords: [/\bfren/i, /pastigl/i, /\bdisco\b/i, /pinza/i, /tambur/i, /guarnizion/i],
    categoryPatterns: [/fren/i],
  },
  {
    keywords: [/\bfiltr/i],
    categoryPatterns: [/filtr/i],
  },
  {
    keywords: [/\bolio\b/i, /lubrif/i, /antigelo/i, /refrigerant/i],
    categoryPatterns: [/olio/i, /lubrif/i, /fluid/i],
  },
  {
    keywords: [/ammortizz/i, /molla/i, /sospens/i, /braccio/i, /biellett/i],
    categoryPatterns: [/sospens/i, /ammortizz/i],
  },
  {
    keywords: [/candela/i, /bobina/i, /alternator/i, /motorino/i, /batteria/i, /elettr/i],
    categoryPatterns: [/elettr/i, /accensione/i],
  },
  {
    keywords: [/cinghi/i, /distribuz/i, /pompa/i, /iniettor/i, /carbur/i],
    categoryPatterns: [/motore/i, /alimentaz/i, /distribuz/i],
  },
  {
    keywords: [/pneumatic/i, /\bgomm/i, /cerch/i],
    categoryPatterns: [/pneumatic/i, /gomm/i, /ruot/i],
  },
  {
    keywords: [/lampad/i, /faro\b/i, /proiettor/i, /luce/i],
    categoryPatterns: [/illumin/i, /lamp/i, /faro/i],
  },
  {
    keywords: [/parabrezz/i, /vetro/i, /tergicristall/i],
    categoryPatterns: [/carrozz/i, /vetr/i],
  },
  {
    keywords: [/guarnizion/i, /kit\b/i, /set\b/i],
    categoryPatterns: [/guarniz/i, /kit/i],
  },
];

export function resolveMagazzinoCategoriaFallback(availableCategories: readonly string[]): string {
  return findExactListOption("Generale", availableCategories) ?? availableCategories[0]?.trim() ?? "Generale";
}

function keywordBonus(descrizione: string, categoria: string): number {
  let bonus = 0;
  for (const hint of AUTOMOTIVE_HINTS) {
    const categoryMatch = hint.categoryPatterns.some((re) => re.test(categoria));
    if (!categoryMatch) continue;
    if (hint.keywords.some((re) => re.test(descrizione))) {
      bonus += 28;
    }
  }
  return bonus;
}

function tokenOverlapBonus(descrizione: string, categoria: string): number {
  const hay = normalizeEntityString(descrizione);
  const tokens = normalizeEntityString(categoria)
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  let bonus = 0;
  for (const token of tokens) {
    if (hay.includes(token)) bonus += 18;
  }
  return bonus;
}

function scoreCategoryForDescrizione(descrizione: string, categoria: string): number {
  const entityScore = Math.max(
    scoreEntityMatch(categoria, descrizione),
    scoreEntityMatch(descrizione, categoria),
  );
  return entityScore + tokenOverlapBonus(descrizione, categoria) + keywordBonus(descrizione, categoria);
}

function toConfidence(bestScore: number, secondBestScore: number): number {
  if (bestScore < MIN_SCORE) return 0;
  if (bestScore - secondBestScore < MIN_SCORE_GAP) return 0;
  return Math.min(1, bestScore / 100);
}

export function inferMagazzinoCategoriaHeuristic(
  descrizione: string,
  availableCategories: readonly string[],
): MagazzinoCategoriaInferResult {
  const fallback = resolveMagazzinoCategoriaFallback(availableCategories);
  const trimmed = descrizione.trim();
  const unique = [...new Set(availableCategories.map((c) => c.trim()).filter(Boolean))];
  if (!trimmed || unique.length === 0) {
    return { categoria: fallback, confidence: 0, source: "fallback" };
  }

  const ranked = unique
    .map((categoria) => ({ categoria, score: scoreCategoryForDescrizione(trimmed, categoria) }))
    .sort((a, b) => b.score - a.score || a.categoria.localeCompare(b.categoria, "it"));

  const best = ranked[0];
  const second = ranked[1]?.score ?? 0;
  if (!best || best.score < MIN_SCORE) {
    return { categoria: fallback, confidence: 0, source: "fallback" };
  }

  const confidence = toConfidence(best.score, second);
  if (confidence <= 0) {
    return { categoria: fallback, confidence: 0, source: "fallback" };
  }

  return { categoria: best.categoria, confidence, source: "heuristic" };
}

export function resolveMagazzinoCategoriaFromMaster(
  value: string | undefined,
  availableCategories: readonly string[],
): string {
  const trimmed = value?.trim();
  if (!trimmed) return resolveMagazzinoCategoriaFallback(availableCategories);
  return findExactListOption(trimmed, availableCategories) ?? resolveMagazzinoCategoriaFallback(availableCategories);
}
