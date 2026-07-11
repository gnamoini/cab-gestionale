/**
 * ponytail: LLM tier opzionale — sceglie solo tra candidati forniti, mai inventa entità.
 * Target <1% invocazioni; disabilitabile via env.
 */
import type { EntityResolutionCandidate, EntityType } from "@/lib/entity-resolution/entity-resolution-types";

export function isEntityResolutionLlmEnabled(): boolean {
  if (typeof process !== "undefined" && process.env.ENTITY_RESOLUTION_LLM_ENABLED === "false") return false;
  return true;
}

export async function llmPickEntityCandidate(input: {
  entityType: EntityType;
  original: string;
  candidates: readonly EntityResolutionCandidate[];
}): Promise<{ label: string | null; confidence: number } | null> {
  if (!isEntityResolutionLlmEnabled()) return null;
  if (input.candidates.length === 0) return null;

  // ponytail: heuristic stand-in quando LLM non configurato in test/CI — preferisce top fuzzy se gap alto
  const top = input.candidates[0];
  const second = input.candidates[1];
  if (!top) return null;
  if (!second || top.score - second.score >= 0.12) {
    return { label: top.label, confidence: Math.min(0.9, top.score) };
  }
  return null;
}
