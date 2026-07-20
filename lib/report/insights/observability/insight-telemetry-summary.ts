import type { TrustStatus } from "@/lib/report/contracts/metadata-envelope";
import {
  INSIGHT_SKIP_REASONS,
  type InsightDto,
  type InsightEvaluationResult,
  type InsightSkipReason,
} from "@/lib/report/insights/types";

export type InsightTelemetrySummary = {
  totalRules: number;
  evaluatedRules: number;
  firedRules: number;
  skippedRules: number;
  insightFireRate: number;
  insightSkipRate: number;
  skipByReason: Record<InsightSkipReason, number>;
  trustDistribution: Record<TrustStatus, number>;
  topInsightRules: {
    ruleKey: string;
    ruleVersion: number;
    count: number;
  }[];
};

function emptySkipByReason(): Record<InsightSkipReason, number> {
  return {
    deferred: 0,
    missing_data: 0,
    trust_blocked: 0,
    condition_false: 0,
  };
}

function emptyTrustDistribution(): Record<TrustStatus, number> {
  return { GREEN: 0, AMBER: 0, RED: 0 };
}

export function buildInsightTelemetrySummary(input: {
  evaluationResults: InsightEvaluationResult[];
  insights: InsightDto[];
  totalRules: number;
}): InsightTelemetrySummary {
  const evaluatedRules = input.evaluationResults.length;
  let firedRules = 0;
  let skippedRules = 0;
  const skipByReason = emptySkipByReason();
  const trustDistribution = emptyTrustDistribution();

  for (const result of input.evaluationResults) {
    if (result.status === "fired") {
      firedRules += 1;
      const trust = result.candidate.trust;
      trustDistribution[trust] = (trustDistribution[trust] ?? 0) + 1;
    } else {
      skippedRules += 1;
      if (INSIGHT_SKIP_REASONS.includes(result.reason)) {
        skipByReason[result.reason] += 1;
      }
    }
  }

  const firedByRule = new Map<string, { ruleKey: string; ruleVersion: number; count: number }>();
  for (const insight of input.insights) {
    const key = `${insight.ruleKey}:${insight.ruleVersion}`;
    const existing = firedByRule.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      firedByRule.set(key, {
        ruleKey: insight.ruleKey,
        ruleVersion: insight.ruleVersion,
        count: 1,
      });
    }
  }

  const topInsightRules = [...firedByRule.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.ruleKey.localeCompare(b.ruleKey);
  });

  const denominator = evaluatedRules > 0 ? evaluatedRules : 1;

  return {
    totalRules: input.totalRules,
    evaluatedRules,
    firedRules,
    skippedRules,
    insightFireRate: firedRules / denominator,
    insightSkipRate: skippedRules / denominator,
    skipByReason,
    trustDistribution,
    topInsightRules,
  };
}
