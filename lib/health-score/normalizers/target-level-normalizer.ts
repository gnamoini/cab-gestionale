import type { FormulaTraceStep, KpiRawValue } from "@/lib/health-score/types";
import type { KpiContext } from "@/lib/health-score/types";

/** Punteggio KPI quando l'obiettivo è raggiunto (senza bonus oltre target). */
export const HEALTH_SCORE_TARGET_ACHIEVED = 90;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Target = obiettivo officina, non baseline neutra a 50.
 * Raggiunto → 90; mancato → proporzionale alla distanza; superato (solo "min") → resta 90.
 */
export function targetLevelNormalizer(
  raw: KpiRawValue,
  target: number,
  _ctx: KpiContext,
  invert: boolean,
): { score: number; trace: FormulaTraceStep[] } {
  const current = raw.current;
  const minScore = 5;
  let score: number;

  if (invert) {
    if (target <= 0) {
      score = current <= 0 ? HEALTH_SCORE_TARGET_ACHIEVED : clamp(
        HEALTH_SCORE_TARGET_ACHIEVED - 18 * Math.min(current, 10),
        minScore,
        HEALTH_SCORE_TARGET_ACHIEVED,
      );
    } else if (current <= target) {
      score = HEALTH_SCORE_TARGET_ACHIEVED;
    } else {
      score = clamp(HEALTH_SCORE_TARGET_ACHIEVED * (target / current), minScore, HEALTH_SCORE_TARGET_ACHIEVED);
    }
  } else if (target <= 0) {
    score = current > 0 ? HEALTH_SCORE_TARGET_ACHIEVED : minScore;
  } else if (current >= target) {
    score = HEALTH_SCORE_TARGET_ACHIEVED;
  } else {
    score = clamp(HEALTH_SCORE_TARGET_ACHIEVED * (current / target), minScore, HEALTH_SCORE_TARGET_ACHIEVED);
  }

  return {
    score,
    trace: [
      {
        step: "target_level_normalizer",
        formula: invert
          ? "90 se entro target; altrimenti 90×target/valore (max 90, no bonus)"
          : "90 se al target; altrimenti 90×valore/target (max 90, no bonus)",
        input: { value: current, target, invert },
        output: score,
      },
    ],
  };
}
