import type { InsightCandidate, ScoredInsightCandidate } from "@/lib/report/insights/types";

const SEVERITY_SCORE = { critical: 300, warning: 200, info: 100 } as const;

export function calculateInsightScore(candidate: InsightCandidate): number {
  return SEVERITY_SCORE[candidate.severity] + candidate.priority;
}

export function scoreInsightCandidates(candidates: InsightCandidate[]): ScoredInsightCandidate[] {
  return candidates.map((candidate) => ({
    ...candidate,
    score: calculateInsightScore(candidate),
  }));
}

export { SEVERITY_SCORE };
