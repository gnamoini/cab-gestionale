import { normPhrase } from "@/lib/preventivi/preventivi-learning-storage";
import type { TkbIntervento, TkbMatchInput, TkbMatchResult, TkbPublishedSnapshot } from "./types";

function tokenSet(s: string): Set<string> {
  return new Set(
    normPhrase(s)
      .split(/[^a-z0-9àèéìòù]+/i)
      .filter((t) => t.length >= 3),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union > 0 ? inter / union : 0;
}

function compatibilityPass(intervento: TkbIntervento, input: TkbMatchInput): number {
  const c = intervento.compatibilita;
  if (!c) return 1;
  if (c.targetTypes?.length && input.targetType && !c.targetTypes.includes(input.targetType)) return 0;
  if (c.tipiAttrezzatura?.length && input.tipoAttrezzatura) {
    const t = input.tipoAttrezzatura.toLowerCase();
    if (!c.tipiAttrezzatura.some((x) => t.includes(x.toLowerCase()))) return 0;
  }
  return 1;
}

function keywordScore(intervento: TkbIntervento, text: string): number {
  const tokens = tokenSet(text);
  let best = 0;
  for (const kw of intervento.keywords) {
    const score = jaccard(tokens, tokenSet(kw));
    if (score > best) best = score;
  }
  const labelScore = jaccard(tokens, tokenSet(intervento.label));
  return Math.max(best, labelScore);
}

function componentScore(intervento: TkbIntervento, snapshot: TkbPublishedSnapshot, text: string): number {
  const slugs = intervento.componentiSlugs ?? [];
  if (slugs.length === 0) return 0;
  const low = text.toLowerCase();
  let hits = 0;
  for (const slug of slugs) {
    const comp = snapshot.componenti.find((c) => c.slug === slug);
    const terms = [slug.replace(/_/g, " "), comp?.label ?? "", ...(comp?.synonyms ?? [])];
    if (terms.some((t) => t && low.includes(t.toLowerCase().slice(0, 12)))) hits++;
  }
  return hits / slugs.length;
}

function symptomScore(intervento: TkbIntervento, snapshot: TkbPublishedSnapshot, anomalia?: string): number {
  if (!anomalia?.trim()) return 0;
  const slugs = intervento.sintomiSlugs ?? [];
  if (slugs.length === 0) return 0;
  const tokens = tokenSet(anomalia);
  let best = 0;
  for (const slug of slugs) {
    const s = snapshot.sintomi.find((x) => x.slug === slug);
    if (!s) continue;
    for (const kw of s.keywords) {
      best = Math.max(best, jaccard(tokens, tokenSet(kw)));
    }
  }
  return best;
}

export function matchInterventi(
  snapshot: TkbPublishedSnapshot,
  input: TkbMatchInput,
): TkbMatchResult[] {
  const combined = [input.lavorazioniText, input.anomaliaText].filter(Boolean).join("\n");
  const results: TkbMatchResult[] = [];

  for (const intervento of snapshot.interventi) {
    const compat = compatibilityPass(intervento, input);
    if (compat === 0) continue;

    const keywordMatch = keywordScore(intervento, combined);
    const componentMatch = componentScore(intervento, snapshot, combined);
    const symptomMatch = symptomScore(intervento, snapshot, input.anomaliaText);

    const score = Math.min(
      1,
      keywordMatch * 0.45 + componentMatch * 0.35 + symptomMatch * 0.15 + compat * 0.05,
    );

    if (score < 0.2) continue;

    const matchedBy: TkbMatchResult["matchedBy"] = [];
    if (keywordMatch >= 0.35) matchedBy.push("keyword");
    if (componentMatch >= 0.25) matchedBy.push("componente");
    if (symptomMatch >= 0.2) matchedBy.push("sintomo");
    if (compat >= 1) matchedBy.push("compatibilità");

    results.push({
      interventoSlug: intervento.slug,
      score,
      matchedBy,
      keywordMatch,
      componentMatch,
      symptomMatch,
      compatibility: compat,
    });
  }

  return results.sort((a, b) => b.score - a.score);
}

export function pickPrimaryMatch(matches: TkbMatchResult[]): TkbMatchResult | null {
  return matches[0] ?? null;
}
