import type { ScoredInsightCandidate } from "@/lib/report/insights/types";
import { INSIGHT_STRIP_MAX } from "@/lib/report/insights/types";

/** Tie-breaker: score DESC → priority DESC → ruleKey ASC (stable, documented). */
export function rankInsights(candidates: ScoredInsightCandidate[]): ScoredInsightCandidate[] {
  return [...candidates]
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.ruleKey.localeCompare(b.ruleKey);
    })
    .slice(0, INSIGHT_STRIP_MAX);
}
