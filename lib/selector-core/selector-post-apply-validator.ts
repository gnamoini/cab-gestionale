/**
 * @advisory v5.1 — post-apply validation loop. Compares AB predictions vs real telemetry.
 */
import { computeUsageRatios, groupByDomain } from "@/lib/selector-core/selector-telemetry-aggregator";
import type { SelectorOpenEvent } from "@/lib/selector-core/selector-telemetry";
import type {
  SelectorAbSimulationOutcome,
  SelectorConfigProposal,
  SelectorValidationResult,
} from "@/lib/selector-core/types";

const MIN_VALIDATION_SAMPLE = 5;

function actualMetricsFromEvents(events: readonly SelectorOpenEvent[]): {
  searchEfficiency: number;
  fallbackRate: number;
  sampleSize: number;
} {
  const ratios = computeUsageRatios(events);
  return {
    searchEfficiency: ratios.searchUsageRate,
    fallbackRate: ratios.fallbackRate,
    sampleSize: events.length,
  };
}

function normalizedMae(predicted: number, actual: number): number {
  const delta = Math.abs(predicted - actual);
  return Math.min(1, delta);
}

function buildDeviationFlags(
  outcome: SelectorAbSimulationOutcome,
  actual: { searchEfficiency: number; fallbackRate: number; sampleSize: number },
): string[] {
  const flags: string[] = [];

  if (actual.sampleSize < MIN_VALIDATION_SAMPLE) {
    flags.push("sample_too_small");
  }

  const fallbackDrift = Math.abs(outcome.proposed.fallbackRate - actual.fallbackRate);
  if (fallbackDrift > 0.15) {
    flags.push("fallback_rate_drift");
  }

  const searchDrift = Math.abs(outcome.proposed.searchEfficiency - actual.searchEfficiency);
  if (searchDrift > 0.2) {
    flags.push("search_efficiency_drift");
  }

  if (
    outcome.recommendation === "favor_proposed" &&
    actual.fallbackRate >= outcome.current.fallbackRate
  ) {
    flags.push("simulation_overconfident");
  }

  if (outcome.varianceVsReal && outcome.varianceVsReal.bucketDrift > 0.25) {
    flags.push("bucket_distribution_drift");
  }

  return flags;
}

export function validatePostApplyOutcome(
  proposal: SelectorConfigProposal,
  simulation: SelectorAbSimulationOutcome,
  postRolloutEvents: readonly SelectorOpenEvent[],
): SelectorValidationResult {
  const domainEvents = postRolloutEvents.filter((e) => e.domain === proposal.targetDomain);
  const actual = actualMetricsFromEvents(domainEvents);

  const searchMae = normalizedMae(simulation.proposed.searchEfficiency, actual.searchEfficiency);
  const fallbackMae = normalizedMae(simulation.proposed.fallbackRate, actual.fallbackRate);
  const accuracyScore = Math.max(0, 1 - (searchMae + fallbackMae) / 2);

  return {
    proposalId: proposal.id,
    predictedOutcome: {
      searchEfficiency: simulation.proposed.searchEfficiency,
      fallbackRate: simulation.proposed.fallbackRate,
      recommendation: simulation.recommendation,
    },
    actualOutcome: actual,
    delta: {
      accuracyScore,
      deviationFlags: buildDeviationFlags(simulation, actual),
    },
  };
}

export function validatePostApplyOutcomes(
  proposals: readonly SelectorConfigProposal[],
  simulations: readonly SelectorAbSimulationOutcome[],
  postRolloutEvents: readonly SelectorOpenEvent[],
): SelectorValidationResult[] {
  const approved = proposals.filter((p) => p.status === "approved");
  const simById = new Map(simulations.map((s) => [s.proposalId, s]));

  return approved.map((proposal) => {
    const simulation = simById.get(proposal.id);
    if (!simulation) {
      return {
        proposalId: proposal.id,
        predictedOutcome: null,
        actualOutcome: actualMetricsFromEvents(
          postRolloutEvents.filter((e) => e.domain === proposal.targetDomain),
        ),
        delta: {
          accuracyScore: 0,
          deviationFlags: ["missing_simulation"],
        },
      };
    }
    return validatePostApplyOutcome(proposal, simulation, postRolloutEvents);
  });
}

export function summarizeValidationResults(
  results: readonly SelectorValidationResult[],
): {
  averageAccuracy: number;
  flaggedCount: number;
  total: number;
} {
  if (results.length === 0) {
    return { averageAccuracy: 0, flaggedCount: 0, total: 0 };
  }
  const averageAccuracy =
    results.reduce((sum, r) => sum + r.delta.accuracyScore, 0) / results.length;
  const flaggedCount = results.filter((r) => r.delta.deviationFlags.length > 0).length;
  return { averageAccuracy, flaggedCount, total: results.length };
}

/** Domain-level event counts for validation diagnostics. */
export function countEventsByDomain(
  events: readonly SelectorOpenEvent[],
): Map<string, number> {
  const grouped = groupByDomain(events);
  const counts = new Map<string, number>();
  for (const [domain, list] of grouped) {
    counts.set(domain, list.length);
  }
  return counts;
}
