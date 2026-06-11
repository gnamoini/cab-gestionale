/**
 * @advisory v4 — offline adaptive analyzer. Not used by runtime decision engine.
 */
import { applyAdaptiveRules } from "@/lib/selector-core/selector-adaptive-rules";
import {
  aggregateSelectorTelemetry,
  toDomainUsageStats,
} from "@/lib/selector-core/selector-telemetry-aggregator";
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";
import type { SelectorAdaptiveInsight, SelectorAdaptiveReport } from "@/lib/selector-core/types";

export function analyzeSelectorTelemetryByDomain(
  events: readonly SelectorOpenEvent[],
  domain: string,
): SelectorAdaptiveInsight | null {
  const aggregated = aggregateSelectorTelemetry(events);
  const stats = aggregated.get(domain);
  if (!stats) return null;

  const recommendation = applyAdaptiveRules(stats);

  return {
    domain,
    currentBehavior: {
      preferredSurface: stats.preferredSurface,
      usageStats: toDomainUsageStats(stats),
    },
    recommendation: {
      suggestedSurface: recommendation.suggestedSurface,
      confidence: recommendation.confidence,
      reason: recommendation.reason,
    },
  };
}

export function analyzeSelectorTelemetry(
  events: readonly SelectorOpenEvent[],
): SelectorAdaptiveReport {
  const aggregated = aggregateSelectorTelemetry(events);
  const insights: SelectorAdaptiveInsight[] = [];

  for (const [domain, stats] of aggregated) {
    const recommendation = applyAdaptiveRules(stats);
    insights.push({
      domain,
      currentBehavior: {
        preferredSurface: stats.preferredSurface,
        usageStats: toDomainUsageStats(stats),
      },
      recommendation: {
        suggestedSurface: recommendation.suggestedSurface,
        confidence: recommendation.confidence,
        reason: recommendation.reason,
      },
    });
  }

  insights.sort((a, b) => a.domain.localeCompare(b.domain));

  return {
    generatedAt: new Date().toISOString(),
    eventCount: events.length,
    insights,
  };
}
