import { scoreEntityMatch } from "@/lib/validation/global-entity-validation";
import type { RenamePlan, SemanticCollisionReport } from "@/lib/settings/rename-engine/types";

const SEMANTIC_SCORE_MIN = 85;

export function detectSemanticCollision(
  plan: RenamePlan,
  existingLabels: readonly string[],
): SemanticCollisionReport {
  const items: SemanticCollisionReport["items"] = [];
  const newLabel = plan.newLabel.trim();
  if (!newLabel) return { hasCollision: false, items };

  for (const existing of existingLabels) {
    const trimmed = existing.trim();
    if (!trimmed || trimmed === plan.oldLabel) continue;
    const score = scoreEntityMatch(newLabel, trimmed, { standardizeLegalSuffix: true });
    if (score < SEMANTIC_SCORE_MIN) continue;
    items.push({ existingLabel: trimmed, newLabel, similarity: score });
  }

  return { hasCollision: items.length > 0, items };
}
